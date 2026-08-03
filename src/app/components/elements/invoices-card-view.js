import { ViewStream } from 'spyne';
import { InvoicesTableRowsTraits } from 'traits/invoices/invoices-table-rows-traits.js';
import InvoicesCardTmpl from './templates/invoices-card-view.tmpl.html';

/**
 * The below-md card of app/ui/invoices/table.tsx — the same invoice rendered
 * for narrow viewports.
 *
 * Slots: [data-slot="status"] for InvoicesStatusView, [data-slot="card-actions"]
 * for the update/delete buttons.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {String} props.data.name
 * @param {String} props.data.email
 * @param {String} props.data.amount     formatted
 * @param {String} props.data.date       formatted
 * @param {String} props.data.imageUrl
 */
export class InvoicesCardView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'invoice-card mb-2 w-full rounded-md bg-white p-4';
    props.dataset = { invoiceId: props.data?.attrInvoiceId };
    props.template = InvoicesCardTmpl;
    props.channels = ['CHANNEL_ACME_INVOICES'];
    props.traits = [InvoicesTableRowsTraits];

    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_ACME_INVOICES_LIST_EVENT', 'invoicesTableRows$OnRowList']];
  }

  broadcastEvents() {
    return [
      ['a', 'click'],
      ['button', 'click'],
    ];
  }

  onRendered() {}
}
