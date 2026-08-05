import { SpyneTrait } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { buildInvoiceRows } from 'utils/acme-invoice-utils.js';
import { buildQuickSearchCustomerRows } from 'utils/acme-utils.js';
import { QuickSearchInvoiceItemView } from 'components/search/quick-search-invoice-item-view.js';
import { QuickSearchCustomerItemView } from 'components/search/quick-search-customer-item-view.js';

const CUSTOMERS_SLOT = '[data-slot="qs-customers"]';
const INVOICES_SLOT = '[data-slot="qs-invoices"]';
const HIGHLIGHT_CLASS = 'is-highlighted';

// Same module-load icon strings as the invoices table's rows — the status
// sections of buildInvoiceRows reference these, they are never rebuilt.
const QS_ROW_ICONS = {
  svgClock: withClass('clock', 'ml-1 w-4 text-gray-500'),
  svgCheck: withClass('check', 'ml-1 w-4 text-white'),
};

/**
 * Logic for QuickSearchOverlayView.
 *
 * ── Delta rendering at dozens-of-rows scale ─────────────────────────────────
 *
 * Each RESULTS emission is reconciled the way the invoices table reconciles a
 * page: the trait appends only the ids not already in the DOM, walks the
 * payload order with appendChild (a move for survivors, the sort and the
 * insertion in one pass), and every stale row removes ITSELF through its own
 * negative filter — no orchestrator diffs the set. Narrowing a query from
 * dozens of matches to a handful is therefore mostly disposals, and extending
 * it is mostly appends; unchanged rows are untouched.
 * [dispose-by-predicate-filter] [address-region-by-el$]
 *
 * ── Keyboard highlight ──────────────────────────────────────────────────────
 *
 * The highlight index and the flat entry list are ephemeral display state on
 * this view's props — below the channel threshold, like the todos specimen's
 * per-item state. Navigation walks the ENTRY list (payload order), and the DOM
 * is only painted from it, so rows mid-teardown after a keystroke can never
 * corrupt the position. Enter transmits the same semantic action the row's own
 * click raises, into the channel that owns it. [live-mirror-via-el$]
 * [transmit-into-channel]
 */
export class QuickSearchOverlayTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'quickSearchOverlay$');
  }

  static quickSearchOverlay$OnRendered() {
    this.props.qsEntries = [];
    this.props.qsHighlightIndex = -1;

    this.props.el$('input').el?.focus();
  }

  /**
   * A RESULTS emission: shape both groups for the logic-less row templates,
   * sync the chrome and the children, then re-seat the highlight — preserved
   * across a data refresh (the query did not change under the user), reset to
   * the top for a new query.
   */
  static quickSearchOverlay$OnResults(e, props = this.props) {
    const payload = e?.payload || {};
    const customerRows = buildQuickSearchCustomerRows(
      payload.customerMatches || [],
    );
    const invoiceRows = buildInvoiceRows(
      payload.invoiceMatches || [],
      QS_ROW_ICONS,
    );

    const prevKey =
      payload.isDataRefresh === true
        ? props.qsEntries?.[props.qsHighlightIndex]?.key
        : undefined;

    props.qsEntries = [
      ...customerRows.map((row) => ({
        kind: 'customer',
        key: `customer-${row.attrCustomerId}`,
        name: row.attrCustomerName,
        data: row,
      })),
      ...invoiceRows.map((row) => ({
        kind: 'invoice',
        key: `invoice-${row.attrInvoiceId}`,
        id: String(row.attrInvoiceId),
        data: row,
      })),
    ];

    this.quickSearchOverlay$UpdateChrome(payload);
    this.quickSearchOverlay$SyncGroup(
      CUSTOMERS_SLOT,
      customerRows,
      (row) => `customer-${row.attrCustomerId}`,
      QuickSearchCustomerItemView,
    );
    this.quickSearchOverlay$SyncGroup(
      INVOICES_SLOT,
      invoiceRows,
      (row) => `invoice-${row.attrInvoiceId}`,
      QuickSearchInvoiceItemView,
    );

    const preservedIndex = prevKey
      ? props.qsEntries.findIndex(({ key }) => key === prevKey)
      : -1;

    props.qsHighlightIndex =
      preservedIndex !== -1
        ? preservedIndex
        : props.qsEntries.length > 0
          ? 0
          : -1;

    this.quickSearchOverlay$ApplyHighlight();
  }

  /**
   * Counts, group visibility, hint / no-results, truncation notes — el$
   * mutations on the overlay's own chrome, driven entirely by the payload.
   */
  static quickSearchOverlay$UpdateChrome(payload, props = this.props) {
    const {
      query = '',
      totalCustomers = 0,
      totalInvoices = 0,
      customerMatches = [],
      invoiceMatches = [],
    } = payload;
    const hasQuery = query !== '';

    props
      .el$('[data-qs-state="hint"]')
      .el?.classList.toggle('hidden', hasQuery);
    props
      .el$('[data-qs-state="no-results"]')
      .el?.classList.toggle(
        'hidden',
        hasQuery === false || totalCustomers + totalInvoices > 0,
      );

    const syncGroupChrome = (groupName, total, shownCount) => {
      props
        .el$(`[data-qs-group="${groupName}"]`)
        .el?.classList.toggle('hidden', total === 0);

      const countEl = props.el$(`[data-qs-count="${groupName}"]`).el;
      if (countEl != null) countEl.innerText = String(total);

      const truncatedEl = props.el$(`[data-qs-truncated="${groupName}"]`).el;
      if (truncatedEl != null) {
        truncatedEl.classList.toggle('hidden', total <= shownCount);
        truncatedEl.innerText =
          total > shownCount ? `Showing first ${shownCount} of ${total}` : '';
      }
    };

    syncGroupChrome('customers', totalCustomers, customerMatches.length);
    syncGroupChrome('invoices', totalInvoices, invoiceMatches.length);
  }

  /**
   * The delta pass for one group. Rows are shallow-copied out of the frozen
   * payload before becoming a child's own data. [clone-frozen-payload]
   */
  static quickSearchOverlay$SyncGroup(
    slotSelector,
    rows,
    getKey,
    ItemViewClass,
    props = this.props,
  ) {
    const container = props.el$(slotSelector).el;
    if (container == null) return;

    const existingKeys = new Set(
      props
        .el$(`${slotSelector} [data-qs-key]`)
        .els.map((el) => el.dataset.qsKey),
    );

    rows.forEach((row) => {
      if (existingKeys.has(getKey(row)) === true) return;

      this.appendView(new ItemViewClass({ data: { ...row } }), slotSelector);
    });

    // One ordering pass over the payload's own keys; rows disposing on this
    // same emission are simply not named, so the dying are never touched.
    rows.forEach((row) => {
      const el = container.querySelector(`[data-qs-key="${getKey(row)}"]`);
      if (el != null) container.appendChild(el);
    });
  }

  /**
   * ArrowUp/ArrowDown/Enter, narrowed from the window keydown the overlay
   * subscribes to. Arrows wrap; Enter activates the highlighted entry by
   * transmitting the row's own semantic action to its owning channel —
   * invoices edit to CHANNEL_ACME_INVOICES, customer selection to
   * CHANNEL_ACME_SEARCH — the same destinations the row clicks reach through
   * CHANNEL_UI. Escape is not handled here: the search channel owns close.
   */
  static quickSearchOverlay$OnKeydown(e, props = this.props) {
    const key = e?.payload?.key;
    const count = props.qsEntries?.length ?? 0;

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      e?.event?.preventDefault?.();

      if (count === 0) return;

      const delta = key === 'ArrowDown' ? 1 : -1;
      props.qsHighlightIndex = (props.qsHighlightIndex + delta + count) % count;

      this.quickSearchOverlay$ApplyHighlight();
      return;
    }

    if (key !== 'Enter') return;

    const entry = props.qsEntries?.[props.qsHighlightIndex];
    if (entry == null) return;

    e?.event?.preventDefault?.();

    if (entry.kind === 'invoice') {
      this.sendInfoToChannel(
        'CHANNEL_ACME_INVOICES',
        { btnType: 'edit', invoiceId: entry.id },
        'CHANNEL_ACME_INVOICES_NAVIGATE_EVENT',
      );
      return;
    }

    this.sendInfoToChannel(
      'CHANNEL_ACME_SEARCH',
      { customerName: entry.name },
      'CHANNEL_ACME_SEARCH_SELECT_EVENT',
    );
  }

  static quickSearchOverlay$ApplyHighlight(props = this.props) {
    const activeKey = props.qsEntries?.[props.qsHighlightIndex]?.key;
    let activeEl = null;

    props.el$('[data-qs-key]').els.forEach((el) => {
      const isActive = el.dataset.qsKey === activeKey;

      el.classList.toggle(HIGHLIGHT_CLASS, isActive);
      if (isActive) activeEl = el;
    });

    activeEl?.scrollIntoView({ block: 'nearest' });
  }
}
