import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
import { AcmeAuthStateTraits } from 'traits/shell/acme-auth-state-traits.js';
import { AcmeEndpointsTraits } from 'traits/db/db-endpoints-traits.js';
import { computeInvoiceStatusTotals } from 'utils/acme-invoice-utils.js';

// The toggle endpoint's URL, recognized on ERROR payloads — error payloads are
// built from real request metadata, so this is the one reliable way to map a
// failed request back to its intent. [action-reconciliation-identity]
const TOGGLE_URL_RE = /\/api\/invoices\/([^/]+)\/status/;

/**
 * The shape every payload carries, whether or not anything has loaded. A view
 * can destructure it without guarding, and `status.isLoaded` says whether the
 * values mean anything yet.
 */
const EMPTY_DATA = {
  cards: null,
  revenue: [],
  latestInvoices: [],
  invoices: [],
  totalPages: 0,
  customers: [],
  customerOptions: [],
};

/**
 * Logic for ChannelAcmeData — every read and write of business data.
 *
 * Views raise semantic UI events; this channel turns them into requests and
 * republishes the responses as the actions views subscribe to. No ViewStream
 * ever subscribes to a fetch channel, so URL shapes stay in one place.
 *
 * ── Data follows auth, never the reverse ────────────────────────────────────
 *
 * The dump is requested when ChannelAcmeAuth says the user is authenticated,
 * and dropped when it says they are not. This channel therefore knows about
 * auth; auth knows nothing about it. That direction is what lets sign-out,
 * session expiry and a 401 all be handled in one place without this channel
 * having a say.
 *
 * It also means there is exactly one trigger for loading — "the user is logged
 * in" — rather than something each page has to remember to do.
 *
 * ── One fetch channel, many endpoints ───────────────────────────────────────
 *
 * CHANNEL_FETCH_ACME_API serves every request, so a response cannot be
 * identified by where it came from. Each request carries its own conformer as
 * `mapFn` (see acme-endpoints-traits.js), which stamps a `dataKey` the
 * subscriber routes on.
 */
export class AcmeDataChannelTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'acmeData$';
    super(context, traitPrefix);
  }

  // ── Wiring ────────────────────────────────────────────────────────────────

  static acmeData$OnRegistered() {
    this.acmeData$ListenToFetchChannel();
    this.acmeData$ListenToAuth();
    this.acmeData$ListenToUiEvents();
  }

  static acmeData$ListenToFetchChannel() {
    this.getChannel('CHANNEL_FETCH_ACME_API').subscribe(
      this.acmeData$OnFetchReturned.bind(this),
    );
  }

  /**
   * Two filtered subscriptions rather than one unfiltered: the auth channel also
   * carries SESSION, LOGIN_SUCCESS and SIGNOUT_COMPLETED, none of which should
   * move data. INIT and CHANGED are the only two that mean "the answer to
   * are-they-logged-in is now this".
   */
  static acmeData$ListenToAuth() {
    ['CHANNEL_ACME_AUTH_INIT_EVENT', 'CHANNEL_ACME_AUTH_CHANGED_EVENT'].forEach(
      (action) => {
        const authFilter = new ChannelPayloadFilter({ action });

        this.getChannel('CHANNEL_ACME_AUTH', authFilter).subscribe(
          this.acmeData$OnAuthResolved.bind(this),
        );
      },
    );
  }

  /**
   * UI events arrive through CHANNEL_UI, fed by each ViewStream's
   * broadcastEvents — never by a manual addEventListener.
   *
   * The markup convention is a pair of data attributes:
   *
   *   data-event-type="acmeData"        routes the event here
   *   data-btn-type="delete-invoice"    keys into ACME_ENDPOINTS
   *
   * eventType is the catch-all this channel filters on; btnType selects the
   * endpoint inside the subscriber. The raising element's whole dataset arrives
   * on the payload — view-stream-broadcaster.js does
   * `data.payload = convertDomStringMapToObj(q.dataset)` — so data-id reaches
   * the request without anything having to thread it through.
   */
  static acmeData$ListenToUiEvents() {
    const acmeUiFilter = new ChannelPayloadFilter({ eventType: 'acmeData' });

    this.getChannel('CHANNEL_UI', acmeUiFilter).subscribe(
      this.acmeData$OnUiEvent.bind(this),
    );
  }

  // ── Auth -> data ──────────────────────────────────────────────────────────

  static acmeData$OnAuthResolved(e) {
    if (e?.payload?.isAuthenticated === true) {
      this.acmeData$FetchBootstrap();
      return;
    }

    this.acmeData$ClearData();
  }

  // ── Inbound: UI -> request ────────────────────────────────────────────────

  static acmeData$OnUiEvent(e) {
    const payload = e?.payload ?? {};

    // The one optimistic mutation. Everything else stays request -> refetch.
    if (payload.btnType === 'toggle-invoice-status') {
      this.acmeData$ToggleInvoiceStatus(payload);
      return;
    }

    this.acmeData$Request(payload.btnType, payload);
  }

  static acmeData$OnViewStreamInfo(e) {
    if (e?.action !== 'CHANNEL_ACME_DATA_INVOICE_SUBMIT_EVENT') return;
    const payload = e?.payload || {};
    this.acmeData$Request(payload.btnType, payload);
  }

  /**
   * The one way a request leaves this channel. ACME_ENDPOINTS turns the btnType
   * plus the UI payload into fetch props, including the mapFn that stamps the
   * response, so everything downstream is generic.
   */
  static acmeData$Request(btnType, payload = {}) {
    const fetchProps = AcmeEndpointsTraits.acmeEndpoints$Resolve(
      btnType,
      payload,
    );

    if (fetchProps === null) return;

    // Every endpoint except bootstrap is a mutation. The count is what lets a
    // landing bootstrap know it is stale — see acmeData$OnFetchReturned.
    if (btnType !== 'bootstrap') {
      this.props.acmePendingMutations += 1;
    }

    this.acmeData$SendToChannel('CHANNEL_FETCH_ACME_API', fetchProps);
  }

  // ── Optimistic status toggle ──────────────────────────────────────────────
  //
  // "Flip the pill now, tell the server after." The provisional state is
  // applied to the held dump and published as a normal full-state UPDATED, so
  // every surface — the row, the cards, a page composed from the replayed
  // payload mid-flight — reads the same truth by the same path it always does.
  // The round trip then reconciles: the mutation response re-requests the
  // authoritative dump (confirm), a failed request re-applies the recorded
  // inverse (rollback), and a failure with a NEWER toggle still in flight
  // leaves the state to that toggle's own outcome (supersede).
  // [record:optimistic-update-with-reconcile]

  /**
   * The click. The held invoice — not the element's dataset — decides the next
   * status: the channel is the source of truth, and under rapid clicks the DOM
   * could lag a click behind. The request carries the ABSOLUTE next status, so
   * reordered requests resolve to the last write rather than compounding flips.
   */
  static acmeData$ToggleInvoiceStatus(payload = {}) {
    const invoiceId = String(payload.invoiceId ?? '');
    const invoice = (this.acmeData$GetData().invoices || []).find(
      ({ id }) => String(id) === invoiceId,
    );

    if (invoice == null) return;

    const prevStatus = invoice.status;
    const nextStatus = prevStatus === 'paid' ? 'pending' : 'paid';

    // The inverse rides the intent — rollback needs no other lookup.
    // [provisional-state-with-inverse]
    this.props.acmeStatusIntents = [
      ...this.props.acmeStatusIntents,
      { invoiceId, prevStatus, nextStatus },
    ];

    this.acmeData$ApplyInvoiceStatus(invoiceId, nextStatus);
    this.acmeData$Publish('CHANNEL_ACME_DATA_UPDATED_EVENT');

    this.acmeData$Request('toggle-invoice-status', {
      invoiceId,
      status: nextStatus,
    });
  }

  /**
   * Writes one invoice's status into the held dump, immutably — payload data is
   * frozen, and the held arrays are references into published payloads, so the
   * patch builds new objects rather than mutating. [clone-frozen-payload]
   *
   * The derived slices move WITH the fact: the two card sums are recomputed
   * from the patched invoices (same arithmetic and formatting as the server),
   * so a page composing from the replayed payload before the authoritative
   * dump lands still shows internally consistent numbers.
   */
  static acmeData$ApplyInvoiceStatus(invoiceId, status) {
    const data = this.acmeData$GetData();

    const invoices = (data.invoices || []).map((invoice) =>
      String(invoice.id) === String(invoiceId)
        ? { ...invoice, status }
        : invoice,
    );

    const cards = {
      ...data.cards,
      ...computeInvoiceStatusTotals(invoices),
    };

    this.props.acmeData = { ...data, invoices, cards };
  }

  /**
   * A toggle request failed. FIFO-match the invoice's oldest intent (requests
   * to one origin resolve in order), then pick the typed outcome:
   *
   *   rollback   no newer toggle for this invoice is in flight and the held
   *              status is still this intent's provisional value — re-apply the
   *              recorded inverse.
   *   supersede  a newer toggle for this invoice is pending, or the held value
   *              has already moved on — this failure is not the latest word,
   *              so the state is left to the newer intent's own outcome.
   *
   * [typed-reconciliation-outcome]
   */
  static acmeData$RollbackStatusIntent(invoiceId) {
    const intents = this.props.acmeStatusIntents;
    const index = intents.findIndex(
      (intent) => intent.invoiceId === String(invoiceId),
    );

    if (index === -1) return;

    const intent = intents[index];
    this.props.acmeStatusIntents = intents.filter((_, i) => i !== index);

    const hasNewerIntent = this.props.acmeStatusIntents.some(
      (later) => later.invoiceId === intent.invoiceId,
    );
    const held = (this.acmeData$GetData().invoices || []).find(
      ({ id }) => String(id) === intent.invoiceId,
    );

    if (hasNewerIntent || held?.status !== intent.nextStatus) return;

    this.acmeData$ApplyInvoiceStatus(intent.invoiceId, intent.prevStatus);
  }

  /**
   * The only read in the app. Search and pagination filter the cached dump
   * rather than returning to the server, so no per-page read exists by design.
   */
  static acmeData$FetchBootstrap() {
    this.acmeData$Request('bootstrap');
  }

  static acmeData$SendToChannel(channelName, payload) {
    this.sendChannelPayload('CHANNEL_ACME_DATA_REQUEST_EVENT', {
      channelName,
      ...payload,
    });
  }

  // ── State ─────────────────────────────────────────────────────────────────
  //
  // The data lives on the channel. There is no SpyneAppProperties slot for it:
  // a second copy is a second thing that can be stale, and nothing needs to read
  // it synchronously before subscribing — a page mounting late receives the
  // replayed payload on subscribe.

  static acmeData$GetData() {
    return this.props.acmeData || { ...EMPTY_DATA };
  }

  static acmeData$SetData(data = {}) {
    const wasLoaded = this.props.acmeIsLoaded === true;

    this.props.acmeData = { ...EMPTY_DATA, ...data };
    this.props.acmeIsLoaded = true;

    return { wasLoaded };
  }

  /**
   * Signed out. The data was fetched for an identity that no longer holds it.
   *
   * Nothing is emitted: no view should ever render logged-out data, so there is
   * no consumer for that payload, and emitting would race the redirect that is
   * already under way.
   */
  static acmeData$ClearData() {
    this.props.acmeData = { ...EMPTY_DATA };
    this.props.acmeIsLoaded = false;
    this.props.acmePendingMutations = 0;
    this.props.acmeStatusIntents = [];
  }

  // ── Outbound: response -> semantic action ─────────────────────────────────

  /**
   * Every emission carries COMPLETE state — the whole data object plus a status
   * object — regardless of which action it is.
   *
   * This is what makes "the channel is the source of truth" true rather than
   * aspirational. A replay channel caches ONE payload, not one per action, so a
   * late subscriber receives whichever action was published last. If an error
   * payload carried only an error, a page mounting after a failed mutation would
   * have no data even though the channel has data. Carrying everything every
   * time means a replayed error still lets a page render its content AND surface
   * the failure, rather than choosing. [choose-replay-semantics]
   * [active-child-on-custom-channel]
   *
   * The corollary: no action may ever emit a partial payload. Adding one
   * silently stops this channel being a source of truth.
   *
   * `status.isLoaded` is what a consumer narrows on: it is false until the dump
   * has landed, so a listener admitting only loaded payloads never has to guard
   * against an empty one — and never sees CHANNEL_ACME_DATA_REQUEST_EVENT, which
   * carries fetch config and no status at all.
   */
  static acmeData$Publish(action, status = {}) {
    this.sendChannelPayload(action, {
      data: this.acmeData$GetData(),
      status: {
        isLoaded: this.props.acmeIsLoaded === true,
        error: null,
        message: null,
        ...status,
      },
      isAuthenticated: AcmeAuthStateTraits.acmeAuthState$IsAuthenticated(),
    });
  }

  /**
   * There is no `action` argument to route by — one fetch channel serves every
   * endpoint. The request's mapFn has already conformed the body to
   * `{ dataKey, data }`, and dataKey is what decides what this is.
   */
  static acmeData$OnFetchReturned(e) {
    const payload = e?.payload ?? {};

    if (payload.isChannelFetchError === true) {
      const failedUrl = String(payload.url || '');

      // A failed request was still an in-flight mutation; the counter must
      // come down or the bootstrap guard below would starve forever. Only
      // bootstrap is not a mutation, and it never errors silently into this
      // count because it never incremented it.
      if (failedUrl.includes('/bootstrap') === false) {
        this.props.acmePendingMutations = Math.max(
          0,
          this.props.acmePendingMutations - 1,
        );
      }

      // A failed toggle re-applies its recorded inverse (or defers to a newer
      // in-flight toggle), BEFORE publishing — so the error payload below
      // already carries the reverted dump and every surface repaints from it.
      const toggleMatch = failedUrl.match(TOGGLE_URL_RE);
      if (toggleMatch !== null) {
        this.acmeData$RollbackStatusIntent(toggleMatch[1]);
      }

      // A 401 is also seen by ChannelAcmeAuth, which subscribes to this same
      // fetch channel filtered on status and owns the auth-state change. It is
      // still reported here so a view can surface the failure; which of the two
      // subscribers runs first does not matter, because neither reads what the
      // other writes.
      // The error goes in `status`, never in place of the data. Whatever has
      // loaded is still carried, so a page replaying this payload renders its
      // content and shows the failure rather than choosing between them.
      this.acmeData$Publish('CHANNEL_ACME_DATA_ERROR_EVENT', {
        error: {
          message: payload.message || 'Something went wrong.',
          url: payload.url,
          status: payload.status,
          isUnauthenticated: payload.status === 401,
        },
      });
      return;
    }

    const { dataKey, data } = payload;

    if (dataKey === 'bootstrap') {
      // A bootstrap that lands while a mutation is still in flight is stale by
      // construction: that mutation's own response will request a fresh one.
      // Applying it would clobber newer provisional state with older server
      // state — the empirically-proven mergeMap failure. Discarding it is the
      // deliberate take-latest choice. [select-concurrency-operator]
      if (this.props.acmePendingMutations > 0) return;

      // The dump now IS the authority; any surviving toggle intents have been
      // confirmed or overtaken by it.
      this.props.acmeStatusIntents = [];

      // Stored BEFORE publishing, so the emission carries the new data rather
      // than the previous state.
      const { wasLoaded } = this.acmeData$SetData(data);

      this.acmeData$Publish(
        wasLoaded
          ? 'CHANNEL_ACME_DATA_UPDATED_EVENT'
          : 'CHANNEL_ACME_DATA_LOADED_EVENT',
      );
      return;
    }

    if (dataKey === 'mutation') {
      this.props.acmePendingMutations = Math.max(
        0,
        this.props.acmePendingMutations - 1,
      );
      // The write succeeded, so the held data is stale. Re-reading is what
      // produces DATA_UPDATED and re-renders whatever was showing the old
      // values — the server stays the authority, rather than the client patching
      // its own copy and hoping it matches.
      //
      // This payload still carries the pre-mutation data, which is correct: it
      // is what is on screen until the refreshed dump lands.
      this.acmeData$Publish('CHANNEL_ACME_DATA_MUTATION_EVENT', {
        message: data?.message ?? null,
      });
      this.acmeData$FetchBootstrap();
      return;
    }

    console.warn(
      'Spyne Warning: CHANNEL_FETCH_ACME_API returned an untagged payload. Its request was issued without a mapFn from ACME_ENDPOINTS.',
      payload,
    );
  }
}
