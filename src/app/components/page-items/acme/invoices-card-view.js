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
 * @param {Object} props.data
 * @param {String} props.data.name
 * @param {String} props.data.email
 * @param {String} props.data.amount     formatted
 * @param {String} props.data.date       formatted
 * @param {String} props.data.imageUrl
 */
export class InvoicesCardView extends ViewStream {
  constructor(props = {}) {
    const {
      name = '',
      email = '',
      amount = '',
      date = '',
      imageUrl = '',
    } = props.data || {};

    props.tagName = 'div';
    props.class = 'mb-2 w-full rounded-md bg-white p-4';
    props.template = InvoicesCardTmpl;
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
