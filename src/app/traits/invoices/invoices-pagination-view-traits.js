import { SpyneTrait } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { InvoicesPaginationItemsView } from 'components/elements/invoices-pagination-items-view.js';

const ITEMS_SELECTOR = '[data-slot="pagination-items"]';

const ARROW_BASE =
  'flex h-10 w-10 items-center justify-center rounded-md border';
const NUMBER_BASE = 'flex h-10 w-10 items-center justify-center text-sm border';
const ELLIPSIS_CLASS =
  'flex h-10 w-10 items-center justify-center border text-sm text-gray-300';

// Built once at module load, not per control: withClass does string work and
// both arrows are the same two strings for the life of the app.
const SVG_ARROW = Object.freeze({
  previous: withClass('arrowLeft', 'w-4'),
  next: withClass('arrowRight', 'w-4'),
});

/**
 * Invoice-specific adapter around the reusable PaginationTraits state machine.
 * It translates invoice channel events into local transitions, shapes the
 * resulting state for the control template, and publishes the visible-id result
 * back through the channel boundary.
 *
 * The shaping half was PaginationViewFactoryTraits, which existed to construct
 * one ViewStream per control. Those controls are template sections now, so what
 * remains is a pure map from semantic descriptors to template-ready data — a
 * few lines beside the transitions that produce them, rather than a module.
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

  // ── Shaping ───────────────────────────────────────────────────────────────

  /**
   * An arrow, resolved to one of two element variants.
   *
   * The tag differs — a disabled arrow is an inert div, an enabled one is a
   * button carrying the page request — and DomElementTemplate has no dynamic
   * tag names by design. So the decision is made here and exactly one of the
   * two keys is present, letting the template emit the matching element.
   * [conditional-via-object-section]
   */
  static invoicesPagination$ShapeArrow(item) {
    const { type, pageNumber, isDisabled } = item;
    const gutter = type === 'previous' ? 'mr-2 md:mr-4' : 'ml-2 md:ml-4';
    const state = isDisabled
      ? 'pointer-events-none text-gray-300'
      : 'hover:bg-gray-100';

    const shape = {
      attrClass: `${ARROW_BASE} ${state} ${gutter}`,
      attrAriaLabel: `${type} page`,
      svgArrow: SVG_ARROW[type],
      attrPageNumber: pageNumber,
    };

    const key = `${type === 'previous' ? 'prev' : 'next'}${isDisabled ? 'Disabled' : 'Link'}`;

    return { [key]: shape };
  }

  static invoicesPagination$ShapePage(item) {
    const { pageNumber, position, isCurrent } = item;
    const edges = [
      position === 'first' || position === 'single' ? 'rounded-l-md' : '',
      position === 'last' || position === 'single' ? 'rounded-r-md' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const state = isCurrent
      ? 'z-10 bg-blue-600 border-blue-600 text-white'
      : 'hover:bg-gray-100';

    const shape = {
      attrClass: `${NUMBER_BASE} ${edges} ${state}`.replace(/\s+/g, ' ').trim(),
      attrAriaLabel: `page ${pageNumber}`,
      attrPageNumber: pageNumber,
      pageNumber: String(pageNumber ?? ''),
    };

    return isCurrent ? { isCurrent: shape } : { isLink: shape };
  }

  /**
   * The control row as one template-ready object: the two arrows at the root,
   * the numbers and ellipses as an array the template iterates.
   *
   * Each entry carries everything its section needs. Nothing is read from an
   * outer scope, because measured behaviour is that outer-scope keys do not
   * reach inside a section — see buildInvoiceRows for what was tested.
   */
  static invoicesPagination$ShapeItems(items = []) {
    const shaped = { pages: [] };

    items.forEach((item) => {
      if (item.type === 'previous' || item.type === 'next') {
        Object.assign(
          shaped,
          InvoicesPaginationViewTraits.invoicesPagination$ShapeArrow(item),
        );
        return;
      }

      if (item.type === 'ellipsis') {
        shaped.pages.push({ isEllipsis: { attrClass: ELLIPSIS_CLASS } });
        return;
      }

      shaped.pages.push(
        InvoicesPaginationViewTraits.invoicesPagination$ShapePage(item),
      );
    });

    return shaped;
  }

  // ── Outbound ──────────────────────────────────────────────────────────────

  static invoicesPagination$RenderAndPublish(state) {
    this.props.el$().toggleClass('hidden', state.hidePagination);

    if (state.hidePagination === false) {
      this.appendView(
        new InvoicesPaginationItemsView({
          data: InvoicesPaginationViewTraits.invoicesPagination$ShapeItems(
            state.items,
          ),
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
