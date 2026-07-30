import { ViewStream } from 'spyne';
import CustomersTableRowTmpl from './templates/customers-table-row-view.tmpl.html';

/**
 * One desktop row of app/ui/customers/table.tsx.
 *
 * `totalPending` and `totalPaid` arrive already currency-formatted — the
 * fetchFilteredCustomers query formats them, matching the API tier, so the
 * template receives display strings.
 *
 * The source's `group` class plus group-first/last rounding is on the <tr>, so
 * it lives on props.class here.
 *
 * @param {Object} props
 * @param {String} props.name
 * @param {String} props.email
 * @param {String|Number} props.totalInvoices
 * @param {String} props.totalPending   formatted
 * @param {String} props.totalPaid      formatted
 * @param {String} props.imageUrl
 */
export class CustomersTableRowView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'tr';
    props.class = 'group';
    props.template = CustomersTableRowTmpl;
    props.data = {
      name: props.name || '',
      email: props.email || '',
      totalInvoices: String(props.totalInvoices ?? ''),
      totalPending: props.totalPending || '',
      totalPaid: props.totalPaid || '',
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
