import { ViewStream } from 'spyne';
import InvoicesPaginationContainerTmpl from './templates/invoices-pagination-container.tmpl.html';

/**
 * Converted from the Pagination export in app/ui/invoices/pagination.tsx.
 *
 * Container only. The left/right arrows and the numbered pages are
 * InvoicesPaginationArrowView / InvoicesPaginationNumberView instances mounted
 * into the slots — composition happens at the ViewStream level.
 *
 * The source computes the page list with generatePagination(currentPage,
 * totalPages) and the current page from the URL. Both are data-shaping done by
 * whatever mounts this, not markup.
 */
export class InvoicesPaginationContainer extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'inline-flex';
    props.template = InvoicesPaginationContainerTmpl;

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
