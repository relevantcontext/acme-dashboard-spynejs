import { ViewStream } from 'spyne';
import InvoicesCardTmpl from './templates/invoices-card-view.tmpl.html';

/**
 * The below-md card of app/ui/invoices/table.tsx — the same invoice rendered
 * for narrow viewports.
 *
 * Slots: [data-slot="status"] for InvoicesStatusView, [data-slot="card-actions"]
 * for the update/delete buttons.
 *
 * @param {Object} props
 * @param {String} props.name
 * @param {String} props.email
 * @param {String} props.amount     formatted
 * @param {String} props.date       formatted
 * @param {String} props.imageUrl
 */
export class InvoicesCardView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'mb-2 w-full rounded-md bg-white p-4';
    props.template = InvoicesCardTmpl;
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
