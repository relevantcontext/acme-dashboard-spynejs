import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import InvoicesPaginationArrowTmpl from './templates/invoices-pagination-arrow-view.tmpl.html';

const BASE = 'flex h-10 w-10 items-center justify-center rounded-md border';

/**
 * A left/right arrow of app/ui/invoices/pagination.tsx (the PaginationArrow
 * inner component).
 *
 * Disabled arrows are inert divs. Enabled arrows are buttons whose dataset
 * requests an invoice pagination transition; they never mutate pagination
 * state themselves.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {'previous'|'next'} props.data.type
 * @param {Number|null} props.data.pageNumber
 * @param {Boolean} [props.data.isDisabled]
 */
export class InvoicesPaginationArrowView extends ViewStream {
  constructor(props = {}) {
    const { type, pageNumber, isDisabled } = props.data || {};
    const direction = type === 'previous' ? 'left' : 'right';

    const classes = [BASE];
    if (isDisabled) classes.push('pointer-events-none text-gray-300');
    else classes.push('hover:bg-gray-100');
    classes.push(direction === 'left' ? 'mr-2 md:mr-4' : 'ml-2 md:ml-4');

    props.tagName = isDisabled ? 'div' : 'button';
    if (props.tagName === 'button') props.type = 'button';
    props.class = classes.join(' ');
    props['aria-label'] = `${type} page`;
    props.dataset = isDisabled
      ? {}
      : {
          eventType: 'acmeInvoices',
          btnType: 'pagination',
          pageNumber,
        };
    props.template = InvoicesPaginationArrowTmpl;
    props.data = {
      ...props.data,
      svgArrow: withClass(
        direction === 'left' ? 'arrowLeft' : 'arrowRight',
        'w-4',
      ),
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
