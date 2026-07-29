import { ViewStream } from 'spyne';
import InvoiceCardTmpl from './templates/invoice-card.tmpl.html';

/**
 * The below-md card of app/ui/invoices/table.tsx — the same invoice rendered
 * for narrow viewports.
 *
 * Slots: [data-slot="status"] for InvoiceStatusView, [data-slot="card-actions"]
 * for the update/delete buttons.
 *
 * @param {Object} props
 * @param {String} props.name
 * @param {String} props.email
 * @param {String} props.amount     formatted
 * @param {String} props.date       formatted
 * @param {String} props.imageUrl
 */
export class InvoiceCardView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'mb-2 w-full rounded-md bg-white p-4';
    props.template = InvoiceCardTmpl;
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
