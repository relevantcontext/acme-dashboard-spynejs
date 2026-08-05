import { ViewStream, ChannelPayloadFilter } from 'spyne';
import QuickSearchInvoiceItemTmpl from './templates/quick-search-invoice-item-view.tmpl.html';
import { InvoicesItemStatusTraits } from 'traits/invoices/invoices-item-status-traits.js';

/**
 * One matched invoice in the quick-search overlay.
 *
 * The row's two controls are the SAME datasets the invoices table's rows
 * carry, so both ride the paths that already exist end to end:
 *
 *   edit anchor    eventType acmeInvoices / btnType edit — the invoices
 *                  channel emits EDIT_EVENT and navigates; the overlay closes
 *                  on the resulting route change.
 *   status toggle  eventType acmeData / btnType toggle-invoice-status — the
 *                  optimistic apply, rollback and refresh all repaint the pill
 *                  through STATUS_EVENT, admitted by this row's own-id filter
 *                  via the same InvoicesItemStatusTraits the table rows use
 *                  (the template keeps the trait's `.ii-status button` shape).
 *
 * Lifecycle is the negative filter below: a RESULTS emission whose invoice
 * matches exclude this id disposes the row. No skip-first — CHANNEL_ACME_SEARCH
 * does not replay, so the emission that named this row is never re-delivered.
 * Closing the overlay disposes the whole tree, rows included.
 * [dispose-by-predicate-filter]
 *
 * @param {Object} props
 * @param {Object} props.data  one entry from buildInvoiceRows
 */
export class QuickSearchInvoiceItemView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'qs-item qs-invoice-item';
    props.dataset = {
      qsKey: `invoice-${props.data?.attrInvoiceId}`,
      invoiceId: props.data?.attrInvoiceId,
    };
    props.template = QuickSearchInvoiceItemTmpl;
    props.channels = ['CHANNEL_ACME_SEARCH', 'CHANNEL_ACME_INVOICES'];
    props.traits = [InvoicesItemStatusTraits];

    super(props);
  }

  addActionListeners() {
    const matchesExcludeMe = new ChannelPayloadFilter({
      payload: (payload) => {
        const matches = payload?.invoiceMatches;

        return (
          Array.isArray(matches) === true &&
          matches.some(
            ({ id }) => String(id) === String(this.props.data?.attrInvoiceId),
          ) === false
        );
      },
    });

    const statusIsMine = new ChannelPayloadFilter({
      invoiceId: String(this.props.data?.attrInvoiceId),
    });

    return [
      [
        'CHANNEL_ACME_SEARCH_RESULTS_EVENT',
        'disposeViewStream',
        matchesExcludeMe,
      ],
      [
        'CHANNEL_ACME_INVOICES_STATUS_EVENT',
        'invoicesItemStatus$OnStatus',
        statusIsMine,
      ],
    ];
  }

  broadcastEvents() {
    return [
      ['a', 'click'],
      ['button', 'click'],
    ];
  }

  onRendered() {}
}
