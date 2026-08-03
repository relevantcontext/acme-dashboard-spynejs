import { SpyneTrait } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { buildInvoiceRows } from 'utils/acme-invoice-utils.js';
import { InvoicesTableRowView } from 'components/elements/invoices-table-row-view.js';
import { InvoicesCardView } from 'components/elements/invoices-card-view.js';

const ROWS_SELECTOR = '[data-slot="invoice-rows"]';
const CARDS_SELECTOR = '[data-slot="invoice-cards"]';

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
      this.appendView(new InvoicesCardView({ data }), CARDS_SELECTOR);
    });

    props.invoiceEls$ = props.el$(`${ROWS_SELECTOR} tr`).els;
    props.invoiceCardEls$ = props.el$(`${CARDS_SELECTOR} .invoice-card`).els;

    // The list may already have arrived — see the note on ordering below.
    this.invoicesTableRows$ApplyVisibility();
  }

  /**
   * The visible page IDs, calculated by the pagination ViewStream and relayed by
   * the invoices channel.
   *
   * The payload is kept rather than acted on directly, because this fires BEFORE
   * the rows exist on a cold mount. CHANNEL_ACME_INVOICES replays, so the
   * subscription made in the constructor delivers the current list immediately,
   * while onRendered — and therefore the rows — is still to come. Holding the
   * payload lets whichever happens second do the work.
   */
  static invoicesTableRows$OnVisibleIds(e, props = this.props) {
    props.listPayload = e?.payload ?? null;

    this.invoicesTableRows$ApplyVisibility();
  }

  /**
   * Shows the current page and marks its visible edges.
   *
   * `visibleIds` is the paginator's answer — already sliced
   * to the page — so this is a Set membership test per row rather than a search.
   *
   * `is-first` / `is-last` exist because CSS cannot express "first visible":
   * :first-child counts DOM children, and the hidden rows are still children.
   */
  static invoicesTableRows$ApplyVisibility(props = this.props) {
    const payload = props.listPayload;

    if (!props.invoiceEls$ || !payload) return;

    // A deleted row disposes ITSELF — the table cannot, since it holds no
    // reference to it — so the cache is pruned rather than rebuilt. Order does
    // not matter: a row that has gone is dropped here, and one that goes a
    // moment later is dropped on the next list. isConnected is the only test
    // that works either way.
    const els = props.invoiceEls$.filter((el) => el.isConnected === true);
    props.invoiceEls$ = els;

    const visibleIds = payload.visibleIds || [];
    const onThisPage = new Set(visibleIds);
    const firstId = payload.firstVisibleId ?? visibleIds[0];
    const lastId = payload.lastVisibleId ?? visibleIds[visibleIds.length - 1];

    els.forEach((el) => {
      const { invoiceId } = el.dataset;

      el.classList.toggle('is-hidden', onThisPage.has(invoiceId) === false);
      el.classList.toggle('is-first', invoiceId === firstId);
      el.classList.toggle('is-last', invoiceId === lastId);
    });

    const cardEls = (props.invoiceCardEls$ || []).filter(
      (el) => el.isConnected === true,
    );
    props.invoiceCardEls$ = cardEls;

    cardEls.forEach((el) => {
      el.classList.toggle(
        'hidden',
        onThisPage.has(el.dataset.invoiceId) === false,
      );
    });
  }
}
