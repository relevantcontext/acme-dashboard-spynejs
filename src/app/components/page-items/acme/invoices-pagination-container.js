import { ViewStream } from 'spyne';
import InvoicesPaginationContainerTmpl from './templates/invoices-pagination-container.tmpl.html';
import { PaginationTraits } from 'traits/page-items/pagination-traits.js';
import { InvoicesPaginationViewTraits } from 'traits/page-items/invoices-pagination-view-traits.js';
import { ITEMS_PER_PAGE } from 'traits/utils/acme-invoice-utils.js';

/**
 * Persistent pagination controller for the invoices page.
 *
 * Pagination state is local to this ViewStream through PaginationTraits. UI
 * controls request a page through CHANNEL_UI, ChannelAcmeInvoices returns the
 * declared PAGINATION_EVENT, and only that returned action changes local state.
 * The channel routes the message but owns no pagination state or calculation.
 */
export class InvoicesPaginationContainer extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'inline-flex';
    props.template = InvoicesPaginationContainerTmpl;
    props.channels = ['CHANNEL_ACME_INVOICES'];
    props.traits = [PaginationTraits, InvoicesPaginationViewTraits];

    super(props);

    this.pagination$Initialize({
      itemsPerPage: props.data?.itemsPerPage ?? ITEMS_PER_PAGE,
      maxPageNumbers: props.data?.maxPageNumbers ?? 7,
      siblingCount: props.data?.siblingCount ?? 1,
      boundaryCount: props.data?.boundaryCount ?? 1,
    });
  }

  addActionListeners() {
    return [
      ['CHANNEL_ACME_INVOICES_LIST_EVENT', 'invoicesPagination$OnList'],
      [
        'CHANNEL_ACME_INVOICES_PAGINATION_EVENT',
        'invoicesPagination$OnPagination',
      ],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
