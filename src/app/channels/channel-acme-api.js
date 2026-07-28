import { ChannelFetch, SpyneApp } from 'spyne';

/**
 * Channels for the Acme API tier.
 *
 * The SpyneJS app cannot talk to Postgres directly — a browser cannot speak the
 * Postgres wire protocol, and shipping the connection string to the client would
 * hand the database to anyone with devtools. So the data path is:
 *
 *   ViewStream -> ChannelFetch -> /api (dev-server proxy) -> Node tier -> Postgres
 *
 * Every URL below is same-origin. The webpack dev server proxies /api to
 * 127.0.0.1:8090, so the page only ever sees https://localhost:8443 — no
 * mixed-content block, and no CORS layer to maintain.
 *
 * ── How to use these from a ViewStream ──────────────────────────────────────
 *
 * Listen for data (in a ViewStream):
 *
 *   props.channels = ['CHANNEL_ACME_CARDS'];
 *   // then
 *   onChannelAcmeCardsEvent(payload) {
 *     const { numberOfInvoices, totalPaidInvoices } = payload.data;
 *   }
 *
 * Trigger a (re)fetch, or drive a paused channel — from a ViewStream:
 *
 *   this.sendInfoToChannel('CHANNEL_ACME_INVOICES_REQUEST_EVENT', {
 *     url: '/api/invoices?query=delba&page=1',
 *   });
 *
 * Every instance publishes on two actions:
 *   {NAME}_RESPONSE_EVENT — success
 *   {NAME}_ERROR_EVENT    — network failure, non-OK status, or unparseable body
 *
 * The error payload is flat and filterable: isChannelFetchError, errorType,
 * status, statusText, url, message.
 *
 * NOTE: only ONE listener per action name per ViewStream — a duplicate
 * registration clobbers the first.
 */

export const API_BASE = '/api';

/**
 * Mutations (POST / PUT / DELETE).
 *
 * Paused, because a mutation must never fire just because the channel was
 * registered. Drive it by sending the request event with the url, method and
 * body for the operation:
 *
 *   this.sendInfoToChannel('CHANNEL_ACME_MUTATION_REQUEST_EVENT', {
 *     url: '/api/invoices',
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ customerId, amount, status }),
 *   });
 *
 * A validation failure comes back as a 400, which ChannelFetch routes to
 * CHANNEL_ACME_MUTATION_ERROR_EVENT. The API tier returns the same
 * { errors: { customerId, amount, status }, message } shape the Next.js server
 * action returns, so both apps render identical validation copy.
 */
const mutationChannel = () =>
  new ChannelFetch('CHANNEL_ACME_MUTATION', {
    url: `${API_BASE}/invoices`,
    pause: true,
  });

/**
 * Auth.
 *
 * Login is paused — it must never fire on registration. Drive it with the
 * credentials from the form:
 *
 *   this.sendInfoToChannel('CHANNEL_ACME_AUTH_REQUEST_EVENT', {
 *     url: '/api/auth/login',
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ email, password }),
 *   });
 *
 * A bad credential returns 401, which arrives on
 * CHANNEL_ACME_AUTH_ERROR_EVENT with `message: 'Invalid credentials.'` — the
 * same string the Next.js login form shows. Sign out by sending the same
 * request event with url '/api/auth/logout'.
 *
 * The session lives in a signed, httpOnly cookie, so it is deliberately NOT
 * readable from here. Ask the server who you are via CHANNEL_ACME_SESSION,
 * which returns { user } or { user: null }.
 *
 * Every data channel above requires that session — without it they return 401
 * on their *_ERROR_EVENT action.
 */
const authChannels = () => [
  new ChannelFetch('CHANNEL_ACME_AUTH', {
    url: `${API_BASE}/auth/login`,
    pause: true,
    method: 'POST',
  }),
  new ChannelFetch('CHANNEL_ACME_SESSION', {
    url: `${API_BASE}/auth/session`,
  }),
];

export const registerAcmeApiChannels = () => {
  authChannels().forEach((c) => SpyneApp.registerChannel(c));

  // Dashboard summary cards. Paused: this endpoint now requires a session, so
  // firing on registration would just produce a 401 before anyone has logged
  // in. Request it once the session channel reports a user.
  SpyneApp.registerChannel(
    new ChannelFetch('CHANNEL_ACME_CARDS', {
      url: `${API_BASE}/cards`,
      pause: true,
    }),
  );

  // Paused: these need a query string, so let the view ask for what it wants
  // rather than firing a default request nothing is listening for yet.
  SpyneApp.registerChannel(
    new ChannelFetch('CHANNEL_ACME_INVOICES', {
      url: `${API_BASE}/invoices`,
      pause: true,
    }),
  );

  SpyneApp.registerChannel(
    new ChannelFetch('CHANNEL_ACME_CUSTOMERS', {
      url: `${API_BASE}/customers`,
      pause: true,
    }),
  );

  SpyneApp.registerChannel(mutationChannel());
};
