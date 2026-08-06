import { Channel } from 'spyne';
import { AcmeQuickSearchChannelTraits } from 'traits/search/quick-search-channel-traits.js';

/**
 * The global quick-search palette: Cmd/Ctrl-K from anywhere in the signed-in
 * app, searching customers AND invoices out of the held dump.
 *
 * A separate channel because it answers a different question from the two
 * domain channels: they resolve what the current URL asks for; this resolves
 * what the user is asking about RIGHT NOW, without touching the URL. The
 * overlay is ephemeral UI state — deliberately not window.location, unlike the
 * list pages, so opening the palette never pollutes history or the shareable
 * address.
 *
 * ── Replay ──────────────────────────────────────────────────────────────────
 *
 * True, matching the app's current-value channels: the persistent overlay is
 * born before any emission, but a payload replayed to any later subscriber is
 * complete state (open flag, query, rendered groups, highlight), per the
 * complete-state rule. HIGHLIGHT is the one narrow exception — documented in
 * the traits — because moving a bar must not rebuild dozens of rows.
 *
 * All behaviour lives in AcmeQuickSearchChannelTraits — this class is
 * structure and event flow only.
 */
export class ChannelAcmeQuickSearch extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_ACME_QUICK_SEARCH';
    props.replay = true;
    props.traits = [AcmeQuickSearchChannelTraits];
    super(name, props);
  }

  onRegistered() {
    this.acmeQuickSearch$OnRegistered();
  }

  addRegisteredActions() {
    return [
      // Overlay paint: OPEN and RESULTS carry the full match set; CLOSE ends
      // the session; HIGHLIGHT moves the keyboard bar without a re-render.
      'CHANNEL_ACME_QUICK_SEARCH_OPEN_EVENT',
      'CHANNEL_ACME_QUICK_SEARCH_CLOSE_EVENT',
      'CHANNEL_ACME_QUICK_SEARCH_RESULTS_EVENT',
      'CHANNEL_ACME_QUICK_SEARCH_HIGHLIGHT_EVENT',

      // Activation instructions, consumed by the overlay view's relay — a
      // Channel cannot sendInfoToChannel, so the view forwards each one to the
      // domain channel that owns the behaviour (data: toggle; invoices: edit
      // navigation and the customer→filtered-invoices navigation).
      'CHANNEL_ACME_QUICK_SEARCH_TOGGLE_STATUS_EVENT',
      'CHANNEL_ACME_QUICK_SEARCH_EDIT_INVOICE_EVENT',
      'CHANNEL_ACME_QUICK_SEARCH_CUSTOMER_INVOICES_EVENT',
    ];
  }
}
