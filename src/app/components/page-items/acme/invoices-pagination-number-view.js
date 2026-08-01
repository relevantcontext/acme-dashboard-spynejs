import { ViewStream } from 'spyne';
import InvoicesPaginationNumberTmpl from './templates/invoices-pagination-number-view.tmpl.html';

const BASE = 'flex h-10 w-10 items-center justify-center text-sm border';

/**
 * One numbered page of app/ui/invoices/pagination.tsx (the PaginationNumber
 * inner component).
 *
 * A current page is inert; every other number is a button carrying a page
 * request. Ellipses have their own ViewStream and never enter this component.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {Number} props.data.pageNumber
 * @param {Boolean} [props.data.isCurrent]
 * @param {'first'|'last'|'middle'|'single'} [props.data.position]
 */
export class InvoicesPaginationNumberView extends ViewStream {
  constructor(props = {}) {
    const { pageNumber, position, isCurrent } = props.data || {};

    const classes = [BASE];
    if (position === 'first' || position === 'single')
      classes.push('rounded-l-md');
    if (position === 'last' || position === 'single')
      classes.push('rounded-r-md');
    if (isCurrent) classes.push('z-10 bg-blue-600 border-blue-600 text-white');
    else classes.push('hover:bg-gray-100');

    props.tagName = isCurrent ? 'div' : 'button';
    if (props.tagName === 'button') props.type = 'button';
    props.class = classes.join(' ');
    if (isCurrent) props['aria-current'] = 'page';
    props['aria-label'] = `page ${pageNumber}`;
    props.dataset = isCurrent
      ? {}
      : {
          eventType: 'acmeInvoices',
          btnType: 'pagination',
          pageNumber,
        };
    props.template = InvoicesPaginationNumberTmpl;
    props.data = { ...props.data, pageNumber: String(pageNumber ?? '') };

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
