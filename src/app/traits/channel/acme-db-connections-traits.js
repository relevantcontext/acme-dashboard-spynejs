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
 *   ViewStream -> CHANNEL_UI -> ChannelAcmeApi -> these ChannelFetch instances
 *              -> /api (dev-server proxy) -> Node tier -> Postgres
 *
 * A browser cannot speak the Postgres wire protocol, and shipping the
 * connection string to the client would hand the database to anyone with
 * devtools — hence the Node tier. Every URL below is same-origin: the webpack
 * dev server proxies /api to 127.0.0.1:8090, so there is no mixed-content block
 * and no CORS layer to maintain.
 *
 * All but CHANNEL_ACME_SESSION are paused. A paused ChannelFetch does not
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
      new ChannelFetch('CHANNEL_ACME_SESSION', {
        url: `${apiBase}/auth/session`,
      }),
    );

    // A 401 arrives on CHANNEL_ACME_AUTH_ERROR_EVENT carrying
    // `message: 'Invalid credentials.'` — the same string the Next.js login
    // form shows, so both apps display identical copy.
    SpyneApp.registerChannel(
      new ChannelFetch('CHANNEL_ACME_AUTH', {
        url: `${apiBase}/auth/login`,
        method: 'POST',
        pause: true,
      }),
    );

    SpyneApp.registerChannel(
      new ChannelFetch('CHANNEL_ACME_CARDS', {
        url: `${apiBase}/cards`,
        pause: true,
      }),
    );

    SpyneApp.registerChannel(
      new ChannelFetch('CHANNEL_ACME_INVOICES', {
        url: `${apiBase}/invoices`,
        pause: true,
      }),
    );

    SpyneApp.registerChannel(
      new ChannelFetch('CHANNEL_ACME_CUSTOMERS', {
        url: `${apiBase}/customers`,
        pause: true,
      }),
    );

    // Create / update / delete. A validation failure returns 400 with the same
    // { errors, message } shape the Next.js server action returns, so the two
    // forms render identical validation text.
    SpyneApp.registerChannel(
      new ChannelFetch('CHANNEL_ACME_MUTATION', {
        url: `${apiBase}/invoices`,
        pause: true,
      }),
    );
  }
}
