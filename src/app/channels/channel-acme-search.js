import { Channel } from 'spyne';
import { AcmeSearchChannelTraits } from 'traits/db/db-search-channel-traits.js';

/**
 * The global quick-search: overlay lifecycle and cross-collection matching.
 *
 * Separate from the invoices and customers channels because it answers a
 * different question. Those resolve what the current URL asks for; this one
 * resolves what the user is typing into the palette, across both collections
 * at once, with no URL involvement until a result is activated.
 * [mint-channel-vs-ride-existing]
 *
 * ── No replay ───────────────────────────────────────────────────────────────
 *
 * Deliberate, and the exception among the Acme channels: OPEN/CLOSE/RESULTS
 * are ephemeral events. The overlay is born from OPEN and starts blank; a
 * replayed payload from a previous open would hand it stale state it must not
 * have. Because there is no replay, the overlay and its rows need no
 * skip-first. [choose-replay-semantics]
 *
 * All behaviour lives in AcmeSearchChannelTraits — this class is structure and
 * event flow only.
 */
export class ChannelAcmeSearch extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_ACME_SEARCH';
    props.traits = [AcmeSearchChannelTraits];
    super(name, props);
  }

  onRegistered() {
    this.acmeSearch$OnRegistered();
  }

  addRegisteredActions() {
    return [
      // The transient-host appends the overlay on OPEN; the overlay disposes
      // itself on CLOSE. Every close path — Escape, Cmd/Ctrl-K toggle,
      // backdrop, the dismiss button, any route change — emits the same CLOSE.
      'CHANNEL_ACME_SEARCH_OPEN_EVENT',
      'CHANNEL_ACME_SEARCH_CLOSE_EVENT',

      // The current match, both groups, complete per emission. Rows dispose
      // by their own negative filter on this action.
      'CHANNEL_ACME_SEARCH_RESULTS_EVENT',

      // An instruction to write the invoices query param, consumed only by
      // AcmeQueryParamsNullView — the same loop the invoices channel's own
      // UPDATE_PARAMS travels.
      'CHANNEL_ACME_SEARCH_UPDATE_INVOICE_PARAMS_EVENT',

      // Transmitted by the overlay when Enter activates a customer row.
      'CHANNEL_ACME_SEARCH_SELECT_EVENT',
    ];
  }

  onViewStreamInfo(e) {
    this.acmeSearch$OnViewStreamInfo(e);
  }
}
