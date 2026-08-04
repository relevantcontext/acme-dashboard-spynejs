import { ViewStream, ChannelPayloadFilter } from 'spyne';
import InvoicesItemTmpl from './templates/invoices-item-view.tmpl.html';

/**
 * One invoice on the current page — the ONLY presentation module. Desktop row
 * and mobile card are the same DOM in two grid layouts; the table toggles
 * `is-card-layout` on the container and CSS relayouts these same nodes.
 * Nothing here re-renders on a breakpoint, and nothing is duplicated.
 *
 * ── Six of these exist, not five hundred ────────────────────────────────────
 *
 * A ViewStream is a subscription, a listener hash, an observable chain and a
 * disposal path, and that cost is per-instance per-emission. The previous
 * design minted one per DATA row — 1,000 live instances at the enterprise
 * fixture, 10,000 at scale — and every channel emission paid ~30µs times that.
 * Instances are minted per VISIBLE row instead; the count is bounded by the
 * page size, whatever the dataset does. [cap-viewstream-instance-count]
 *
 * ── Lifecycle is one declarative line ───────────────────────────────────────
 *
 * The table constructs this view when its id enters the visible page; the
 * filter below disposes it when its id leaves. Presence on the page IS
 * existence — a paged-away row, a filtered-out row and a deleted row are the
 * same event here, absence from visibleIds. [dispose-by-predicate-filter]
 *
 * No skip-first, and not as an oversight: the channel replays, but the
 * replayed birth payload is the very list that named this id, so the not-mine
 * predicate rejects it by construction. The filter subsumes
 * [skip-replayed-birth-event] for any child whose predicate is its own
 * identity.
 *
 * @param {Object} props
 * @param {Object} props.data  one entry from buildInvoiceRows
 */
export class InvoicesItemView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'invoice-item';
    props.role = 'row';
    props.dataset = { invoiceId: props.data?.attrInvoiceId };
    props.template = InvoicesItemTmpl;
    props.channels = ['CHANNEL_ACME_INVOICES'];

    super(props);
  }

  addActionListeners() {
    // Admits only payloads whose visible set EXCLUDES this invoice — so the
    // handler can be bare disposeViewStream, and a payload without a list
    // (or with this id on it) never reaches it.
    const visibleSetExcludesMe = new ChannelPayloadFilter({
      payload: (payload) => {
        const visibleIds = payload?.visibleIds;

        return (
          Array.isArray(visibleIds) === true &&
          visibleIds.includes(this.props.data?.attrInvoiceId) === false
        );
      },
    });

    return [
      [
        'CHANNEL_ACME_INVOICES_VISIBLE_IDS_EVENT',
        'disposeViewStream',
        visibleSetExcludesMe,
      ],
    ];
  }

  broadcastEvents() {
    // Scoped to this item's own root: the edit anchor and the delete button.
    // Each carries its own invoiceId, which is what reaches the channel as the
    // payload. [dataset-as-payload]
    return [
      ['a', 'click'],
      ['button', 'click'],
    ];
  }

  onRendered() {}
}
