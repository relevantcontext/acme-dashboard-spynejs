import { ViewStream } from 'spyne';
import InvoiceTableRowTmpl from './templates/invoice-table-row.tmpl.html';

const ROW_CLASS =
  'w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg';

/**
 * One desktop row of app/ui/invoices/table.tsx.
 *
 * `amount` and `date` arrive already formatted — the source calls
 * formatCurrency and formatDateToLocal inline, and that shaping happens before
 * the template.
 *
 * Two slots hold nested ViewStreams: [data-slot="status"] for
 * InvoiceStatusView, [data-slot="row-actions"] for the update/delete buttons.
 *
 * @param {Object} props
 * @param {String} props.name
 * @param {String} props.email
 * @param {String} props.amount     formatted
 * @param {String} props.date       formatted
 * @param {String} props.imageUrl
 */
export class InvoiceTableRowView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'tr';
    props.class = ROW_CLASS;
    props.template = InvoiceTableRowTmpl;
    props.data = {
      name: props.name || '',
      email: props.email || '',
      amount: props.amount || '',
      date: props.date || '',
      attrImageSrc: props.imageUrl || '',
      attrImageAlt: `${props.name || ''}'s profile picture`,
    };

    super(props);
  }

  addActionListeners() {
    return [];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
