import { Channel } from 'spyne';
import { AcmeInvoicesChannelTraits } from 'traits/acme/acme-invoices-channel-traits.js';

/**
 * Invoice matching and the message boundary for pagination requests/results.
 *
 * Separate from CHANNEL_ACME_DATA because the two answer different questions.
 * That channel holds what the server said; this one resolves what the current
 * URL asks for out of it. Neither needs the other's job.
 *
 * ── window.location is search state ─────────────────────────────────────────
 *
 * This channel holds no `query` and no pagination state. It emits a search
 * instruction that InvoicesTableView applies to the URL, then learns the result through
 * CHANNEL_WINDOW like any other observer. A bookmark, a back button and a
 * keystroke therefore arrive by one path and are indistinguishable — which is
 * the reason the write lives in the view rather than here.
 *
 * ── replay ─────────────────────────────────────────────────────────────────
 *
 * True: this is a current-value channel. A view mounting later needs the latest
 * domain or routing result, not merely the next change.
 * [choose-replay-semantics]
 *
 * All behaviour lives in AcmeInvoicesChannelTraits — this class is structure and
 * event flow only.
 */
export class ChannelAcmeInvoices extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_ACME_INVOICES';
    props.replay = true;
    props.traits = [AcmeInvoicesChannelTraits];
    super(name, props);
  }

  onRegistered() {
    this.acmeInvoices$OnRegistered();
  }

  addRegisteredActions() {
    return [
      // An instruction to change the URL, consumed only by InvoicesTableView.
      // Nothing else should act on it — the resulting list arrives on the action
      // below, after the URL has actually moved.
      'CHANNEL_ACME_INVOICES_UPDATE_PARAMS_EVENT',

      // Every invoice id matching the current query, plus the authoritative set.
      'CHANNEL_ACME_INVOICES_LIST_EVENT',
      'CHANNEL_ACME_INVOICES_CREATE_EVENT',
      'CHANNEL_ACME_INVOICES_EDIT_EVENT',
      // A validated response to a pagination control's CHANNEL_UI request.
      'CHANNEL_ACME_INVOICES_PAGINATION_EVENT',
      // A pagination ViewStream result relayed for the isolated table view.
      'CHANNEL_ACME_INVOICES_VISIBLE_IDS_EVENT',
    ];
  }

  onViewStreamInfo(e) {
    this.acmeInvoices$OnViewStreamInfo(e);
  }
}
