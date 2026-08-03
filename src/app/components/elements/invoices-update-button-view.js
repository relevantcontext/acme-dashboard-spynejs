import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import InvoicesUpdateButtonTmpl from './templates/invoices-update-button-view.tmpl.html';

/**
 * Converted from the UpdateInvoice export in app/ui/invoices/buttons.tsx.
 *
 * Same ROUTE-config caveat as the create button: the edit path is not yet
 * defined in the app's route config, which is authored through the App Builder.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {String} props.data.id  invoice id
 */
export class InvoicesUpdateButtonView extends ViewStream {
  constructor(props = {}) {
    // Read off props.data, not props: `props.id` is ViewStream's element id, so
    // the invoice id used to land on the anchor as a DOM id.
    const { id = '' } = props.data || {};

    props.tagName = 'a';
    props.class = 'rounded-md border p-2 hover:bg-gray-100';
    props.href = `/dashboard/invoices/${id}/edit`;
    props.dataset = {
      channel: 'ROUTE',
      pageId: 'dashboard',
      topicId: 'invoices',
      invoiceId: id,
      eventPreventDefault: 'true',
    };
    props.template = InvoicesUpdateButtonTmpl;
    props.data = {
      ...props.data,
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
