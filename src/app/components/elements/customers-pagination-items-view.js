import { ViewStream } from 'spyne';
import CustomersPaginationItemsTmpl from './templates/customers-pagination-items-view.tmpl.html';

/**
 * One rendered pagination-state subtree for the customers page: both arrows,
 * the numbers and any ellipses, in a single template.
 *
 * The customers twin of InvoicesPaginationItemsView — a separate class because
 * the two connections it declares are domain facts: its buttons broadcast
 * eventType `acmeCustomers`, and its life is bounded by the customers
 * channel's LIST emission. See that view for why the controls are markup and
 * why a static binding over changing content is safe here.
 * [mint-module-by-declared-connection]
 *
 * Only LIST ends its life — the customers page has no PAGINATION_EVENT,
 * because a page click travels through the URL and returns AS a LIST. Each
 * transition therefore disposes this instance and the adapter renders a fresh
 * one, which is what lets broadcastEvents bind once at render.
 * [single-active-child] [skip-replayed-birth-event]
 *
 * The data arrives template-ready from shapePaginationControlItems — exactly
 * one of `isCurrent` / `isLink` / `isEllipsis` is present per entry, so the
 * template needs no conditional syntax it does not have.
 * [shape-data-for-logicless-template] [conditional-via-object-section]
 */
export class CustomersPaginationItemsView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'inline-flex';
    props.template = CustomersPaginationItemsTmpl;
    props.channels = [['CHANNEL_ACME_CUSTOMERS', true]];

    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_ACME_CUSTOMERS_LIST_EVENT', 'disposeViewStream']];
  }

  broadcastEvents() {
    // Every enabled control in this subtree, bound once at render. Disabled
    // arrows and the current page render as divs by construction, so they
    // cannot be matched and need no guard.
    return [['button', 'click']];
  }

  onRendered() {}
}
