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
 * @param {Object} props.data
 * @param {String} props.data.name
 * @param {String} props.data.email
 * @param {String|Number} props.data.totalInvoices
 * @param {String} props.data.totalPending   formatted
 * @param {String} props.data.totalPaid      formatted
 * @param {String} props.data.imageUrl
 */
export class CustomersTableRowView extends ViewStream {
  constructor(props = {}) {
    const {
      name = '',
      email = '',
      totalInvoices,
      totalPending = '',
      totalPaid = '',
      imageUrl = '',
    } = props.data || {};

    props.tagName = 'tr';
    props.class = 'group';
    props.template = CustomersTableRowTmpl;
    props.data = {
      ...props.data,
      name,
      email,
      totalInvoices: String(totalInvoices ?? ''),
      totalPending,
      totalPaid,
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
