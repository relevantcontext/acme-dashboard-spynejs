import { SpyneTrait } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { getInvoiceStatusClass } from 'utils/acme-invoice-utils.js';

// Built once at module load, exactly like the table's ROW_ICONS — the same two
// strings for the life of the app, referenced by every repaint.
const STATUS_ICONS = {
  svgClock: withClass('clock', 'ml-1 w-4 text-gray-500'),
  svgCheck: withClass('check', 'ml-1 w-4 text-white'),
};

/**
 * The status pill of one invoice row.
 *
 * The pill is a broadcast-declared toggle button; clicking it never touches
 * this trait. The click rides CHANNEL_UI to ChannelAcmeData, which applies the
 * flip to the held dump and republishes; ChannelAcmeInvoices conforms the
 * change into a per-invoice STATUS_EVENT; and THAT is what lands here, admitted
 * by this row's own-id filter. Optimistic apply, server rollback and an
 * authoritative refresh all repaint by this one path — the pill renders
 * whatever the channel last said this invoice's status is, and holds no state
 * of its own. [live-mirror-via-el$] [recognize-own-emission]
 */
export class InvoicesItemStatusTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'invoicesItemStatus$';
    super(context, traitPrefix);
  }

  static invoicesItemStatus$OnStatus(e) {
    const status = e?.payload?.invoiceStatus;

    if (status !== 'paid' && status !== 'pending') return;

    const btn = this.props.el$('.ii-status button').el;

    if (btn == null) return;

    // Same markup the template's isPaid/isPending sections render, so a
    // repainted pill and a freshly minted one are indistinguishable.
    btn.className = getInvoiceStatusClass(status);
    btn.innerHTML =
      status === 'paid'
        ? `Paid${STATUS_ICONS.svgCheck}`
        : `Pending${STATUS_ICONS.svgClock}`;
  }
}
