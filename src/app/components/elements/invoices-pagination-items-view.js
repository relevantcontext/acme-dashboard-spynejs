import { ViewStream } from 'spyne';
import { PaginationViewFactoryTraits } from 'traits/ui/pagination-view-factory-traits.js';
import InvoicesPaginationItemsTmpl from './templates/invoices-pagination-items-view.tmpl.html';

/**
 * One rendered pagination-state subtree.
 *
 * It skips the replayed event that created it, then disposes on the next list or
 * channel-confirmed page transition. The persistent container only adds; each
 * replaced child terminates itself. [single-active-child]
 */
export class InvoicesPaginationItemsView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'inline-flex';
    props.template = InvoicesPaginationItemsTmpl;
    props.channels = [['CHANNEL_ACME_INVOICES', true]];
    props.traits = [PaginationViewFactoryTraits];

    super(props);
  }

  addActionListeners() {
    return [
      ['CHANNEL_ACME_INVOICES_LIST_EVENT', 'disposeViewStream'],
      ['CHANNEL_ACME_INVOICES_PAGINATION_EVENT', 'disposeViewStream'],
    ];
  }

  broadcastEvents() {
    // Child controls exist by the end of onRendered, before Spyne initializes
    // this declared broadcaster, so one lifecycle-owned declaration binds all
    // enabled buttons in the freshly built subtree.
    return [['button', 'click']];
  }

  onRendered() {
    this.paginationViewFactory$Render();
  }
}
