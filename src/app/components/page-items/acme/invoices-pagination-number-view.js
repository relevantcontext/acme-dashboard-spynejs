import { ViewStream } from 'spyne';
import InvoicesPaginationNumberTmpl from './templates/invoices-pagination-number-view.tmpl.html';

const BASE = 'flex h-10 w-10 items-center justify-center text-sm border';

/**
 * One numbered page of app/ui/invoices/pagination.tsx (the PaginationNumber
 * inner component).
 *
 * Two things the template cannot express, resolved here:
 *
 *   - tagName. The source renders a <div> when the page isActive or is the
 *     '...' ellipsis (position 'middle'), and an <a> otherwise. props.tagName is
 *     set accordingly, so a non-navigating cell is genuinely not a link.
 *
 *   - class. The source's clsx keys off position (first/last/single rounding),
 *     isActive (filled blue) and middle (muted, no hover). Composed into
 *     props.class.
 *
 * @param {Object} props
 * @param {String|Number} props.page
 * @param {String} [props.href]
 * @param {Boolean} [props.isActive]
 * @param {'first'|'last'|'middle'|'single'} [props.position]
 */
export class InvoicesPaginationNumberView extends ViewStream {
  constructor(props = {}) {
    const { position, isActive } = props;
    const isMiddle = position === 'middle';

    const classes = [BASE];
    if (position === 'first' || position === 'single') classes.push('rounded-l-md');
    if (position === 'last' || position === 'single') classes.push('rounded-r-md');
    if (isActive) classes.push('z-10 bg-blue-600 border-blue-600 text-white');
    if (!isActive && !isMiddle) classes.push('hover:bg-gray-100');
    if (isMiddle) classes.push('text-gray-300');

    // A link only when it navigates; a div when active or the ellipsis.
    props.tagName = isActive || isMiddle ? 'div' : 'a';
    if (props.tagName === 'a') props.href = props.href || '';
    props.class = classes.join(' ');
    props.template = InvoicesPaginationNumberTmpl;
    props.data = { page: String(props.page ?? '') };

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
