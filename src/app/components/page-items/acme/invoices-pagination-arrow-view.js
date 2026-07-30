import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import InvoicesPaginationArrowTmpl from './templates/invoices-pagination-arrow-view.tmpl.html';

const BASE = 'flex h-10 w-10 items-center justify-center rounded-md border';

/**
 * A left/right arrow of app/ui/invoices/pagination.tsx (the PaginationArrow
 * inner component).
 *
 * Like the number cell, the source renders a <div> when disabled and an <a>
 * otherwise; props.tagName follows. Direction selects both the icon and the
 * margin class.
 *
 * @param {Object} props
 * @param {'left'|'right'} props.direction
 * @param {String} [props.href]
 * @param {Boolean} [props.isDisabled]
 */
export class InvoicesPaginationArrowView extends ViewStream {
  constructor(props = {}) {
    const { direction, isDisabled } = props;

    const classes = [BASE];
    if (isDisabled) classes.push('pointer-events-none text-gray-300');
    else classes.push('hover:bg-gray-100');
    classes.push(direction === 'left' ? 'mr-2 md:mr-4' : 'ml-2 md:ml-4');

    props.tagName = isDisabled ? 'div' : 'a';
    if (props.tagName === 'a') props.href = props.href || '';
    props.class = classes.join(' ');
    props.template = InvoicesPaginationArrowTmpl;
    props.data = {
      svgArrow: withClass(direction === 'left' ? 'arrowLeft' : 'arrowRight', 'w-4'),
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
