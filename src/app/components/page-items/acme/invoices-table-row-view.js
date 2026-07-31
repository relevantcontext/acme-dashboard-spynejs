import { ViewStream } from 'spyne';
import InvoicesTableRowTmpl from './templates/invoices-table-row-view.tmpl.html';

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
 * InvoicesStatusView, [data-slot="row-actions"] for the update/delete buttons.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {String} props.data.name
 * @param {String} props.data.email
 * @param {String} props.data.amount     formatted
 * @param {String} props.data.date       formatted
 * @param {String} props.data.imageUrl
 */
export class InvoicesTableRowView extends ViewStream {
  constructor(props = {}) {
    const {
      name = '',
      email = '',
      amount = '',
      date = '',
      imageUrl = '',
    } = props.data || {};

    props.tagName = 'tr';
    props.class = ROW_CLASS;
    props.template = InvoicesTableRowTmpl;
    props.data = {
      ...props.data,
      name,
      email,
      amount,
      date,
      attrImageSrc: imageUrl,
      attrImageAlt: `${name}'s profile picture`,
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
