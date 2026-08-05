import { ViewStream, ChannelPayloadFilter } from 'spyne';
import InvoicesItemTmpl from './templates/invoices-item-view.tmpl.html';
import { InvoicesItemStatusTraits } from 'traits/invoices/invoices-item-status-traits.js';
import { InvoicesItemEditTraits } from 'traits/invoices/invoices-item-edit-traits.js';

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
    // A row born with an unsaved draft (paging back to an edited invoice)
    // carries the marker from birth — the same class OnCells toggles live.
    props.class =
      props.data?.isEdited === true ? 'invoice-item is-edited' : 'invoice-item';
    props.role = 'row';
    props.dataset = { invoiceId: props.data?.attrInvoiceId };
    props.template = InvoicesItemTmpl;
    props.channels = ['CHANNEL_ACME_INVOICES', 'CHANNEL_ACME_EDIT_SESSION'];
    props.traits = [InvoicesItemStatusTraits, InvoicesItemEditTraits];

    // The raw editable values this row is SHOWING — what an in-place editor
    // seeds from. Kept current by every CELLS repaint.
    props.cellValues = {
      rawAmount: props.data?.rawAmount,
      rawDate: props.data?.rawDate,
      status: props.data?.status,
    };

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

    // The self-scope idiom: the channel fans STATUS_EVENT to every row, and
    // each row reclaims only its own invoice by the id it was born with.
    // [admit-by-payload-filter] [recognize-own-emission]
    const statusIsMine = new ChannelPayloadFilter({
      invoiceId: String(this.props.data?.attrInvoiceId),
    });

    // Reused for every per-invoice action this row reclaims as its own.
    const cellsAreMine = new ChannelPayloadFilter({
      invoiceId: String(this.props.data?.attrInvoiceId),
    });

    return [
      [
        'CHANNEL_ACME_INVOICES_VISIBLE_IDS_EVENT',
        'disposeViewStream',
        visibleSetExcludesMe,
      ],
      [
        'CHANNEL_ACME_INVOICES_STATUS_EVENT',
        'invoicesItemStatus$OnStatus',
        statusIsMine,
      ],
      // The unsaved-edit overlay moved for THIS invoice — repaint cells,
      // pill and the edited marker. Same self-scope idiom as STATUS.
      [
        'CHANNEL_ACME_INVOICES_CELLS_EVENT',
        'invoicesItemEdit$OnCells',
        cellsAreMine,
      ],
      // Cursor and selection are UNFILTERED on purpose: every row reacts —
      // the named one paints, the rest clear. That mutual clearing is what
      // keeps the cursor single without any row referencing another.
      ['CHANNEL_ACME_EDIT_SESSION_CURSOR_EVENT', 'invoicesItemEdit$OnCursor'],
      [
        'CHANNEL_ACME_EDIT_SESSION_SELECTION_EVENT',
        'invoicesItemEdit$OnSelection',
      ],
      [
        'CHANNEL_ACME_EDIT_SESSION_EDIT_START_EVENT',
        'invoicesItemEdit$OnEditStart',
        cellsAreMine,
      ],
      [
        'CHANNEL_ACME_EDIT_SESSION_EDIT_END_EVENT',
        'invoicesItemEdit$OnEditEnd',
        cellsAreMine,
      ],
    ];
  }

  broadcastEvents() {
    // Scoped to this item's own root: the edit anchor, the delete/toggle
    // buttons, and the three editable cells (whose datasets carry the field
    // and invoice id the table's cursor logic routes on). [dataset-as-payload]
    return [
      ['a', 'click'],
      ['button', 'click'],
      ['.ii-cell', 'click'],
    ];
  }

  onRendered() {}
}
