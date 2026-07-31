import { ViewStream } from 'spyne';
import CustomersCardTmpl from './templates/customers-card-view.tmpl.html';

/**
 * The below-md card of app/ui/customers/table.tsx — the same customer rendered
 * for narrow viewports.
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
export class CustomersCardView extends ViewStream {
  constructor(props = {}) {
    const {
      name = '',
      email = '',
      totalInvoices,
      totalPending = '',
      totalPaid = '',
      imageUrl = '',
    } = props.data || {};

    props.tagName = 'div';
    props.class = 'mb-2 w-full rounded-md bg-white p-4';
    props.template = CustomersCardTmpl;
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
