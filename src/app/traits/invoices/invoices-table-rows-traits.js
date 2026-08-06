import { SpyneTrait } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { buildInvoiceRows } from 'utils/acme-invoice-utils.js';
import { InvoicesItemView } from 'components/elements/invoices-item-view.js';

const ITEMS_SELECTOR = '[data-slot="invoice-items"]';

/**
 * The four icons every item needs, built ONCE at module load. Items reference
 * these; they do not rebuild them. (Passing them once at the ROOT of the
 * template data does not work — outer-scope keys do not reach inside a
 * section; see buildInvoiceRows.)
 */
const ROW_ICONS = {
  svgClock: withClass('clock', 'ml-1 w-4 text-gray-500'),
  svgCheck: withClass('check', 'ml-1 w-4 text-white'),
  svgPencil: withClass('pencil', 'w-5'),
  svgTrash: withClass('trash', 'w-5'),
};

/**
 * The invoices table: minting the VISIBLE page, not the dataset.
 *
 * ── The split with the item views ───────────────────────────────────────────
 *
 * The table owns set-level work: which ids are on the page, in what order, and
 * which layout the container is in. An item owns exactly one fact — whether
 * the current page still includes it — and acts on that fact by disposing,
 * because a parent never holds a child reference, so disposal can only
 * originate in the child. Birth here, death there.
 *
 * ── Why there is no visibility pass anymore ─────────────────────────────────
 *
 * The previous design rendered every invoice once and treated the page as an
 * is-hidden sweep. That capped out exactly as the instance-count operation
 * predicts, and it also forced first/last-visible to be computed in JS,
 * because :first-child counts hidden children. With only the visible page in
 * the DOM, positional CSS is simply CORRECT again — the container rounds its
 * own corners and :last-of-type drops the final border. Existence equals
 * visibility, and a whole layer of machinery goes with it.
 */
export class InvoicesTableRowsTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'invoicesTableRows$';
    super(context, traitPrefix);
  }

  /**
   * The resolved page arrives: visibleIds in display order, plus the display
   * mode riding the payload (complete state — a replayed payload must carry
   * everything a late-born table needs).
   *
   * Held rather than acted on directly: on a cold mount the replayed payload
   * lands before onRendered has produced an element to build into. Whichever
   * of the two runs second does the work.
   */
  static invoicesTableRows$OnVisibleIds(e, props = this.props) {
    props.listPayload = e?.payload ?? null;

    this.invoicesTableRows$SyncItems();
  }

  /**
   * A live breakpoint crossing while the table is mounted. Same class, same
   * CSS; the six items relayout without a single re-render.
   */
  static invoicesTableRows$OnDisplayMode(e) {
    this.invoicesTableRows$ApplyLayout(e?.payload?.isMobile === true);
  }

  /**
   * A landed dump. The map every future row is minted from is rebuilt so it
   * always reflects the channel's current truth, then the page is re-synced —
   * within one data emission this listener runs AFTER the invoices channel's
   * synchronous LIST -> pagination -> VISIBLE_IDS chain (it subscribed later),
   * so the second SyncItems pass here is what builds any row the fresh
   * VISIBLE_IDS named that the stale map could not supply (a just-created
   * invoice entering the page).
   *
   * Existing row DOM is deliberately untouched: a changed status repaints via
   * STATUS_EVENT, a departed id disposes via the row's own filter, and every
   * other content change reaches a mounted table only through navigation,
   * which rebuilds it.
   */
  static invoicesTableRows$OnAcmeData(e, props = this.props) {
    const invoices = e?.payload?.data?.invoices;

    if (Array.isArray(invoices) === false) return;

    props.invoiceById = new Map(
      buildInvoiceRows(invoices, ROW_ICONS).map((row) => [
        String(row.attrInvoiceId),
        row,
      ]),
    );

    this.invoicesTableRows$SyncItems();
  }

  static invoicesTableRows$ApplyLayout(isMobile) {
    this.props.el$().toggleClass('is-card-layout', isMobile === true);
  }

  /**
   * Paints the active column and direction onto the header. aria-sort is the
   * single authority: the trait sets it from the payload, and the CSS renders
   * the arrow from the attribute — no second flag to fall out of step, and
   * assistive tech reads the same fact the arrow shows. [live-mirror-via-el$]
   */
  static invoicesTableRows$ApplySortIndicator(sortKey, sortDir) {
    // The columnheader spans, addressed by the data-sort-col fact they carry.
    // The empty-string selector this previously used resolves to the view
    // ROOT (cxt + ' ' + '' trims back to the root selector), so aria-sort was
    // stamped onto the table root and the header indicator never painted.
    this.props.el$('[data-sort-col]').els.forEach((el) => {
      const isActive = el.dataset.sortCol === sortKey;
      const ariaSort = isActive
        ? sortDir === 'desc'
          ? 'descending'
          : 'ascending'
        : 'none';

      el.setAttribute('aria-sort', ariaSort);
    });
  }

  /**
   * Reconciles the DOM against the visible page.
   *
   * Survivors persist — a delete disposes one item and pulls one in; the other
   * five are untouched. The table finds what already exists by querying its
   * own region rather than holding references [address-region-by-el$], builds
   * only the missing ids from the dump it was constructed with, and then walks
   * visibleIds appending each element in order. appendChild MOVES a node that
   * is already a child, so that one pass is both the insertion and the sort —
   * newcomers can land BETWEEN survivors (a narrowed search interleaves new
   * matches with old), and an ordering that trusted append-at-end would be
   * silently wrong exactly there.
   */
  static invoicesTableRows$SyncItems(props = this.props) {
    const payload = props.listPayload;

    if (props.el == null || payload == null) return;

    const visibleIds = payload.visibleIds || [];

    this.invoicesTableRows$ApplyLayout(payload.isMobile === true);
    this.invoicesTableRows$ApplySortIndicator(
      payload.sortKey ?? null,
      payload.sortDir ?? null,
    );

    const container = props.el$(ITEMS_SELECTOR).el;
    if (container == null) return;

    // The item ROOTS inside the region — the elements whose data-invoice-id
    // answers "which rows already exist". The truncated `${ITEMS_SELECTOR} `
    // selector this previously used trims back to the CONTAINER itself, whose
    // dataset has no invoiceId, so existingIds was always {undefined}: every
    // sync re-minted every visible row, and each data refresh (a status
    // toggle, a mutation's authoritative refetch) DUPLICATED the whole page
    // of rows in place.
    const existingIds = new Set(
      props
        .el$(`${ITEMS_SELECTOR} .invoice-item`)
        .els.map((el) => el.dataset.invoiceId),
    );

    // The dump keyed by id. Seeded lazily from birth data on a cold mount and
    // REBUILT by OnAcmeData whenever a later dump lands, so a row minted after
    // a mutation renders current values. The channel sends ids; the data every
    // item renders from is this map.
    if (props.invoiceById == null) {
      props.invoiceById = new Map(
        buildInvoiceRows(props.data?.acmeData?.invoices || [], ROW_ICONS).map(
          (row) => [String(row.attrInvoiceId), row],
        ),
      );
    }

    visibleIds.forEach((id) => {
      if (existingIds.has(String(id)) === true) return;

      const data = props.invoiceById.get(String(id));
      if (data == null) return;

      this.appendView(new InvoicesItemView({ data }), ITEMS_SELECTOR);
    });

    // One ordering pass over at most a page of nodes. Items disposed by their
    // own filter may still be mid-teardown on this same emission; moving only
    // the ids the payload names sidesteps any ordering with the dying.
    visibleIds.forEach((id) => {
      const el = container.querySelector(`[data-invoice-id="${id}"]`);
      if (el != null) container.appendChild(el);
    });
  }
}
