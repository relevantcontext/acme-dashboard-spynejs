import { SpyneTrait } from 'spyne';
import { shapePaginationControlItems } from 'utils/acme-pagination-controls.js';
import { CustomersPaginationItemsView } from 'components/elements/customers-pagination-items-view.js';

const ITEMS_SELECTOR = '[data-slot="pagination-items"]';

/**
 * Customer-specific adapter around the reusable PaginationTraits state machine.
 *
 * Thinner than the invoices adapter, deliberately: the customers page keeps its
 * page in the URL, so there is no local page transition to authorize and no
 * PAGINATION_EVENT. A control's click crosses ChannelAcmeCustomers, which
 * answers with an UPDATE_PARAMS instruction; the query-params null view writes
 * the URL and announces it; the channel re-reads the URL and emits a fresh
 * LIST whose payload carries the resolved pageNumber. Every emission is
 * therefore complete state — a keystroke, a page click, a bookmark and a
 * back/forward step all arrive HERE by the same path, indistinguishable.
 * [query-params-as-route-state]
 *
 * That also makes the invoices adapter's isDataRefresh split unnecessary: a
 * live data tick re-reads the same URL, so the current page holds by
 * construction rather than by a flag.
 *
 * The shaping lives in utils/acme-pagination-controls.js, shared with the
 * invoices adapter so the two control rows cannot drift apart.
 * [shape-data-for-logicless-template]
 */
export class CustomersPaginationViewTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'customersPagination$');
  }

  static customersPagination$OnList(e) {
    const matchedIds = e?.payload?.matchedIds;

    if (Array.isArray(matchedIds) === false) return;

    // SetItems replaces the collection; SetCurrentPageNumber then selects the
    // URL's page. An over-range page (stale bookmark, shrunken match set)
    // clamps to the last real page inside pagination$CreateState.
    this.pagination$SetItems(matchedIds);
    const state = this.pagination$SetCurrentPageNumber(
      e?.payload?.pageNumber ?? 1,
    );

    this.customersPagination$RenderAndPublish(state);
  }

  // ── Outbound ──────────────────────────────────────────────────────────────

  static customersPagination$RenderAndPublish(state) {
    this.props.el$().toggleClass('hidden', state.hidePagination);

    if (state.hidePagination === false) {
      this.appendView(
        new CustomersPaginationItemsView({
          data: shapePaginationControlItems(state.items),
        }),
        ITEMS_SELECTOR,
      );
    }

    // The page slice returns through the channel boundary — the table is a
    // separate view and can only hear this as a relayed channel action.
    this.sendInfoToChannel(
      'CHANNEL_ACME_CUSTOMERS',
      { visibleIds: state.visibleIds },
      'CHANNEL_ACME_CUSTOMERS_VISIBLE_IDS_EVENT',
    );
  }
}
