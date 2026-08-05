import { SpyneTrait } from 'spyne';
import { shapePaginationControlItems } from 'utils/acme-pagination-controls.js';
import { InvoicesPaginationItemsView } from 'components/elements/invoices-pagination-items-view.js';

const ITEMS_SELECTOR = '[data-slot="pagination-items"]';

/**
 * Invoice-specific adapter around the reusable PaginationTraits state machine.
 * It translates invoice channel events into local transitions, shapes the
 * resulting state for the control template, and publishes the visible-id result
 * back through the channel boundary.
 *
 * The shaping half was PaginationViewFactoryTraits, which existed to construct
 * one ViewStream per control. Those controls are template sections now, and the
 * pure map from semantic descriptors to template-ready data lives in
 * utils/acme-pagination-controls.js — shared with the customers adapter, so the
 * two pages' control rows cannot drift apart.
 * [mint-module-by-declared-connection] [shape-data-for-logicless-template]
 */
export class InvoicesPaginationViewTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'invoicesPagination$');
  }

  static invoicesPagination$OnList(e) {
    const matchedIds = e?.payload?.matchedIds;

    if (Array.isArray(matchedIds) === false) return;

    // A data refresh (create/edit/delete/toggle landed) holds the current
    // page — a toggle on page five must not throw the user back to page one.
    // A changed VIEW of the data (search/sort/route) restarts at page one,
    // exactly as before.
    const state =
      e?.payload?.isDataRefresh === true
        ? this.pagination$SyncItems(matchedIds)
        : this.pagination$SetItems(matchedIds);

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

  // ── Outbound ──────────────────────────────────────────────────────────────

  static invoicesPagination$RenderAndPublish(state) {
    this.props.el$().toggleClass('hidden', state.hidePagination);

    if (state.hidePagination === false) {
      this.appendView(
        new InvoicesPaginationItemsView({
          data: shapePaginationControlItems(state.items),
        }),
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
