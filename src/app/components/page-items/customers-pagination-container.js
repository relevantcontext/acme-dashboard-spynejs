import { ViewStream } from 'spyne';
import CustomersPaginationContainerTmpl from './templates/customers-pagination-container.tmpl.html';
import { PaginationTraits } from 'traits/ui/pagination-traits.js';
import { CustomersPaginationViewTraits } from 'traits/customers/customers-pagination-view-traits.js';
import { ITEMS_PER_PAGE } from 'utils/acme-invoice-utils.js';

/**
 * Persistent pagination controller for the customers page.
 *
 * Unlike the invoices twin, this holds no page of its own between emissions:
 * the page lives in the URL. UI controls request a page through CHANNEL_UI,
 * ChannelAcmeCustomers turns the request into a params write, and the
 * resulting LIST emission — whose payload carries the resolved pageNumber —
 * is the only thing that moves the local PaginationTraits state.
 * [query-params-as-route-state]
 */
export class CustomersPaginationContainer extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'inline-flex';
    props.template = CustomersPaginationContainerTmpl;
    props.channels = ['CHANNEL_ACME_CUSTOMERS'];
    props.traits = [PaginationTraits, CustomersPaginationViewTraits];
    props.paginationConfig = PaginationTraits.pagination$NormalizeConfig({
      itemsPerPage: props.data?.itemsPerPage ?? ITEMS_PER_PAGE,
      maxPageNumbers: props.data?.maxPageNumbers ?? 7,
      siblingCount: props.data?.siblingCount ?? 1,
      boundaryCount: props.data?.boundaryCount ?? 1,
    });
    props.paginationItems = [];
    props.paginationState = PaginationTraits.pagination$CreateInitialState(
      props.paginationConfig,
    );

    super(props);
  }

  addActionListeners() {
    return [
      ['CHANNEL_ACME_CUSTOMERS_LIST_EVENT', 'customersPagination$OnList'],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
