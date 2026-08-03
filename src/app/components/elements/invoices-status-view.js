import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { getInvoiceStatusClass } from 'utils/acme-invoice-utils.js';
import InvoicesStatusTmpl from './templates/invoices-status-view.tmpl.html';

/**
 * Converted from app/ui/invoices/status.tsx.
 *
 * The source uses clsx for the pill colour and two ternaries for the contents.
 * DomElementTemplate has no conditional expressions by design, so the decision
 * is made here and the template receives a resolved shape: exactly one of
 * `isPending` / `isPaid` is present, and the object-section renders only that
 * branch. Nothing in the template has to know what a status is.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {'pending'|'paid'} props.data.status
 */
export class InvoicesStatusView extends ViewStream {
  constructor(props = {}) {
    const status = props.data?.status === 'paid' ? 'paid' : 'pending';

    props.tagName = 'span';
    // Shared with the bulk row template, so a single pill and a table of pills
    // cannot drift apart.
    props.class = getInvoiceStatusClass(status);
    props.template = InvoicesStatusTmpl;
    props.data = {
      ...props.data,
      ...(status === 'paid'
        ? { isPaid: { svgCheck: withClass('check', 'ml-1 w-4 text-white') } }
        : {
            isPending: {
              svgClock: withClass('clock', 'ml-1 w-4 text-gray-500'),
            },
          }),
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
