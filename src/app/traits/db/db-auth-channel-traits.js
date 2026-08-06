import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
import { AcmeAuthStateTraits } from 'traits/shell/acme-auth-state-traits.js';

/**
 * Logic for ChannelAcmeAuth — everything the app knows about who the user is.
 *
 * It is the ONLY writer of auth state. That single-writer rule is what keeps a
 * shared global from rotting: `AcmeAuthStateTraits` is read from all over the
 * app, and the moment two things could write it, a reader can no longer trust
 * what it gets back.
 *
 * ── What it owns ────────────────────────────────────────────────────────────
 *
 *   the session check at boot      CHANNEL_FETCH_ACME_SESSION
 *   login and sign out             CHANNEL_FETCH_ACME_AUTH
 *   a 401 on any data request      CHANNEL_FETCH_ACME_API, filtered on status
 *
 * That third one is the subtle one. A 401 arrives on the *data* channel, but it
 * means the server has stopped accepting the session — an auth fact, not a data
 * fact. Rather than have ChannelAcmeData report it sideways, this channel
 * subscribes to the same fetch channel with a filter that only passes 401s. Two
 * channels, one transport, each minding its own concern, and auth state still
 * has exactly one writer.
 *
 * ── What it does NOT own ────────────────────────────────────────────────────
 *
 * Loading data. ChannelAcmeData listens for the lifecycle actions below and
 * decides for itself when to fetch. Data depends on auth; auth never depends on
 * data.
 *
 * Login requests, either. FormLoginTraits sends the credentials straight to
 * CHANNEL_FETCH_ACME_AUTH — a ViewStream has sendInfoToChannel and needs no
 * relay, and routing the password through a channel payload to get back to the
 * same place would only widen where it can be observed.
 */
export class AcmeAuthChannelTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'acmeAuth$';
    super(context, traitPrefix);
  }

  // ── Wiring ────────────────────────────────────────────────────────────────

  static acmeAuth$OnRegistered() {
    this.acmeAuth$ListenToFetchChannels();
    this.acmeAuth$ListenToUiEvents();
  }

  static acmeAuth$ListenToFetchChannels() {
    // Subscribed FIRST. The session response is the app's initial auth state and
    // must be this channel's first emission — ChannelApp merges this channel and
    // resolves on its first payload. Nothing else can beat it: every other fetch
    // channel is paused, so only the session request is in flight at boot.
    this.getChannel('CHANNEL_FETCH_ACME_SESSION').subscribe(
      this.acmeAuth$OnSessionReturned.bind(this),
    );

    // Login and sign out both travel here; the response shape tells them apart.
    this.getChannel('CHANNEL_FETCH_ACME_AUTH').subscribe(
      this.acmeAuth$OnAuthReturned.bind(this),
    );

    // Only error payloads carry `status`, so this passes 401s and nothing else.
    const unauthorizedFilter = new ChannelPayloadFilter({ status: 401 });

    this.getChannel('CHANNEL_FETCH_ACME_API', unauthorizedFilter).subscribe(
      this.acmeAuth$OnUnauthorized.bind(this),
    );
  }

  /**
   * Sign out is its own eventType rather than a btnType, matching how
   * channel-menu-drawer-traits filters on `menuDrawer`. The button carries
   * data-event-type="signOut" and nothing else — there is no form data to
   * collect, so the click is the whole request.
   */
  static acmeAuth$ListenToUiEvents() {
    const signOutFilter = new ChannelPayloadFilter({ eventType: 'signOut' });

    this.getChannel('CHANNEL_UI', signOutFilter).subscribe(
      this.acmeAuth$SignOut.bind(this),
    );
  }

  // ── Auth state ────────────────────────────────────────────────────────────

  /**
   * Every payload carries `isAuthenticated`, read live at publish time. Never
   * capture it: `initData.isAuthenticated` was once frozen at merge time and
   * bounced users straight back to /login the moment they signed in.
   */
  static acmeAuth$Publish(action, payload = {}) {
    this.sendChannelPayload(action, {
      ...payload,
      isAuthenticated: AcmeAuthStateTraits.acmeAuthState$IsAuthenticated(),
    });
  }

  /**
   * Records the server's view of the session and emits the right lifecycle
   * action: INIT the first time, CHANGED whenever the identity actually changes
   * afterwards.
   *
   * Emitting nothing when a session is merely re-confirmed is deliberate —
   * CHANGED should mean "this changed", not "we asked again", or every re-check
   * would churn every listener and re-trigger the data load.
   */
  static acmeAuth$SetAuthState(user) {
    const { changed, wasInitialized } =
      AcmeAuthStateTraits.acmeAuthState$Set(user);

    if (!wasInitialized) {
      this.acmeAuth$Publish('CHANNEL_ACME_AUTH_INIT_EVENT', { user });
      return;
    }

    if (changed) {
      this.acmeAuth$Publish('CHANNEL_ACME_AUTH_CHANGED_EVENT', { user });
    }
  }

  /**
   * GET /api/auth/session returns { user } or { user: null }, and needs no
   * session itself.
   *
   * A failed request still initialises the state as unauthenticated. Without
   * that, a network error or a downed API would leave INIT unemitted, and
   * ChannelApp's merge — which waits on this channel — would never resolve, so
   * the app would fail to boot rather than simply showing a logged-out UI.
   */
  static acmeAuth$OnSessionReturned(e) {
    const payload = e?.payload ?? {};
    const failed = payload.isChannelFetchError === true;
    const user = failed ? null : payload.user;

    // Lifecycle first, so INIT remains this channel's first emission at boot.
    this.acmeAuth$SetAuthState(user ?? null);

    // Then the raw signal: SESSION_EVENT fires on every session response,
    // including a re-check that changed nothing. INIT and CHANGED describe the
    // lifecycle; this one just says "the server was asked".
    this.acmeAuth$Publish('CHANNEL_ACME_AUTH_SESSION_EVENT', {
      ...payload,
      user: user ?? null,
      didRequestFail: failed,
    });
  }

  /**
   * A 401 on a data request means the session is gone server-side — expired,
   * revoked, or cleared in another tab. That is an auth change, so the state is
   * updated and CHANGED fires, which is what drives the redirect to /login.
   *
   * Deliberately NOT a document reload, unlike sign-out. A reload here could
   * loop: boot, session check reports valid, a data request 401s, reload,
   * repeat. The in-app redirect cannot loop.
   */
  static acmeAuth$OnUnauthorized() {
    this.acmeAuth$SetAuthState(null);
  }

  /**
   * Splits the auth channel's result into login success, login failure, and
   * completed sign out.
   *
   * A 401 from /api/auth/login is a non-OK response, so ChannelFetch conforms it
   * to an error payload. The API's own body — { message: 'Invalid credentials.' }
   * — is not the error payload's `message` (that describes the transport
   * failure); it arrives as text in `rawBodyPreview` and is parsed back out. That
   * string is the one the Next.js login form displays, and keeping it identical
   * is why both apps show the same copy.
   */
  static acmeAuth$OnAuthReturned(e) {
    const payload = e?.payload ?? {};

    if (payload.isChannelFetchError === true) {
      // Only an error payload carries `url`, which is what tells a failed login
      // apart from a failed sign out — both travel this one fetch channel.
      const isLoginAttempt = /\/auth\/login/.test(payload.url || '');

      this.acmeAuth$Publish(
        isLoginAttempt
          ? 'CHANNEL_ACME_AUTH_LOGIN_FAILED_EVENT'
          : 'CHANNEL_ACME_AUTH_ERROR_EVENT',
        { ...payload, message: this.acmeAuth$GetApiErrorMessage(payload) },
      );
      return;
    }

    // A success payload is just the parsed body, with no url to inspect. Login
    // returns { user }; sign out returns { message: 'Signed out.' }.
    // State is updated BEFORE the action is published, so that action already
    // carries the correct isAuthenticated flag. CHANGED follows it, emitted by
    // acmeAuth$SetAuthState.
    if (payload.user) {
      this.acmeAuth$SetAuthState(payload.user);
      this.acmeAuth$Publish('CHANNEL_ACME_AUTH_LOGIN_SUCCESS_EVENT', payload);
      return;
    }

    // Sign out deliberately does NOT update auth state and does not redirect.
    // AppContainer responds to this action by replacing the document, and a
    // fresh boot re-establishes auth, data and every view from nothing — so
    // there is no teardown to enumerate and nothing to miss. Calling
    // SetAuthState(null) here would emit CHANGED, which the stage acts on by
    // routing to /login, giving a redirect and repaint the navigation is about
    // to discard.
    this.acmeAuth$Publish('CHANNEL_ACME_AUTH_SIGNOUT_COMPLETED_EVENT', payload);
  }

  /**
   * Recovers the API's message from a conformed ChannelFetch error payload.
   * Falls back to the framework's description when the body is not JSON.
   */
  static acmeAuth$GetApiErrorMessage(payload = {}) {
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

  // ── Outbound ──────────────────────────────────────────────────────────────

  static acmeAuth$SignOut() {
    this.acmeAuth$SendToChannel('CHANNEL_FETCH_ACME_AUTH', {
      url: '/api/auth/logout',
      method: 'POST',
    });
  }

  /**
   * Publishes a request instruction. AcmeRequesterNullView — a null-appended ViewStream
   * listening to this channel — performs the actual sendInfoToChannel, because
   * sendInfoToChannel is a ViewStream method and Channel has no equivalent.
   */
  static acmeAuth$SendToChannel(channelName, payload) {
    this.sendChannelPayload('CHANNEL_ACME_AUTH_REQUEST_EVENT', {
      channelName,
      ...payload,
    });
  }
}
