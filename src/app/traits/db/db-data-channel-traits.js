import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
// Raw RxJS for the tick clock only: an interval is timing the declared idioms
// cannot express, and the escape stays inside this channel trait.
// [escape-to-raw-rxjs] [record:live-polling-updates]
import { interval } from 'rxjs';
import { AcmeAuthStateTraits } from 'traits/shell/acme-auth-state-traits.js';
import { AcmeEndpointsTraits } from 'traits/db/db-endpoints-traits.js';
import {
  computeInvoiceStatusTotals,
  applyLiveInvoiceEvents,
  buildLiveFeedEvents,
} from 'utils/acme-invoice-utils.js';

// The toggle endpoint's URL, recognized on ERROR payloads — error payloads are
// built from real request metadata, so this is the one reliable way to map a
// failed request back to its intent. [action-reconciliation-identity]
const TOGGLE_URL_RE = /\/api\/invoices\/([^/]+)\/status/;

// The live-tick endpoint, recognized the same way on ERROR payloads.
const LIVE_TICK_URL = '/events/tick';

// The batch-save endpoint, recognized the same way on ERROR payloads so a
// failed Save All can release the saving latch without touching the drafts.
// [action-reconciliation-identity]
const BATCH_URL = '/api/invoices/batch';

// The poll cadence. Each tick both advances the simulation server-side and
// returns what happened, so this is also the event rate the feed shows and
// the worst-case latency between an event and every surface reflecting it.
const LIVE_TICK_MS = 2500;

// How many conformed events the rolling feed retains (newest first).
const LIVE_FEED_MAX = 30;

// How long a live event stays re-appliable over a landing bootstrap. The race
// it closes: a tick's DB write commits AFTER a bootstrap's SELECT ran but its
// response lands BEFORE the (much heavier) bootstrap response does — applying
// that dump verbatim would silently un-happen the event until the next reload.
// Entries older than this are certainly reflected in any dump and age out.
const LIVE_JOURNAL_MS = 20000;

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

    // The bulk-edit lifecycle buttons (save bar). Local state transitions,
    // except SaveAll, which issues the one batch request.
    if (payload.btnType === 'save-invoice-edits') {
      this.acmeEdits$SaveAll();
      return;
    }
    if (payload.btnType === 'discard-invoice-edits') {
      this.acmeEdits$Discard();
      return;
    }
    if (payload.btnType === 'edit-undo') {
      this.acmeEdits$Undo();
      return;
    }
    if (payload.btnType === 'edit-redo') {
      this.acmeEdits$Redo();
      return;
    }

    this.acmeData$Request(payload.btnType, payload);
  }

  static acmeData$OnViewStreamInfo(e) {
    const payload = e?.payload || {};

    // A table-side gesture's edits — a committed cell or a bulk range set —
    // transmitted rather than clicked, because the values come from an editor
    // control or a selection, not from a button's dataset.
    if (e?.action === 'CHANNEL_ACME_DATA_EDIT_COMMIT_EVENT') {
      this.acmeEdits$Commit(payload.edits);
      return;
    }

    if (e?.action !== 'CHANNEL_ACME_DATA_INVOICE_SUBMIT_EVENT') return;
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

  // ── Live payment activity ─────────────────────────────────────────────────
  //
  // While a user is signed in, the API tier simulates continuous payment
  // activity: each poll both ADVANCES the simulation (the server commits this
  // tick's events) and returns what happened, with the full joined row for
  // every touched invoice. The clock is a raw RxJS interval held here — the
  // sanctioned escape for timing the idioms cannot express, kept inside the
  // channel [escape-to-raw-rxjs] — started when the first dump lands and
  // stopped by acmeData$ClearData, so its lifetime is exactly "signed in with
  // data". [record:live-polling-updates]
  //
  // Each tick's request rides the same path as every other request: a
  // REQUEST_EVENT the null requester ViewStream forwards to the fetch channel
  // — a Channel cannot fetch for itself. [bridge-channel-output-to-transmit]

  static acmeData$StartLiveTicks() {
    if (this.props.acmeLiveTickSub != null) return;

    this.props.acmeLiveTickSub = interval(LIVE_TICK_MS).subscribe(() =>
      this.acmeData$RequestLiveTick(),
    );
  }

  /**
   * The structural teardown for the one long-lived subscription this channel
   * owns. Called from ClearData (sign-out, session expiry) and on a tick 401.
   * [no-leaked-subscription]
   */
  static acmeData$StopLiveTicks() {
    if (this.props.acmeLiveTickSub != null) {
      this.props.acmeLiveTickSub.unsubscribe();
      this.props.acmeLiveTickSub = null;
    }

    this.props.acmeLiveTickInFlight = false;
  }

  /**
   * One poll. The in-flight latch is exhaust semantics by hand — a new tick is
   * SKIPPED, not queued, while one is outstanding, so a slow response never
   * stacks requests. Hand-rolled because the request completes on a different
   * channel than it starts (REQUEST_EVENT out, fetch payload back), which is a
   * seam no single RxJS operator spans. [select-concurrency-operator]
   *
   * Deliberately NOT acmeData$Request: a tick is not a client mutation. It
   * must not raise acmePendingMutations — its response carries its own patch,
   * so it never invalidates the dump, and counting it would make the
   * stale-bootstrap guard discard authoritative refetches forever.
   */
  static acmeData$RequestLiveTick() {
    if (this.props.acmeLiveTickInFlight === true) return;
    if (this.props.acmeIsLoaded !== true) return;

    this.props.acmeLiveTickInFlight = true;

    const fetchProps = AcmeEndpointsTraits.acmeEndpoints$Resolve('live-tick');

    if (fetchProps === null) return;

    this.acmeData$SendToChannel('CHANNEL_FETCH_ACME_API', fetchProps);
  }

  /**
   * A tick landed. External events reconcile with the user's own in-flight
   * work by two rules:
   *
   *   skip what an intent owns   an invoice with an in-flight optimistic
   *                              toggle is left to that toggle's own typed
   *                              reconciliation (confirm / rollback /
   *                              supersede) — an external patch would race the
   *                              inverse. The toggle's authoritative refetch
   *                              settles it. [typed-reconciliation-outcome]
   *   patch, never replace       the merge writes only what the events name,
   *                              onto whatever provisional state is held, so a
   *                              tick landing mid-mutation cannot clobber the
   *                              optimistic values the way a stale bootstrap
   *                              would (which is why ticks bypass the
   *                              pending-mutations guard entirely).
   *
   * The merged state is published as a normal full-state UPDATED — the same
   * emission a mutation's refetch produces — so every surface (cards, table,
   * pagination, quick-search, a page composed later from replay) refreshes by
   * the one path it already has, and none of them re-render wholesale: each
   * repaints in place by its own established freshness mechanism.
   */
  static acmeData$OnLiveTickReturned(data = {}) {
    this.props.acmeLiveTickInFlight = false;

    // Signed out while the request was in flight: the data was dropped and
    // nothing may be published for an identity that no longer holds it.
    if (this.props.acmeIsLoaded !== true) return;

    const events = Array.isArray(data.events) ? data.events : [];
    const rows = Array.isArray(data.invoices) ? data.invoices : [];

    // A quiet tick (nothing was pending to pay, odds rolled no create):
    // nothing changed, so nothing is published and no surface repaints.
    if (events.length === 0) return;

    const skipIds = new Set(
      this.props.acmeStatusIntents.map(({ invoiceId }) => String(invoiceId)),
    );

    const { data: nextData, changed } = applyLiveInvoiceEvents(
      this.acmeData$GetData(),
      events,
      rows,
      skipIds,
    );

    if (changed === true) this.props.acmeData = nextData;

    // Journal the raw events so a bootstrap whose snapshot predates them can
    // re-apply them when it lands — see LIVE_JOURNAL_MS.
    const now = Date.now();
    this.props.acmeLiveJournal = [
      ...this.props.acmeLiveJournal.filter(
        (entry) => now - entry.at < LIVE_JOURNAL_MS,
      ),
      ...events.map((event) => ({
        type: event.type,
        invoiceId: event.invoiceId,
        row: rows.find(({ id }) => String(id) === String(event.invoiceId)),
        at: now,
      })),
    ];

    // The feed line is composed here, channel-side, so every payload already
    // carries msg and the feed view only renders. The rolling list (newest
    // first, capped) is durable state and lives on this channel — riding
    // every publish, it also reaches a feed view born later via replay.
    // [record:derived-activity-log] [state-machine-in-channel]
    this.props.acmeLiveFeed = [
      ...buildLiveFeedEvents(events, rows).reverse(),
      ...this.props.acmeLiveFeed,
    ].slice(0, LIVE_FEED_MAX);

    this.acmeData$Publish('CHANNEL_ACME_DATA_UPDATED_EVENT');
  }

  /**
   * A bootstrap landed; re-apply any journaled live event its snapshot missed.
   * The merge is idempotent (an already-present created row and an
   * already-paid invoice both no-op), so re-applying an event the dump DOES
   * reflect costs nothing. Entries age out rather than being tracked
   * per-dump; within the window they simply keep the dump from un-happening a
   * committed event.
   */
  static acmeData$ReplayLiveJournal() {
    const now = Date.now();

    this.props.acmeLiveJournal = this.props.acmeLiveJournal.filter(
      (entry) => now - entry.at < LIVE_JOURNAL_MS && entry.row != null,
    );

    if (this.props.acmeLiveJournal.length === 0) return;

    const { data: nextData, changed } = applyLiveInvoiceEvents(
      this.acmeData$GetData(),
      this.props.acmeLiveJournal,
      this.props.acmeLiveJournal.map(({ row }) => row),
      new Set(),
    );

    if (changed === true) this.props.acmeData = nextData;
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
    // The stream stops with the identity: no session, no ticks. This is the
    // single funnel every "no longer signed in" path already runs through.
    this.acmeData$StopLiveTicks();

    this.props.acmeData = { ...EMPTY_DATA };
    this.props.acmeIsLoaded = false;
    this.props.acmePendingMutations = 0;
    this.props.acmeStatusIntents = [];
    this.props.acmeLiveFeed = [];
    this.props.acmeLiveJournal = [];

    // Unsaved edits were edits OF this identity's data; they go with it.
    this.acmeEdits$Reset();
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
      // The rolling live-activity feed (conformed entries, newest first).
      // Rides EVERY emission for the same complete-state reason as the rest:
      // the channel replays one payload, so a feed view born after the last
      // tick must find the current feed in whatever payload it replays.
      liveFeed: this.props.acmeLiveFeed || [],
      // The bulk-edit slice — drafts, counts, undo/redo availability, saving
      // flag. Rides EVERY emission for the same complete-state reason: a save
      // bar or a table born after the last edit must find the current overlay
      // in whatever payload it replays.
      edits: this.acmeEdits$GetPublicState(),
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

      // A failed tick releases the in-flight latch and is otherwise silent:
      // publishing an ERROR payload every 2.5s while the API tier hiccups
      // would repaint every surface into an error state for a background
      // request the user never issued. A 401 additionally stops the clock —
      // the session is gone, and ChannelAcmeAuth (which sees this same fetch
      // payload) owns announcing that.
      if (failedUrl.includes(LIVE_TICK_URL) === true) {
        this.props.acmeLiveTickInFlight = false;

        if (payload.status === 401) this.acmeData$StopLiveTicks();

        console.warn(
          'Spyne Warning: live tick request failed',
          payload.status,
          payload.message,
        );
        return;
      }

      // A failed request was still an in-flight mutation; the counter must
      // come down or the bootstrap guard below would starve forever. Only
      // bootstrap is not a mutation, and it never errors silently into this
      // count because it never incremented it. (The live tick is excluded
      // above — it never counts as a mutation either.)
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

      // A failed batch save releases the saving latch and nothing else —
      // nothing persisted, so every draft and the whole history stand, and
      // the ERROR publish below carries them for the save bar to re-arm from.
      if (failedUrl.includes(BATCH_URL) === true) {
        this.acmeEdits$OnSaveFailed();
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

      // Re-apply any recent live event this snapshot predates — see
      // LIVE_JOURNAL_MS. Runs between SetData and Publish so the emission
      // carries the reconciled state.
      this.acmeData$ReplayLiveJournal();

      this.acmeData$Publish(
        wasLoaded
          ? 'CHANNEL_ACME_DATA_UPDATED_EVENT'
          : 'CHANNEL_ACME_DATA_LOADED_EVENT',
      );

      // Data exists, so payment activity begins (idempotent — a mutation's
      // refetched dump lands here too, with the clock already running).
      this.acmeData$StartLiveTicks();
      return;
    }

    if (dataKey === 'liveTick') {
      this.acmeData$OnLiveTickReturned(data);
      return;
    }

    if (dataKey === 'batchSave') {
      this.props.acmePendingMutations = Math.max(
        0,
        this.props.acmePendingMutations - 1,
      );

      // Confirmation: the saved snapshot is folded into the held dump (every
      // derived slice recomputed) and cleared from the overlay BEFORE
      // publishing, so this emission already shows the saved values on every
      // surface. The authoritative refetch then confirms them — and brings
      // along whatever external activity landed on OTHER invoices meanwhile,
      // which the batch deliberately never restated.
      this.acmeEdits$OnSaveConfirmed();

      this.acmeData$Publish('CHANNEL_ACME_DATA_MUTATION_EVENT', {
        message: data?.message ?? null,
      });
      this.acmeData$FetchBootstrap();
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
