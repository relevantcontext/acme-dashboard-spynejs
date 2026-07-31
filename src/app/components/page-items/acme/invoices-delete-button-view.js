import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import InvoicesDeleteButtonTmpl from './templates/invoices-delete-button-view.tmpl.html';

/**
 * Converted from the DeleteInvoice export in app/ui/invoices/buttons.tsx.
 *
 * The source wraps a submit button in a <form> whose action is the
 * `deleteInvoice` server action bound to the id. There is no server action to
 * bind to here, so the button broadcasts to CHANNEL_UI and ChannelAcmeApi
 * issues the DELETE — which also means no form element is needed.
 *
 * `data-btn-type` selects the ACME_ENDPOINTS entry; `data-id` rides along on the
 * same payload, since CHANNEL_UI reports the raising element's whole dataset.
 * Delete is the one mutation that needs no form — the id is the entire request.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {String} props.data.id  invoice id
 */
export class InvoicesDeleteButtonView extends ViewStream {
  constructor(props = {}) {
    // Read off props.data, not props: `props.id` is ViewStream's element id, so
    // the invoice id used to land on the button as a DOM id.
    const { id = '', label = 'Delete' } = props.data || {};

    props.tagName = 'button';
    props.type = 'button';
    props.class = 'rounded-md border p-2 hover:bg-gray-100';
    props.dataset = {
      eventType: 'acmeApi',
      btnType: 'delete-invoice',
      id,
    };
    props.template = InvoicesDeleteButtonTmpl;
    props.data = {
      ...props.data,
      label,
      svgTrash: withClass('trash', 'w-5'),
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
