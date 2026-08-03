import { SpyneTrait } from 'spyne';
import { InvoicesPaginationItemsView } from 'components/elements/invoices-pagination-items-view.js';

const ITEMS_SELECTOR = '[data-slot="pagination-items"]';

/**
 * Invoice-specific adapter around the reusable PaginationTraits state machine.
 * It translates invoice channel events into local transitions and publishes the
 * visible-id result back through the channel boundary.
 */
export class InvoicesPaginationViewTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'invoicesPagination$');
  }

  static invoicesPagination$OnList(e) {
    const matchedIds = e?.payload?.matchedIds;

    if (Array.isArray(matchedIds) === false) return;

    const state = this.pagination$SetItems(matchedIds);
    this.invoicesPagination$RenderAndPublish(state);
  }

  /**
   * Controls never invoke this method directly. Their UI request first crosses
   * ChannelAcmeInvoices; only its declared PAGINATION_EVENT authorizes the
   * local transition.
   */
  static invoicesPagination$OnPagination(e) {
    const pageNumber = e?.payload?.pageNumber;

    const state = this.pagination$SetCurrentPageNumber(pageNumber);

    this.invoicesPagination$RenderAndPublish(state);
  }

  static invoicesPagination$RenderAndPublish(state) {
    this.props.el$().toggleClass('hidden', state.hidePagination);

    if (state.hidePagination === false) {
      this.appendView(
        new InvoicesPaginationItemsView({ data: { items: state.items } }),
        ITEMS_SELECTOR,
      );
    }

    const { visibleIds } = state;

    this.sendInfoToChannel(
      'CHANNEL_ACME_INVOICES',
      {
        visibleIds,
        firstVisibleId: visibleIds[0] ?? null,
        lastVisibleId: visibleIds[visibleIds.length - 1] ?? null,
      },
      'CHANNEL_ACME_INVOICES_VISIBLE_IDS_EVENT',
    );
  }
}
