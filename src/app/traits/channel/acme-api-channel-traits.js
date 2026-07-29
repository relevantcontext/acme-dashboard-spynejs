import { SpyneTrait, ChannelPayloadFilter } from 'spyne';

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
    const map = [
      ['CHANNEL_ACME_SESSION', 'CHANNEL_ACME_API_SESSION_EVENT'],
      ['CHANNEL_ACME_AUTH', 'CHANNEL_ACME_API_AUTH_EVENT'],
      ['CHANNEL_ACME_CARDS', 'CHANNEL_ACME_API_CARDS_EVENT'],
      ['CHANNEL_ACME_INVOICES', 'CHANNEL_ACME_API_INVOICES_EVENT'],
      ['CHANNEL_ACME_CUSTOMERS', 'CHANNEL_ACME_API_CUSTOMERS_EVENT'],
      ['CHANNEL_ACME_MUTATION', 'CHANNEL_ACME_API_MUTATION_EVENT'],
    ];

    map.forEach(([channelName, action]) => {
      this.getChannel(channelName).subscribe((e) =>
        this.acmeApi$OnFetchReturned(e, action),
      );
    });
  }

  /**
   * UI events arrive through CHANNEL_UI, which is fed by each ViewStream's
   * broadcastEvents — never by a manual addEventListener.
   *
   * The convention for markup is a pair of data attributes:
   *
   *   data-event-type="acmeApi"          routes the event here
   *   data-acme-action="fetchInvoices"   selects the method below
   *
   * Anything else on the element (data-query, data-page, data-id) is read off
   * the payload by the individual request methods.
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
  }

  // ── Inbound: UI -> request ────────────────────────────────────────────────

  static acmeApi$OnUiEvent(e) {
    const { acmeAction } = e.payload;
    const method = `acmeApi$${acmeAction}`;

    if (typeof this[method] !== 'function') {
      console.warn(
        `Spyne Warning: ChannelAcmeApi received an unmapped acmeAction, "${acmeAction}"`,
      );
      return;
    }

    this[method](e.payload, e);
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

  static acmeApi$FetchCards() {
    this.acmeApi$SendToChannel('CHANNEL_ACME_CARDS', {
      url: '/api/cards',
    });
  }

  static acmeApi$FetchInvoices(payload = {}) {
    const { query = '', page = 1 } = payload;
    const url = `/api/invoices?query=${encodeURIComponent(query)}&page=${page}`;

    this.acmeApi$SendToChannel('CHANNEL_ACME_INVOICES', { url });
  }

  static acmeApi$FetchCustomers(payload = {}) {
    const { query = '' } = payload;

    this.acmeApi$SendToChannel('CHANNEL_ACME_CUSTOMERS', {
      url: `/api/customers?query=${encodeURIComponent(query)}`,
    });
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

  // ── Mutations ─────────────────────────────────────────────────────────────

  static acmeApi$CreateInvoice(payload = {}) {
    const { customerId, amount, status } = payload;

    this.acmeApi$SendToChannel(
      'CHANNEL_ACME_MUTATION',
      this.acmeApi$JsonRequest('/api/invoices', 'POST', {
        customerId,
        amount,
        status,
      }),
    );
  }

  static acmeApi$UpdateInvoice(payload = {}) {
    const { id, customerId, amount, status } = payload;

    this.acmeApi$SendToChannel(
      'CHANNEL_ACME_MUTATION',
      this.acmeApi$JsonRequest(`/api/invoices/${id}`, 'PUT', {
        customerId,
        amount,
        status,
      }),
    );
  }

  static acmeApi$DeleteInvoice(payload = {}) {
    const { id } = payload;

    this.acmeApi$SendToChannel('CHANNEL_ACME_MUTATION', {
      url: `/api/invoices/${id}`,
      method: 'DELETE',
    });
  }

  // ── Inbound: ChannelFetch -> semantic action ──────────────────────────────

  /**
   * ChannelFetch marks failures with isChannelFetchError, which is how a 401 or
   * a 400 validation body is told apart from real response data.
   *
   * Errors are republished on a single CHANNEL_ACME_API_ERROR_EVENT carrying
   * the originating action, so a view can listen once for all failures rather
   * than pairing an error listener to every read.
   */
  static acmeApi$OnFetchReturned(e, action) {
    const payload = e?.payload ?? {};

    if (payload.isChannelFetchError === true) {
      this.sendChannelPayload('CHANNEL_ACME_API_ERROR_EVENT', {
        ...payload,
        sourceAction: action,
        isUnauthenticated: payload.status === 401,
      });
      return;
    }

    this.sendChannelPayload(action, payload);
  }
}
