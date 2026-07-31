import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
import { AcmeAuthStateTraits } from 'traits/app/acme-auth-state-traits.js';
import { AcmeDataStateTraits } from 'traits/app/acme-data-state-traits.js';
import { AcmeEndpointsTraits } from 'traits/channel/acme-endpoints-traits.js';

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
    const acmeUiFilter = new ChannelPayloadFilter({
      propFilters: {
        eventType: 'acmeData',
      },
    });

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

    // Signed out. The cache was fetched for an identity that no longer holds it,
    // so it is dropped — but nothing is emitted. Nothing should ever render
    // logged-out data, so there is no consumer for that payload, and emitting
    // would race the redirect that is already under way.
    AcmeDataStateTraits.acmeData$Clear();
  }

  // ── Inbound: UI -> request ────────────────────────────────────────────────

  static acmeData$OnUiEvent(e) {
    const payload = e?.payload ?? {};
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

    this.acmeData$SendToChannel('CHANNEL_FETCH_ACME_API', fetchProps);
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

  // ── Outbound: response -> semantic action ─────────────────────────────────

  static acmeData$Publish(action, payload = {}) {
    this.sendChannelPayload(action, {
      ...payload,
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
      // A 401 is also seen by ChannelAcmeAuth, which subscribes to this same
      // fetch channel filtered on status and owns the auth-state change. It is
      // still reported here so a view can surface the failure; which of the two
      // subscribers runs first does not matter, because neither reads what the
      // other writes.
      this.acmeData$Publish('CHANNEL_ACME_DATA_ERROR_EVENT', {
        ...payload,
        isUnauthenticated: payload.status === 401,
      });
      return;
    }

    const { dataKey, data } = payload;

    if (dataKey === 'bootstrap') {
      const { wasLoaded } = AcmeDataStateTraits.acmeData$Set(data);

      // Written BEFORE the event, so a listener can read the store
      // synchronously in its handler rather than taking the payload apart.
      this.acmeData$Publish(
        wasLoaded
          ? 'CHANNEL_ACME_DATA_UPDATED_EVENT'
          : 'CHANNEL_ACME_DATA_LOADED_EVENT',
        { data },
      );
      return;
    }

    if (dataKey === 'mutation') {
      // The write succeeded, so the cached dump is stale. Re-reading it is what
      // produces DATA_UPDATED and re-renders whatever was showing the old
      // values — the server stays the authority, rather than the client patching
      // its own cache and hoping it matches.
      this.acmeData$Publish('CHANNEL_ACME_DATA_MUTATION_EVENT', data);
      this.acmeData$FetchBootstrap();
      return;
    }

    console.warn(
      'Spyne Warning: CHANNEL_FETCH_ACME_API returned an untagged payload. Its request was issued without a mapFn from ACME_ENDPOINTS.',
      payload,
    );
  }
}
