import { SpyneTrait } from 'spyne';
import { fromEvent } from 'rxjs';
import { withClass } from 'utils/svg-icons.js';
import {
  filterInvoices,
  formatInvoiceAmount,
  formatInvoiceDate,
  getInvoiceStatusClass,
} from 'utils/acme-invoice-utils.js';
import { filterCustomers } from 'utils/acme-utils.js';

// Built once at module load, like the table's ROW_ICONS — the same strings for
// the life of the app, referenced by every render.
const QS_ICONS = {
  svgClock: withClass('clock', 'ml-1 w-4 text-gray-500'),
  svgCheck: withClass('check', 'ml-1 w-4 text-white'),
  svgPencil: withClass('pencil', 'w-4 text-gray-400'),
  svgUserGroup: withClass('userGroup', 'w-4 text-gray-400'),
};

const HIGHLIGHT_CLASSES = ['bg-sky-100'];

// Rows are bulk markup, not templates, so escaping is this module's own job —
// DomElementTemplate's {{key}} escaping never sees these strings.
const esc = (str) =>
  String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

// content-visibility: a thousand-row match set costs layout only for what is
// on screen; parse cost is accepted, capping the list is not.
// scroll-margin-top: the group headers are sticky, so an element scrolled to
// the top of the panel (keyboard nav's scrollIntoView, a browser's
// scroll-on-click) would otherwise land UNDER the header and take clicks for
// it.
const ROW_STYLE =
  'content-visibility:auto;contain-intrinsic-size:0 52px;scroll-margin-top:40px;';

const ROW_CLASS =
  'qs-row flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-sm text-gray-900 hover:bg-sky-50';

const GROUP_HEADER_CLASS =
  'sticky top-0 z-10 border-b border-gray-100 bg-gray-50 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-500';

const buildCustomerRow = (customer, index) => `
  <div
    id="qs-item-${index}"
    role="option"
    class="${ROW_CLASS}"
    style="${ROW_STYLE}"
    data-qs-row
    data-qs-index="${index}"
    data-qs-kind="customer"
    data-customer-email="${esc(customer.email)}"
  >
    <img
      src="${esc('imgs' + customer.image_url)}"
      class="rounded-full"
      width="28"
      height="28"
      loading="lazy"
      alt="${esc(customer.name)}'s profile picture"
    />
    <span class="min-w-0 flex-1 truncate">
      <span class="font-medium">${esc(customer.name)}</span>
      <span class="ml-2 text-gray-500">${esc(customer.email)}</span>
    </span>
    ${QS_ICONS.svgUserGroup}
  </div>`;

const buildInvoiceRow = (invoice, index) => {
  const isPaid = invoice.status === 'paid';
  const pill = isPaid
    ? `Paid${QS_ICONS.svgCheck}`
    : `Pending${QS_ICONS.svgClock}`;

  return `
  <div
    id="qs-item-${index}"
    role="option"
    class="${ROW_CLASS}"
    style="${ROW_STYLE}"
    data-qs-row
    data-qs-index="${index}"
    data-qs-kind="invoice"
    data-invoice-id="${esc(invoice.id)}"
  >
    <img
      src="${esc('imgs' + invoice.image_url)}"
      class="rounded-full"
      width="28"
      height="28"
      loading="lazy"
      alt="${esc(invoice.name)}'s profile picture"
    />
    <span class="min-w-0 flex-1 truncate">
      <span class="font-medium">${esc(invoice.name)}</span>
      <span class="ml-2 text-gray-500">${esc(invoice.email)}</span>
    </span>
    <span class="w-20 text-right">${formatInvoiceAmount(invoice.amount)}</span>
    <span class="w-24 text-right text-gray-500">${formatInvoiceDate(invoice.date)}</span>
    <button
      type="button"
      class="${getInvoiceStatusClass(invoice.status)}"
      data-qs-toggle
      data-invoice-id="${esc(invoice.id)}"
      title="Toggle paid / pending"
    >${pill}</button>
    ${QS_ICONS.svgPencil}
  </div>`;
};

/**
 * The global quick-search overlay's behavior: open/close, live matching,
 * keyboard navigation, and activation.
 *
 * ── Where search executes ───────────────────────────────────────────────────
 *
 * Here, against the replayed CHANNEL_ACME_DATA dump, through the same pure
 * functions the domain channels use (filterInvoices / filterCustomers) — so a
 * match in the overlay and a match on the invoices page are the same fact.
 * The overlay's query is transient UI state and never touches the URL; the
 * URL stays the list pages' state, untouched by typing here.
 *
 * ── Why rows are bulk markup with window-level click delegation ─────────────
 *
 * A ViewStream's broadcastEvents binds elements that exist at render time and
 * does not delegate, so per-keystroke result rows cannot be broadcast-bound —
 * and minting a ViewStream per row is the instance-count failure the invoices
 * table already retired. Rows are therefore escaped markup, and clicks arrive
 * through CHANNEL_WINDOW_CLICK_EVENT (registered in index.js), resolved
 * against the rendered rows by dataset. The static input IS broadcast-bound,
 * so typing rides CHANNEL_UI like every other search box.
 */
export class QuickSearchTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'quickSearch$');
  }

  // ── Channel state ─────────────────────────────────────────────────────────

  static quickSearch$OnAppPage(e) {
    this.props.qsPageId = e?.payload?.pageId;
  }

  /**
   * Every landed dump — first load, optimistic toggle apply, rollback,
   * authoritative refresh. The held collections are replaced and, if the
   * overlay is open, the list re-renders in place: a toggled pill repaints by
   * the same one path every other surface uses, and a mutation landing while
   * the overlay is up keeps its rows fresh.
   */
  static quickSearch$OnAcmeData(e, props = this.props) {
    const data = e?.payload?.data;

    if (data == null) return;

    props.qsInvoices = data.invoices || [];
    props.qsCustomers = data.customers || [];

    if (props.qsIsOpen === true) this.quickSearch$Render(true);
  }

  static quickSearch$OnRouteChange() {
    if (this.props.qsIsOpen === true) this.quickSearch$Close();
  }

  // ── Open / close ──────────────────────────────────────────────────────────

  static quickSearch$OnOpenerClick() {
    this.quickSearch$Open();
  }

  static quickSearch$Open(props = this.props) {
    if (props.qsIsOpen === true) return;

    props.qsIsOpen = true;
    props.el$().toggleClass('hidden', false);

    const input = props.el$('#quick-search-input').el;

    if (input != null) {
      input.focus({ preventScroll: true });
      input.select();
    }

    this.quickSearch$Render();
  }

  static quickSearch$Close(props = this.props) {
    if (props.qsIsOpen !== true) return;

    props.qsIsOpen = false;
    props.el$().toggleClass('hidden', true);

    const input = props.el$('#quick-search-input').el;
    if (input != null && document.activeElement === input) input.blur();
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  /**
   * The ONE direct DOM binding in this feature, and why it has to be:
   * CHANNEL_WINDOW registers every listener passive
   * (spyne-utils-channel-window.js, isPassive = true), and a passive listener
   * cannot preventDefault — so the browser's own Cmd-K (address-bar search)
   * and the arrows' caret/scroll defaults would fire alongside the overlay's
   * handling. The subscription uses the framework's own RxJS and lives as
   * long as the overlay, which is app-lifetime chrome; everything else in
   * this feature stays on declared channels.
   */
  static quickSearch$BindGlobalKeys(props = this.props) {
    props.qsKeydown$ = fromEvent(window, 'keydown').subscribe(
      this.quickSearch$OnKeydown.bind(this),
    );
  }

  /**
   * One window-level keydown handler covers the shortcut and, while open,
   * the list navigation — keydown inside the input bubbles to window, so the
   * overlay needs no second binding for arrows and Enter.
   */
  static quickSearch$OnKeydown(evt, props = this.props) {
    const key = evt?.key;

    if (key == null) return;

    const isCmdK =
      (evt.metaKey === true || evt.ctrlKey === true) &&
      String(key).toLowerCase() === 'k';

    if (isCmdK === true) {
      // Signed-in app pages only — the same single-page rule the sidenav
      // column uses (UIContainerTraits.SHELL_PAGE_ID).
      if (props.qsPageId !== 'dashboard') return;

      evt.preventDefault();

      if (props.qsIsOpen === true) {
        this.quickSearch$Close();
      } else {
        this.quickSearch$Open();
      }
      return;
    }

    if (props.qsIsOpen !== true) return;

    if (key === 'Escape') {
      this.quickSearch$Close();
      return;
    }

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      evt.preventDefault();
      this.quickSearch$MoveHighlight(key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (key === 'Enter') {
      const row = (props.qsRowEls || [])[props.qsIndex];
      if (row != null) this.quickSearch$ActivateRow(row);
    }
  }

  /**
   * The input's own broadcast — every keyup lands here, so the value check is
   * what makes "search as you type" also mean "only when it typed something".
   */
  static quickSearch$OnQueryKeyup(e, props = this.props) {
    if (props.qsIsOpen !== true) return;

    const value = e?.srcElement?.el?.value ?? '';

    if (value === props.qsQuery) return;

    props.qsQuery = value;
    this.quickSearch$Render();
  }

  // ── Clicks ────────────────────────────────────────────────────────────────

  /**
   * Delegated resolution of everything the broadcaster cannot bind: the
   * backdrop, a row, or a row's status toggle. The rows are deliberately NOT
   * anchors — CHANNEL_WINDOW's listeners are passive, so an anchor default
   * could never be prevented from here; a role="option" div has no default to
   * fight. The opening click can never arrive here as an outside click,
   * because closing is keyed to the backdrop element itself — which does not
   * exist under the pointer until the overlay is already open.
   */
  static quickSearch$OnWindowClick(e, props = this.props) {
    if (props.qsIsOpen !== true) return;

    const target = e?.event?.target;

    if (target == null || typeof target.closest !== 'function') return;

    if (target.dataset?.qsBackdrop !== undefined) {
      this.quickSearch$Close();
      return;
    }

    const root = props.el;
    if (root == null || root.contains(target) === false) return;

    const toggle = target.closest('[data-qs-toggle]');

    if (toggle != null) {
      this.quickSearch$ToggleInvoiceStatus(toggle.dataset.invoiceId);
      return;
    }

    const row = target.closest('[data-qs-row]');

    if (row != null) this.quickSearch$ActivateRow(row);
  }

  // ── Activation ────────────────────────────────────────────────────────────

  static quickSearch$ActivateRow(row) {
    const { qsKind, invoiceId, customerEmail } = row.dataset;

    if (qsKind === 'invoice') {
      this.quickSearch$OpenInvoiceEdit(invoiceId);
      return;
    }

    if (qsKind === 'customer') {
      this.quickSearch$OpenCustomerInvoices(customerEmail);
    }
  }

  /**
   * The same path as the table row's pencil click: the invoices channel emits
   * EDIT_EVENT with the invoice and customer options, then routes — so the
   * edit page a quick-search result lands on is indistinguishable from one
   * reached through the table.
   */
  static quickSearch$OpenInvoiceEdit(invoiceId) {
    this.quickSearch$Close();
    this.sendInfoToChannel(
      'CHANNEL_ACME_INVOICES',
      { invoiceId },
      'CHANNEL_ACME_INVOICES_OPEN_EDIT_EVENT',
    );
  }

  /**
   * Lands on /dashboard/invoices?query=<email> as ONE history entry.
   *
   * The route channel writes pathnames only (setWindowLocation drops the
   * search string), and page mount is synchronous inside a route send — so
   * routing first and amending the query after would mount the page, and its
   * search box, against the un-amended URL. Writing the full destination URL
   * and announcing it as a history event instead re-enters by the app's
   * designed path: the route channel's popstate handler rebuilds the page
   * from the location, and the params loop's popstate subscribers re-resolve
   * both lists. A deep link, a back button and this navigation are then the
   * same event — the reason the email (unique per customer, and one of
   * filterInvoices' ILIKE columns) is the query rather than held state.
   */
  static quickSearch$OpenCustomerInvoices(email) {
    this.quickSearch$Close();
    window.history.pushState(
      {},
      '',
      `/dashboard/invoices?query=${encodeURIComponent(email)}`,
    );
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  /**
   * The overlay's pill goes through the data channel's one optimistic path —
   * apply, publish, request, reconcile — via the ViewStream info boundary,
   * since a delegated click never passes through CHANNEL_UI. The repaint
   * arrives back here as the UPDATED emission quickSearch$OnAcmeData renders.
   */
  static quickSearch$ToggleInvoiceStatus(invoiceId) {
    this.sendInfoToChannel(
      'CHANNEL_ACME_DATA',
      { invoiceId },
      'CHANNEL_ACME_DATA_TOGGLE_STATUS_EVENT',
    );

    // The click moved focus to a pill the re-render has just replaced; typing
    // should keep working without re-clicking the box.
    const input = this.props.el$('#quick-search-input').el;
    if (input != null) input.focus({ preventScroll: true });
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  /**
   * Rebuilds the grouped list from the held collections and the current
   * query. keepPosition is the data-refresh case: same query, new facts —
   * the scroll offset and highlight survive so a toggle does not throw the
   * user back to the top.
   */
  static quickSearch$Render(keepPosition = false, props = this.props) {
    const resultsEl = props.el$('[data-slot="qs-results"]').el;

    if (resultsEl == null) return;

    const query = String(props.qsQuery || '').trim();
    const prevScrollTop = resultsEl.scrollTop;
    const prevIndex = props.qsIndex;

    if (query === '') {
      resultsEl.innerHTML = `
        <p class="px-4 py-8 text-center text-sm text-gray-500">
          Type to search customers and invoices.
        </p>`;
      props.qsRowEls = [];
      props.qsIndex = -1;
      return;
    }

    const customers = filterCustomers(props.qsCustomers || [], query);
    const invoices = filterInvoices(props.qsInvoices || [], query);

    if (customers.length === 0 && invoices.length === 0) {
      resultsEl.innerHTML = `
        <p class="px-4 py-8 text-center text-sm text-gray-500">
          No results for &ldquo;${esc(query)}&rdquo;.
        </p>`;
      props.qsRowEls = [];
      props.qsIndex = -1;
      return;
    }

    let index = 0;
    const sections = [];

    if (customers.length > 0) {
      const rows = customers
        .map((customer) => buildCustomerRow(customer, index++))
        .join('');

      sections.push(`
        <div role="group" aria-label="Customers">
          <h3 class="${GROUP_HEADER_CLASS}">Customers (${customers.length})</h3>
          ${rows}
        </div>`);
    }

    if (invoices.length > 0) {
      const rows = invoices
        .map((invoice) => buildInvoiceRow(invoice, index++))
        .join('');

      sections.push(`
        <div role="group" aria-label="Invoices">
          <h3 class="${GROUP_HEADER_CLASS}">Invoices (${invoices.length})</h3>
          ${rows}
        </div>`);
    }

    resultsEl.innerHTML = sections.join('');
    props.qsRowEls = Array.from(resultsEl.querySelectorAll('[data-qs-row]'));

    const nextIndex =
      keepPosition === true && prevIndex >= 0
        ? Math.min(prevIndex, props.qsRowEls.length - 1)
        : 0;

    this.quickSearch$SetHighlight(nextIndex, keepPosition !== true);

    if (keepPosition === true) resultsEl.scrollTop = prevScrollTop;
  }

  // ── Highlight ─────────────────────────────────────────────────────────────

  static quickSearch$MoveHighlight(delta, props = this.props) {
    const count = (props.qsRowEls || []).length;

    if (count === 0) return;

    const current = props.qsIndex >= 0 ? props.qsIndex : -1;
    const next = Math.min(Math.max(current + delta, 0), count - 1);

    this.quickSearch$SetHighlight(next);
  }

  static quickSearch$SetHighlight(
    index,
    skipScroll = false,
    props = this.props,
  ) {
    const rows = props.qsRowEls || [];
    const prev = rows[props.qsIndex];

    if (prev != null)
      HIGHLIGHT_CLASSES.forEach((c) => prev.classList.remove(c));

    props.qsIndex = index;
    const row = rows[index];

    if (row == null) return;

    HIGHLIGHT_CLASSES.forEach((c) => row.classList.add(c));

    if (skipScroll !== true) row.scrollIntoView({ block: 'nearest' });

    const input = props.el$('#quick-search-input').el;
    if (input != null) input.setAttribute('aria-activedescendant', row.id);
  }
}
