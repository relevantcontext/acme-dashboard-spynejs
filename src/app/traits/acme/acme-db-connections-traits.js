import { SpyneTrait, ChannelFetch, SpyneApp } from 'spyne';

/**
 * Registers every ChannelFetch that fronts the Acme SQL connection.
 *
 * This is logic, not a channel, so it lives in traits — only classes that
 * extend Channel or ChannelFetch are named `channel-*`. It is loaded and
 * invoked from index.js, the same way dev-tools.js is, so that every channel
 * the app owns is discoverable from a single entry point rather than being
 * registered from wherever it happens to be used.
 *
 * The data path is:
 *
 *   ViewStream -> CHANNEL_UI -> ChannelAcmeAuth / ChannelAcmeData -> these
 *              -> /api (dev-server proxy) -> Node tier -> Postgres
 *
 * A browser cannot speak the Postgres wire protocol, and shipping the
 * connection string to the client would hand the database to anyone with
 * devtools — hence the Node tier. Every URL below is same-origin: the webpack
 * dev server proxies /api to 127.0.0.1:8090, so there is no mixed-content block
 * and no CORS layer to maintain.
 *
 * There are three, and only three:
 *
 *   CHANNEL_FETCH_ACME_SESSION    who the user is, unpaused
 *   CHANNEL_FETCH_ACME_AUTH       login / logout
 *   CHANNEL_FETCH_ACME_API  every other read and write
 *
 * Plus ChannelAcmeAuth and ChannelAcmeData, plain Channels rather than fetch
 * channels, registered from index.js. Those two are what views subscribe to;
 * these three are transport. A channel per URL is what this replaced — the
 * endpoint is a property of a request, not a reason for another channel.
 *
 * All but CHANNEL_FETCH_ACME_SESSION are paused. A paused ChannelFetch does not
 * request on registration; it waits for `{NAME}_REQUEST_EVENT`. That matters
 * here because every one of these endpoints requires a session, so firing on
 * registration would only produce a 401 before anyone has logged in — and a
 * mutation must never fire merely because the app booted.
 */
export class AcmeDbConnectionsTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'acmeDbConnections$';
    super(context, traitPrefix);
  }

  static acmeDbConnections$GetApiBase() {
    return '/api';
  }

  /**
   * Called once from index.js.
   *
   * Static, so it needs no parent context — it only registers channels. The
   * order is deliberate: session first, so anything listening for auth state
   * has its channel available before the data channels appear.
   */
  static acmeDbConnections$RegisterChannels() {
    const apiBase = AcmeDbConnectionsTraits.acmeDbConnections$GetApiBase();

    // Unpaused. Reports { user } or { user: null } and needs no session itself,
    // so it doubles as the liveness probe for the whole path to Postgres.
    SpyneApp.registerChannel(
      new ChannelFetch('CHANNEL_FETCH_ACME_SESSION', {
        url: `${apiBase}/auth/session`,
      }),
    );

    // A 401 arrives on CHANNEL_FETCH_ACME_AUTH_ERROR_EVENT carrying
    // `message: 'Invalid credentials.'` — the same string the Next.js login
    // form shows, so both apps display identical copy.
    SpyneApp.registerChannel(
      new ChannelFetch('CHANNEL_FETCH_ACME_AUTH', {
        url: `${apiBase}/auth/login`,
        method: 'POST',
        pause: true,
      }),
    );

    // One channel for every read and write. Which endpoint a request goes to is
    // decided per request by ACME_ENDPOINTS, not by having a channel per URL —
    // see acme-endpoints-traits.js.
    //
    // The url here is only a default for a request that names none; every real
    // request overrides it. Note that this default is also what a SUCCESS
    // payload reports as its url, since ChannelFetch reads that off
    // `this.props` — which is exactly why responses are identified by the
    // `dataKey` their mapFn stamps on, and never by url.
    //
    // A validation failure returns 400 with the same { errors, message } shape
    // the Next.js server action returns, so the two forms render identical
    // validation text.
    SpyneApp.registerChannel(
      new ChannelFetch('CHANNEL_FETCH_ACME_API', {
        url: `${apiBase}/bootstrap`,
        pause: true,
      }),
    );
  }
}
