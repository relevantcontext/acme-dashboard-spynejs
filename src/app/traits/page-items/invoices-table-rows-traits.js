import { SpyneTrait } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import { buildInvoiceRows } from 'traits/utils/acme-invoice-utils.js';
import { InvoicesTableRowView } from 'components/page-items/acme/invoices-table-row-view.js';

const ROWS_SELECTOR = '[data-slot="invoice-rows"]';

/**
 * The four icons every row needs, built ONCE at module load.
 *
 * withClass() does string work, so calling it per row would repeat the same
 * four results for the length of the table. Rows reference these; they do not
 * rebuild them. (Passing them once at the ROOT of the template data does not
 * work — see buildInvoiceRows for what was measured.)
 */
const ROW_ICONS = {
  svgClock: withClass('clock', 'ml-1 w-4 text-gray-500'),
  svgCheck: withClass('check', 'ml-1 w-4 text-white'),
  svgPencil: withClass('pencil', 'w-5'),
  svgTrash: withClass('trash', 'w-5'),
};

/**
 * The invoices table's rows: building them once, then showing the current page.
 *
 * ── Every invoice is rendered, once ─────────────────────────────────────────
 *
 * Search and pagination are a VISIBILITY pass over rows that already exist, not
 * a re-render. next-learn re-queries SQL per keystroke and per page click and
 * renders only the six rows it asked for; here the whole set is in hand, so a
 * keystroke costs a loop over twelve elements and no DOM construction at all.
 *
 * This is only safe because the set arrives ordered date DESC from SQL — hiding
 * rows never reorders the ones left, so the visible sequence always matches the
 * page next-learn would have rendered.
 *
 * ── Why the table owns this and the rows do not ─────────────────────────────
 *
 * A row could subscribe and hide itself. It could not work out that it is the
 * FIRST VISIBLE row, because that is a fact about the set, and the rounded
 * corners depend on it. One subscriber holding the whole set beats twelve
 * subscribers that each need the others' answers. Rows keep what is genuinely
 * theirs — their own two controls. [wiring-surface-only-on-viewstream]
 */
export class InvoicesTableRowsTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'invoicesTableRows$';
    super(context, traitPrefix);
  }

  /**
   * Builds one row view per invoice, from the full dump handed down at
   * construction — not from the channel. The channel decides what is VISIBLE;
   * the page decides what EXISTS.
   *
   * The element list is cached because it is walked on every keystroke, and it
   * is scoped to the tbody: an unscoped `tr` also matches the `<thead>` row, and
   * the first thing the visibility pass would hide is the column headings.
   */
  static invoicesTableRows$RenderRows(props = this.props) {
    const invoices = props.data?.acmeData?.invoices || [];

    buildInvoiceRows(invoices, ROW_ICONS).forEach((data) => {
      this.appendView(new InvoicesTableRowView({ data }), ROWS_SELECTOR);
    });

    props.invoiceEls$ = props.el$(`${ROWS_SELECTOR} tr`).els;

    // The list may already have arrived — see the note on ordering below.
    this.invoicesTableRows$ApplyVisibility();
  }

  /**
   * The resolved page, arriving finished from the channel: which invoice ids are
   * on it, in order.
   *
   * The payload is kept rather than acted on directly, because this fires BEFORE
   * the rows exist on a cold mount. CHANNEL_ACME_INVOICES replays, so the
   * subscription made in the constructor delivers the current list immediately,
   * while onRendered — and therefore the rows — is still to come. Holding the
   * payload lets whichever happens second do the work.
   */
  static invoicesTableRows$OnList(e, props = this.props) {
    props.listPayload = e?.payload ?? null;

    this.invoicesTableRows$ApplyVisibility();
  }

  /**
   * Shows the current page and marks its visible edges.
   *
   * `pageIds` is the channel's answer — already filtered by the query and sliced
   * to the page — so this is a Set membership test per row rather than a search.
   *
   * `is-first` / `is-last` exist because CSS cannot express "first visible":
   * :first-child counts DOM children, and the hidden rows are still children.
   */
  static invoicesTableRows$ApplyVisibility(props = this.props) {
    const els = props.invoiceEls$;
    const payload = props.listPayload;

    if (!els || !payload) return;

    const pageIds = payload.pageIds || [];
    const onThisPage = new Set(pageIds);
    const firstId = pageIds[0];
    const lastId = pageIds[pageIds.length - 1];

    els.forEach((el) => {
      const { invoiceId } = el.dataset;

      el.classList.toggle('is-hidden', onThisPage.has(invoiceId) === false);
      el.classList.toggle('is-first', invoiceId === firstId);
      el.classList.toggle('is-last', invoiceId === lastId);
    });
  }
}
