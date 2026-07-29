import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import InvoicesUpdateButtonTmpl from './templates/invoices-update-button-view.tmpl.html';

/**
 * Converted from the UpdateInvoice export in app/ui/invoices/buttons.tsx.
 *
 * Same ROUTE-config caveat as the create button: the edit path is not yet
 * defined in the app's route config, which is authored through the App Builder.
 *
 * @param {Object} props
 * @param {String} props.id  invoice id
 */
export class InvoicesUpdateButtonView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'a';
    props.class = 'rounded-md border p-2 hover:bg-gray-100';
    props.href = `/dashboard/invoices/${props.id}/edit`;
    props.dataset = {
      channel: 'ROUTE',
      pageId: 'dashboard',
      topicId: 'invoices',
      invoiceId: props.id,
      eventPreventDefault: 'true',
    };
    props.template = InvoicesUpdateButtonTmpl;
    props.data = {
      svgPencil: withClass('pencil', 'w-5'),
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
