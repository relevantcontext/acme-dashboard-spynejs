import { SpyneTrait } from 'spyne';

/**
 * The one lookup table for every Acme request.
 *
 * There is a single ChannelFetch — CHANNEL_ACME_ENDPOINTS — behind all reads and
 * writes. This table is what tells one request apart from another: the key is
 * the `data-btn-type` on the element that raised the UI event, and the entry
 * supplies both halves of the round trip.
 *
 * ── Why the conformer travels WITH the request ───────────────────────────────
 *
 * A response cannot be identified after the fact. ChannelFetch builds its
 * success payload from the channel's *constructor* props:
 *
 *   createChannelPayloadItem(payload, action) {
 *     const { name, sendCachedPayload, url } = this.props   // <- constructor url
 *
 * Per-request `url` overrides are merged for the fetch itself but never written
 * back to `this.props`, so once one channel serves every endpoint, every success
 * payload reports the same URL and carries nothing else to key on. (Error
 * payloads are the exception — they are built from the real request metadata and
 * do carry the requested url.)
 *
 * `mapFn` is one of the keys ChannelFetch picks off the request payload:
 *
 *   pick(['mapFn', 'url', 'header', 'headers', 'body', 'mode', 'method',
 *         'responseType', 'debug'], dataObj)
 *
 * So each entry ships its own conformer, which stamps a `dataKey` onto the
 * response. The subscriber then needs no branching on where a payload came
 * from — it reads `dataKey` and routes on that.
 *
 * ── Reads ────────────────────────────────────────────────────────────────────
 *
 * There is exactly one read: `bootstrap`. Everything the client renders arrives
 * in that single response and is cached in SpyneAppProperties by
 * AcmeDataStateTraits. Searching and pagination filter the cached data rather
 * than returning to the server, so no per-page read exists here by design.
 *
 * A successful mutation invalidates the cache, and the channel re-requests
 * `bootstrap` rather than patching individual slices — the server stays the one
 * authority on what the data is.
 */

const jsonBody = (body) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/**
 * Stamps the response so the subscriber can route it. This is the function that
 * rides along on the request as `mapFn`.
 */
const tag = (dataKey) => (data) => ({ dataKey, data });

export const ACME_ENDPOINTS = {
  // The whole data dump. Requested once on authentication, and again after any
  // successful mutation.
  bootstrap: {
    toRequest: () => ({ url: '/api/bootstrap' }),
    mapFn: tag('bootstrap'),
  },

  // ── Mutations ─────────────────────────────────────────────────────────────
  //
  // `delete-invoice` needs only the id, which the button carries as data-id, so
  // its UI payload is complete on its own.
  //
  // `create-invoice` and `update-invoice` need the form's field values, and a
  // button's dataset cannot carry those. Those two are raised by the form's
  // submit event and the fields are collected before the payload reaches here —
  // the same path FormLoginTraits already uses for the credentials.
  'create-invoice': {
    toRequest: ({ customerId, amount, status }) => ({
      url: '/api/invoices',
      method: 'POST',
      ...jsonBody({ customerId, amount, status }),
    }),
    mapFn: tag('mutation'),
  },

  'update-invoice': {
    toRequest: ({ id, customerId, amount, status }) => ({
      url: `/api/invoices/${id}`,
      method: 'PUT',
      ...jsonBody({ customerId, amount, status }),
    }),
    mapFn: tag('mutation'),
  },

  'delete-invoice': {
    toRequest: ({ id }) => ({
      url: `/api/invoices/${id}`,
      method: 'DELETE',
    }),
    mapFn: tag('mutation'),
  },
};

export class AcmeEndpointsTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'acmeEndpoints$';
    super(context, traitPrefix);
  }

  /**
   * Turns a btnType plus the UI payload into the fetch configuration for
   * CHANNEL_ACME_ENDPOINTS.
   *
   * @param {String} btnType  key into ACME_ENDPOINTS
   * @param {Object} payload  the CHANNEL_UI payload — the raising element's full
   *                          dataset, plus any fields collected from a form
   * @returns {Object|null}   fetch props, or null when btnType is unknown
   */
  static acmeEndpoints$Resolve(btnType, payload = {}) {
    const endpoint = ACME_ENDPOINTS[btnType];

    if (endpoint === undefined) {
      console.warn(
        `Spyne Warning: ChannelAcmeApi received an unmapped btnType, "${btnType}"`,
      );
      return null;
    }

    return {
      ...endpoint.toRequest(payload),
      mapFn: endpoint.mapFn,
    };
  }
}
