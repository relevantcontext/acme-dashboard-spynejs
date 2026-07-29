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
 * `data-acme-action` selects the trait method; `data-id` is read off the
 * payload by acmeApi$DeleteInvoice.
 *
 * @param {Object} props
 * @param {String} props.id  invoice id
 */
export class InvoicesDeleteButtonView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'button';
    props.type = 'button';
    props.class = 'rounded-md border p-2 hover:bg-gray-100';
    props.dataset = {
      eventType: 'acmeApi',
      acmeAction: 'DeleteInvoice',
      id: props.id,
    };
    props.template = InvoicesDeleteButtonTmpl;
    props.data = {
      label: 'Delete',
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
