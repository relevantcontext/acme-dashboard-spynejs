import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
import { AcmeAuthStateTraits } from 'traits/app/acme-auth-state-traits.js';
import { AcmeDataStateTraits } from 'traits/app/acme-data-state-traits.js';
import { AcmeEndpointsTraits } from 'traits/channel/acme-endpoints-traits.js';

/**
 * Logic for ChannelAcmeApi, the intermediary between the Acme ChannelFetch
 * instances and UI events.
 *
 * Why an intermediary at all: ViewStreams should not have to know that
 * "the user typed in the invoice search box" means "GET /api/invoices?query=".
 * Views raise semantic UI events, this channel turns them into requests, and
 * the responses come back out as semantic actions the views subscribe to. The
 * URL shapes stay in one place.
 *
 * ── Driving a paused ChannelFetch from a Channel ─────────────────────────────
 *
 * `sendInfoToChannel` is a ViewStream method — Channel does not have it, so a
 * channel cannot ask another channel to fetch. Requests are therefore published
 * as CHANNEL_ACME_API_REQUEST_EVENT and performed by AcmeApiRequester, a
 * null-appended ViewStream that listens to this channel.
 */
export class AcmeApiChannelTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'acmeApi$';
    super(context, traitPrefix);
  }

  // ── Wiring ────────────────────────────────────────────────────────────────

  static acmeApi$OnRegistered() {
    this.acmeApi$ListenToFetchChannels();
    this.acmeApi$ListenToUiEvents();
  }

  /**
   * Every ChannelFetch publishes on two actions, {NAME}_RESPONSE_EVENT and
   * {NAME}_ERROR_EVENT. Each is mapped to one semantic action so views never
   * subscribe to a fetch channel directly.
   */
  static acmeApi$ListenToFetchChannels() {
    // One subscription for every read and write. What came back is decided by
    // the `dataKey` the request's mapFn stamped on, not by which channel spoke.
    this.getChannel('CHANNEL_ACME_ENDPOINTS').subscribe(
      this.acmeApi$OnFetchReturned.bind(this),
    );

    // Session is routed separately and subscribed FIRST. Its response is the
    // app's initial auth state, and it must be this channel's first emission —
    // ChannelApp merges CHANNEL_ACME_API alongside CHANNEL_ROUTE and
    // CHANNEL_FETCH_MODEL, and the merge resolves on the first payload from
    // each. Nothing else can emit before it: every other fetch channel is
    // paused, so only the unpaused session request is in flight at boot.
    this.getChannel('CHANNEL_ACME_SESSION').subscribe(
      this.acmeApi$OnSessionReturned.bind(this),
    );

    // Auth is routed separately: a login outcome is two distinct actions rather
    // than one payload a view has to interrogate.
    this.getChannel('CHANNEL_ACME_AUTH').subscribe(
      this.acmeApi$OnAuthReturned.bind(this),
    );
  }

  // ── Auth state ────────────────────────────────────────────────────────────

  /**
   * Every payload this channel publishes carries `isAuthenticated`, so a view
   * never has to correlate a data action with a separate auth action to know
   * whether it is allowed to render what it just received.
   */
  static acmeApi$Publish(action, payload = {}) {
    this.sendChannelPayload(action, {
      ...payload,
      isAuthenticated: AcmeAuthStateTraits.acmeAuthState$IsAuthenticated(),
    });
  }

  /**
   * Records the server's view of the session and emits the right lifecycle
   * action: INIT_AUTH the first time, AUTH_CHANGED whenever the identity
   * actually changes afterwards.
   *
   * Emitting nothing when an authenticated user's session is merely re-confirmed
   * is deliberate — AUTH_CHANGED should mean "this changed", not "we asked
   * again", or every refetch would churn every listener.
   */
  static acmeApi$SetAuthState(user) {
    const { changed, wasInitialized } =
      AcmeAuthStateTraits.acmeAuthState$Set(user);

    if (!wasInitialized) {
      this.acmeApi$Publish('CHANNEL_ACME_API_INIT_AUTH_EVENT', { user });
    } else if (changed) {
      this.acmeApi$Publish('CHANNEL_ACME_API_AUTH_CHANGED_EVENT', { user });
    } else {
      // The session was merely re-confirmed. Nothing changed, so nothing is
      // published and the cached data stays valid.
      return;
    }

    this.acmeApi$SyncDataToAuthState();
  }

  /**
   * Auth state just resolved or changed, so the data follows it.
   *
   * Authenticated means the dump is requested — this is the only place a read
   * originates, which is what makes "the user is logged in" the single trigger
   * for loading rather than something each page has to remember to do.
   *
   * Unauthenticated means the cache is dropped. It was fetched for an identity
   * that no longer holds it.
   *
   * Requested AFTER the lifecycle action is published, so INIT_AUTH remains this
   * channel's first emission — ChannelApp's merge resolves on it, and the dump's
   * DATA_LOADED necessarily follows a round trip later.
   */
  static acmeApi$SyncDataToAuthState() {
    if (AcmeAuthStateTraits.acmeAuthState$IsAuthenticated()) {
      this.acmeApi$FetchBootstrap();
      return;
    }

    AcmeDataStateTraits.acmeData$Clear();
  }

  /**
   * GET /api/auth/session returns { user } or { user: null }, and needs no
   * session itself.
   *
   * A failed request still initialises the state as unauthenticated. Without
   * that, a network error or a downed API would leave INIT_AUTH unemitted, and
   * ChannelApp's merge — which waits on this channel — would never resolve, so
   * the whole app would fail to boot rather than simply showing a logged-out UI.
   */
  static acmeApi$OnSessionReturned(e) {
    const payload = e?.payload ?? {};
    const failed = payload.isChannelFetchError === true;
    const user = failed ? null : payload.user;

    // Lifecycle first, so INIT_AUTH remains this channel's first emission at
    // boot — ChannelApp's merge resolves on it.
    this.acmeApi$SetAuthState(user ?? null);

    // Then the raw signal: SESSION_EVENT fires on every session response,
    // including a re-check that changed nothing. INIT_AUTH and AUTH_CHANGED
    // describe the lifecycle; this one just says "the server was asked".
    this.acmeApi$Publish('CHANNEL_ACME_API_SESSION_EVENT', {
      ...payload,
      user: user ?? null,
      didRequestFail: failed,
    });
  }

  /**
   * Splits the auth channel's result into login success / failure.
   *
   * A 401 from /api/auth/login is a non-OK response, so ChannelFetch conforms it
   * to an error payload. The API's own body — { message: 'Invalid credentials.' }
   * — is not the error payload's `message` (that describes the transport
   * failure); it arrives as text in `rawBodyPreview`, so it is parsed back out
   * here. That string is the one the Next.js login form displays, and keeping it
   * identical is why both apps show the same copy.
   *
   * Logout also travels this channel. It returns { message: 'Signed out.' } with
   * no `user`, so presence of `user` is what distinguishes a login.
   */
  static acmeApi$OnAuthReturned(e) {
    const payload = e?.payload ?? {};

    if (payload.isChannelFetchError === true) {
      // Only an error payload carries `url`, which is what tells a failed login
      // apart from a failed logout — both travel this one channel.
      const isLoginAttempt = /\/auth\/login/.test(payload.url || '');

      this.acmeApi$Publish(
        isLoginAttempt
          ? 'CHANNEL_ACME_API_LOGIN_FAILED_EVENT'
          : 'CHANNEL_ACME_API_AUTH_EVENT',
        { ...payload, message: this.acmeApi$GetApiErrorMessage(payload) },
      );
      return;
    }

    // A success payload is just the parsed body, with no url to inspect. Login
    // returns { user }; logout returns { message: 'Signed out.' }.
    //
    // State is updated BEFORE the specific action is published, so that action
    // already carries the correct isAuthenticated flag. AUTH_CHANGED follows it,
    // emitted by acmeApi$SetAuthState.
    if (payload.user) {
      this.acmeApi$SetAuthState(payload.user);
      this.acmeApi$Publish('CHANNEL_ACME_API_LOGIN_SUCCESS_EVENT', payload);
      return;
    }

    this.acmeApi$SetAuthState(null);
    this.acmeApi$Publish('CHANNEL_ACME_API_LOGOUT_EVENT', payload);
  }

  /**
   * Recovers the API's message from a conformed ChannelFetch error payload.
   * Falls back to the framework's description when the body is not JSON.
   */
  static acmeApi$GetApiErrorMessage(payload = {}) {
    try {
      const body = JSON.parse(payload.rawBodyPreview);
      if (body && typeof body.message === 'string') {
        return body.message;
      }
    } catch {
      // not JSON — fall through
    }

    return payload.message || 'Something went wrong.';
  }

  /**
   * UI events arrive through CHANNEL_UI, which is fed by each ViewStream's
   * broadcastEvents — never by a manual addEventListener.
   *
   * The convention for markup is a pair of data attributes:
   *
   *   data-event-type="acmeApi"           routes the event here
   *   data-btn-type="delete-invoice"      keys into ACME_ENDPOINTS
   *
   * eventType is the catch-all: it is what this channel filters on, so every
   * element that talks to the API carries it. btnType then selects the endpoint
   * inside the subscriber.
   *
   * The whole dataset of the element that raised the event arrives on the
   * payload — `view-stream-broadcaster.js` does
   * `data.payload = convertDomStringMapToObj(q.dataset)` — so data-id reaches
   * the request without anything having to thread it through.
   */
  static acmeApi$ListenToUiEvents() {
    const acmeUiFilter = new ChannelPayloadFilter({
      propFilters: {
        eventType: 'acmeApi',
      },
    });

    this.getChannel('CHANNEL_UI', acmeUiFilter).subscribe(
      this.acmeApi$OnUiEvent.bind(this),
    );

    // Sign out is its own eventType rather than an acmeAction, matching how
    // channel-menu-drawer-traits filters on `menuDrawer`. The button carries
    // data-event-type="signOut" and nothing else; there is no form data to
    // collect, so the click is the whole request.
    const signOutFilter = new ChannelPayloadFilter({
      propFilters: {
        eventType: 'signOut',
      },
    });

    this.getChannel('CHANNEL_UI', signOutFilter).subscribe(
      this.acmeApi$Logout.bind(this),
    );
  }

  // ── Inbound: UI -> request ────────────────────────────────────────────────

  static acmeApi$OnUiEvent(e) {
    const payload = e?.payload ?? {};
    const { btnType } = payload;

    // Login is not an endpoint — it travels CHANNEL_ACME_AUTH, which stays
    // separate so a credential rejection is an auth outcome rather than a failed
    // data request.
    if (btnType === 'login') {
      this.acmeApi$Login(payload);
      return;
    }

    this.acmeApi$Request(btnType, payload);
  }

  /**
   * The one way a request leaves this channel.
   *
   * ACME_ENDPOINTS turns the btnType plus the UI payload into fetch props,
   * including the mapFn that will stamp the response. Everything downstream is
   * generic.
   */
  static acmeApi$Request(btnType, payload = {}) {
    const fetchProps = AcmeEndpointsTraits.acmeEndpoints$Resolve(
      btnType,
      payload,
    );

    if (fetchProps === null) return;

    this.acmeApi$SendToChannel('CHANNEL_ACME_ENDPOINTS', fetchProps);
  }

  // ── Outbound: request -> ChannelFetch ─────────────────────────────────────

  /**
   * Publishes a request instruction. AcmeApiRequester — a null-appended
   * ViewStream listening to this channel — picks it up and performs the actual
   * sendInfoToChannel against the named ChannelFetch.
   *
   * This channel deliberately does not create ViewStreams of its own. Requests
   * must originate from a ViewStream, and routing them through one persistent
   * listener keeps that boundary in a single, findable place rather than
   * spawning a throwaway view per request.
   */
  static acmeApi$SendToChannel(channelName, payload) {
    this.sendChannelPayload('CHANNEL_ACME_API_REQUEST_EVENT', {
      channelName,
      ...payload,
    });
  }

  /**
   * ChannelFetch reads only these keys off the payload:
   *   mapFn, url, header, headers, body, mode, method, responseType, debug
   * Anything else is discarded by its pick() before the request is built.
   */
  static acmeApi$JsonRequest(url, method, body) {
    return {
      url,
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  static acmeApi$FetchSession() {
    this.acmeApi$SendToChannel('CHANNEL_ACME_SESSION', {
      url: '/api/auth/session',
    });
  }

  /**
   * The only data read in the app. Everything a page renders comes from here
   * and is served out of SpyneAppProperties afterwards.
   *
   * There is deliberately no FetchInvoices / FetchCustomers / FetchCards: search
   * and pagination filter the cached dump instead of returning to the server, so
   * a per-page read would have no caller.
   */
  static acmeApi$FetchBootstrap() {
    this.acmeApi$Request('bootstrap');
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  static acmeApi$Login(payload = {}) {
    const { email, password } = payload;

    this.acmeApi$SendToChannel(
      'CHANNEL_ACME_AUTH',
      this.acmeApi$JsonRequest('/api/auth/login', 'POST', { email, password }),
    );
  }

  static acmeApi$Logout() {
    this.acmeApi$SendToChannel('CHANNEL_ACME_AUTH', {
      url: '/api/auth/logout',
      method: 'POST',
    });
  }

  // Mutations have no methods of their own — 'create-invoice',
  // 'update-invoice' and 'delete-invoice' are entries in ACME_ENDPOINTS, reached
  // by btnType through acmeApi$Request like every other request.

  // ── Inbound: ChannelFetch -> semantic action ──────────────────────────────

  /**
   * ChannelFetch marks failures with isChannelFetchError, which is how a 401 or
   * a 400 validation body is told apart from real response data.
   *
   * Errors are republished on a single CHANNEL_ACME_API_ERROR_EVENT carrying
   * the originating url, so a view can listen once for all failures rather
   * than pairing an error listener to every read.
   *
   * On success there is no `action` argument to route by — one channel serves
   * every endpoint. The request's mapFn has already conformed the body to
   * `{ dataKey, data }`, and dataKey is what decides what this is.
   */
  static acmeApi$OnFetchReturned(e) {
    const payload = e?.payload ?? {};

    if (payload.isChannelFetchError === true) {
      const isUnauthenticated = payload.status === 401;

      // A 401 on a data request means the server no longer accepts the session —
      // expired, revoked, or cleared in another tab. That is an auth change, not
      // just a failed request, so the state is updated first: AUTH_CHANGED fires
      // and the stage's redirect rule sends the user to login. Setting it before
      // publishing also means the error payload below reports the correct
      // isAuthenticated.
      //
      // Only reached for data channels. A 401 from /api/auth/login is a rejected
      // credential and routes through acmeApi$OnAuthReturned instead.
      if (isUnauthenticated) {
        this.acmeApi$SetAuthState(null);
      }

      // Unlike a success payload, an error IS self-identifying: ChannelFetch
      // builds it from the real request metadata, so `url` names the endpoint
      // that failed.
      this.acmeApi$Publish('CHANNEL_ACME_API_ERROR_EVENT', {
        ...payload,
        isUnauthenticated,
      });
      return;
    }

    const { dataKey, data } = payload;

    if (dataKey === 'bootstrap') {
      const { wasLoaded } = AcmeDataStateTraits.acmeData$Set(data);

      // The store is written BEFORE the event, so a listener can read
      // acmeData$Get() synchronously in its handler rather than having to take
      // the payload apart.
      this.acmeApi$Publish(
        wasLoaded
          ? 'CHANNEL_ACME_API_DATA_UPDATED_EVENT'
          : 'CHANNEL_ACME_API_DATA_LOADED_EVENT',
        { data },
      );
      return;
    }

    if (dataKey === 'mutation') {
      // The write succeeded, so the cached dump is now stale. Re-reading it is
      // what produces DATA_UPDATED and re-renders whatever was showing the old
      // values — the server stays the authority on what the data is, rather
      // than the client patching its own cache and hoping it matches.
      this.acmeApi$Publish('CHANNEL_ACME_API_MUTATION_EVENT', data);
      this.acmeApi$Request('bootstrap');
      return;
    }

    console.warn(
      `Spyne Warning: CHANNEL_ACME_ENDPOINTS returned an untagged payload. Its request was issued without a mapFn from ACME_ENDPOINTS.`,
      payload,
    );
  }
}
