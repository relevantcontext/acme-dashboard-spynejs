import { Channel } from 'spyne';
import { AcmeInvoicesChannelTraits } from 'traits/channel/acme-invoices-channel-traits.js';

/**
 * Search and pagination for the invoices table.
 *
 * Separate from CHANNEL_ACME_DATA because the two answer different questions.
 * That channel holds what the server said; this one resolves what the current
 * URL asks for out of it. Neither needs the other's job.
 *
 * ── window.location is the state ────────────────────────────────────────────
 *
 * This channel holds no `query` and no `page`. It emits an instruction that
 * InvoicesTableView applies to the URL, then learns the result through
 * CHANNEL_WINDOW like any other observer. A bookmark, a back button and a
 * keystroke therefore arrive by one path and are indistinguishable — which is
 * the reason the write lives in the view rather than here.
 *
 * ── replay ─────────────────────────────────────────────────────────────────
 *
 * True: this is a current-value channel. The list is whatever the URL currently
 * resolves to, so a view mounting later needs the value, not the next change.
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

      // The resolved page: rows for this query and page, the page count for
      // this query, and the ellipsis-aware page sequence. Finished — a view
      // renders it without computing anything.
      'CHANNEL_ACME_INVOICES_LIST_EVENT',
    ];
  }

  onViewStreamInfo() {}
}
