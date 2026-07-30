import { ViewStream } from 'spyne';
import CustomersCardTmpl from './templates/customers-card-view.tmpl.html';

/**
 * The below-md card of app/ui/customers/table.tsx — the same customer rendered
 * for narrow viewports.
 *
 * @param {Object} props
 * @param {String} props.name
 * @param {String} props.email
 * @param {String|Number} props.totalInvoices
 * @param {String} props.totalPending   formatted
 * @param {String} props.totalPaid      formatted
 * @param {String} props.imageUrl
 */
export class CustomersCardView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'mb-2 w-full rounded-md bg-white p-4';
    props.template = CustomersCardTmpl;
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
