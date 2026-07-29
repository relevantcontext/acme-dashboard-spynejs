import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import InvoicesStatusTmpl from './templates/invoices-status-view.tmpl.html';

const PILL_BASE = 'inline-flex items-center rounded-full px-2 py-1 text-xs';

const PILL_BY_STATUS = {
  pending: 'bg-gray-100 text-gray-500',
  paid: 'bg-green-500 text-white',
};

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
 * @param {'pending'|'paid'} props.status
 */
export class InvoicesStatusView extends ViewStream {
  constructor(props = {}) {
    const status = props.status === 'paid' ? 'paid' : 'pending';

    props.tagName = 'span';
    props.class = `${PILL_BASE} ${PILL_BY_STATUS[status]}`;
    props.template = InvoicesStatusTmpl;
    props.data =
      status === 'paid'
        ? { isPaid: { svgCheck: withClass('check', 'ml-1 w-4 text-white') } }
        : {
            isPending: {
              svgClock: withClass('clock', 'ml-1 w-4 text-gray-500'),
            },
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
