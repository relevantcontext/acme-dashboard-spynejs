import { SpyneTrait, DomElementTemplate } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { getInvoiceStatusClass } from 'utils/acme-invoice-utils.js';
import {
  buildQuickSearchCustomerRows,
  buildQuickSearchInvoiceRows,
  quickSearchDataSignature,
} from 'utils/acme-quicksearch-utils.js';

// Built once at module load, referenced by every row — same rule as the
// table's ROW_ICONS and the status trait's STATUS_ICONS.
const QS_ICONS = {
  svgClock: withClass('clock', 'ml-1 w-4 text-gray-500'),
  svgCheck: withClass('check', 'ml-1 w-4 text-white'),
  svgPencil: withClass('pencil', 'w-5'),
};

const CUSTOMERS_SLOT = '[data-slot="qs-customers"]';
const INVOICES_SLOT = '[data-slot="qs-invoices"]';

/**
 * Logic for QuickSearchOverlayView.
 *
 * ── Rendering strategy: pre-render once, sweep per keystroke ────────────────
 *
 * Every row (200 customers + 5,000 invoices) is rendered ONCE per data dump
 * into the hidden overlay, and each keystroke then only toggles `hidden`
 * per row from the channel's matched-id sets. The alternatives both fail at
 * this scale: one ViewStream per row is the instance-count trap the invoices
 * table already removed ("six of these exist, not five hundred"), and
 * re-rendering only the matches per keystroke makes the WORST query (one
 * character, thousands of matches) the most expensive frame. A class sweep
 * is O(rows) DOM writes with no node creation — the cheapest possible
 * keystroke — and it is the customers table's own visibility model, applied
 * one level up.
 *
 * A broad query therefore shows ALL its matches, scrollable, uncapped —
 * they are simply the rows that are not hidden.
 *
 * ── Freshness ───────────────────────────────────────────────────────────────
 *
 * Status is repainted in place per invoice from STATUS_EVENT — the identical
 * payload, markup and classes as the table rows' pills, so a toggle fired
 * FROM the overlay repaints its own row by the same path as everything else.
 * Dumps whose collections actually changed (create / edit / delete) rebuild
 * the rows; dumps that only moved statuses (the optimistic apply and the
 * authoritative confirm of every toggle) are detected by a status-insensitive
 * signature and deliberately do NOT rebuild — tearing the list down mid-
 * interaction would lose the user's scroll and highlight to repaint a pill
 * that STATUS_EVENT already repainted.
 *
 * ── Navigation from a result ────────────────────────────────────────────────
 *
 * Invoice rows travel the table's own edit path: an intake action on
 * CHANNEL_ACME_INVOICES runs the same form-navigation handler as the pencil
 * anchor, so the EDIT_EVENT payload precedes the route change exactly as it
 * always has. Customer rows mint a real /dashboard/invoices?query=<name>
 * history entry and re-enter through the popstate path — this app's stated
 * doctrine is that a bookmark, a back button and a keystroke are
 * indistinguishable, and a quick-search result is precisely a bookmark the
 * user didn't have to type: the page that builds reads the query off the URL
 * the same way a deeplink does, search box included.
 */
export class QuickSearchOverlayTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'quickSearch$');
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  static quickSearch$OnRendered(props = this.props) {
    props.qsIsOpen = false;
    props.qsCanOpen = false;
    props.qsRowsBuilt = false;
    props.qsRowsDirty = false;
    props.qsData = null;
    props.qsSignature = null;
    props.qsResults = null;
    props.qsCustomerRowEls = new Map();
    props.qsInvoiceRowEls = new Map();
    props.qsVisibleRows = [];
    props.qsHighlightEl = null;

    this.quickSearch$BindPreventDefaults();
  }

  /**
   * CHANNEL_WINDOW attaches every configured window event with
   * {passive: true} (spyne-utils-channel-window.js), so preventDefault
   * through the channel payload is silently ignored. Without it, Ctrl-K also
   * focuses the browser's address bar and arrows move the input caret. This
   * listener exists ONLY to cancel those defaults — every state change still
   * arrives through CHANNEL_WINDOW like any other key.
   */
  static quickSearch$BindPreventDefaults(props = this.props) {
    props.qsPreventDefaultFn = (evt) => {
      const isOpenCombo =
        (evt.metaKey === true || evt.ctrlKey === true) &&
        (evt.key === 'k' || evt.key === 'K');
      const isNavKey =
        props.qsIsOpen === true &&
        ['ArrowDown', 'ArrowUp', 'Enter'].includes(evt.key);

      if ((isOpenCombo && props.qsCanOpen === true) || isNavKey) {
        evt.preventDefault();
      }
    };

    window.addEventListener('keydown', props.qsPreventDefaultFn);
  }

  static quickSearch$UnbindPreventDefaults(props = this.props) {
    if (props.qsPreventDefaultFn) {
      window.removeEventListener('keydown', props.qsPreventDefaultFn);
    }
  }

  // ── Gating ────────────────────────────────────────────────────────────────

  /**
   * ChannelApp has already applied the auth boundary when these payloads are
   * emitted, so "the page is the dashboard" is also "the user is signed in".
   * Both the boot page and every navigation land here; a navigation out of
   * the shell (sign-out redirect, a guest page) also closes an open overlay.
   */
  static quickSearch$OnAppPage(e, props = this.props) {
    const { pageId, is404 } = e?.payload ?? {};

    props.qsCanOpen = pageId === 'dashboard' && is404 !== true;

    if (props.qsCanOpen === false) this.quickSearch$Close();
  }

  // Navigating anywhere dismisses the palette — including the navigations the
  // palette itself just issued.
  static quickSearch$OnRouteChange() {
    this.quickSearch$Close();
  }

  // ── Open / close ──────────────────────────────────────────────────────────

  static quickSearch$Open(props = this.props) {
    if (props.qsCanOpen !== true || props.qsIsOpen === true) return;

    props.qsIsOpen = true;
    props.qsPrevFocusEl = document.activeElement;

    if (props.qsRowsDirty === true || props.qsRowsBuilt === false) {
      this.quickSearch$BuildRows();
    }

    const input = this.quickSearch$GetInput();
    if (input) input.value = '';

    // An explicit fresh-query write: the channel republishes synchronously,
    // so the sweep below the fold is current before the overlay is shown.
    this.sendInfoToChannel(
      'CHANNEL_ACME_QUICKSEARCH',
      { query: '' },
      'CHANNEL_ACME_QUICKSEARCH_QUERY_EVENT',
    );

    props.el$().toggleClass('hidden', false);
    if (input) input.focus();
  }

  static quickSearch$Close(props = this.props) {
    if (props.qsIsOpen !== true) return;

    props.qsIsOpen = false;
    props.el$().toggleClass('hidden', true);

    const prevFocusEl = props.qsPrevFocusEl;
    if (prevFocusEl && document.contains(prevFocusEl)) prevFocusEl.focus();
    props.qsPrevFocusEl = null;
  }

  static quickSearch$ToggleOverlay(props = this.props) {
    return props.qsIsOpen === true
      ? this.quickSearch$Close()
      : this.quickSearch$Open();
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  // The WINDOW channel's generic events carry the raw KeyboardEvent as the
  // payload, so key names here are the real event's ('ArrowDown', 'Enter').
  static quickSearch$OnKeydown(e, props = this.props) {
    const evt = e?.payload;
    const key = evt?.key;

    if (
      (evt?.metaKey === true || evt?.ctrlKey === true) &&
      (key === 'k' || key === 'K')
    ) {
      return this.quickSearch$ToggleOverlay();
    }

    if (props.qsIsOpen !== true) return;

    if (key === 'Escape') return this.quickSearch$Close();
    if (key === 'ArrowDown') return this.quickSearch$MoveHighlight(1);
    if (key === 'ArrowUp') return this.quickSearch$MoveHighlight(-1);
    if (key === 'Enter') return this.quickSearch$ActivateHighlighted();
  }

  static quickSearch$MoveHighlight(step, props = this.props) {
    const rows = props.qsVisibleRows;
    if (rows.length === 0) return;

    const currentIndex = rows.indexOf(props.qsHighlightEl);
    const nextIndex =
      currentIndex === -1
        ? step > 0
          ? 0
          : rows.length - 1
        : (currentIndex + step + rows.length) % rows.length;

    this.quickSearch$SetHighlight(rows[nextIndex], true);
  }

  static quickSearch$SetHighlight(rowEl, scrollTo = false, props = this.props) {
    if (props.qsHighlightEl && props.qsHighlightEl !== rowEl) {
      props.qsHighlightEl.setAttribute('aria-selected', 'false');
    }

    props.qsHighlightEl = rowEl ?? null;

    if (rowEl) {
      rowEl.setAttribute('aria-selected', 'true');
      if (scrollTo === true && props.qsIsOpen === true) {
        rowEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  static quickSearch$ActivateHighlighted(props = this.props) {
    if (props.qsHighlightEl) {
      this.quickSearch$ActivateRow(props.qsHighlightEl);
    }
  }

  // ── Clicks (sidenav button, backdrop, delegated results) ─────────────────

  static quickSearch$OnUiClick(e) {
    const { eventType, btnType } = e?.payload ?? {};

    if (eventType === 'quickSearch') {
      if (btnType === 'open') return this.quickSearch$Open();
      if (btnType === 'close') return this.quickSearch$Close();
      return;
    }

    // eventType 'quickSearchResults': the container is the bound element, so
    // the payload's dataset is the container's — the ROW is resolved from the
    // real click target. The toggle wins over row activation by specificity.
    const target = e?.event?.target;
    if (target == null || typeof target.closest !== 'function') return;

    const toggleBtn = target.closest('[data-qs-action="toggle"]');
    if (toggleBtn) {
      return this.quickSearch$ToggleInvoiceStatus(toggleBtn.dataset.invoiceId);
    }

    const row = target.closest('[data-qs-kind]');
    if (row) return this.quickSearch$ActivateRow(row);
  }

  // ── Activation ────────────────────────────────────────────────────────────

  static quickSearch$ActivateRow(rowEl) {
    const { qsKind, qsId, qsQuery } = rowEl?.dataset ?? {};

    if (qsKind === 'invoice') {
      this.quickSearch$Close();
      // The table's own edit path: OnFormNavigation emits EDIT_EVENT (the
      // payload the edit form replays) and THEN routes — same order, same
      // handler, one seam.
      this.sendInfoToChannel(
        'CHANNEL_ACME_INVOICES',
        { btnType: 'edit', invoiceId: qsId },
        'CHANNEL_ACME_INVOICES_FORM_NAVIGATION_EVENT',
      );
      return;
    }

    if (qsKind === 'customer') {
      this.quickSearch$Close();
      this.quickSearch$NavigateToCustomer(qsQuery);
    }
  }

  /**
   * A customer result IS a deeplink to the invoices page filtered to that
   * customer, so it navigates as one: push the URL — path AND query in a
   * single history entry — and re-enter through the popstate path the route
   * channel already owns (window.onpopstate) and CHANNEL_WINDOW already
   * observes. Everything downstream is the ordinary deeplink cascade: the
   * route channel emits the change, ChannelApp emits page data, the invoices
   * page builds reading ?query= off the URL (search box prefilled, list
   * filtered), and the domain channels refilter off the popstate. Routing
   * through sendPayloadToRouteChannel instead would push the PATH first and
   * merge the query after the page had already composed — the search box
   * would mount empty over a filtered table.
   */
  static quickSearch$NavigateToCustomer(query = '') {
    const href = `/dashboard/invoices?${new URLSearchParams({ query })}`;

    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  /**
   * The overlay's pill click. Rows cannot carry their own CHANNEL_UI binding
   * (they are re-rendered wholesale, and broadcasts bind per element at
   * render time), so the intent crosses to ChannelAcmeData as a declared
   * intake action instead — landing in the SAME acmeData$ToggleInvoiceStatus
   * the table's pill reaches through CHANNEL_UI: optimistic apply, request,
   * rollback and STATUS_EVENT repaint are one path for both surfaces.
   */
  static quickSearch$ToggleInvoiceStatus(invoiceId, props = this.props) {
    if (invoiceId == null || invoiceId === '') return;

    this.sendInfoToChannel(
      'CHANNEL_ACME_DATA',
      { invoiceId: String(invoiceId) },
      'CHANNEL_ACME_DATA_TOGGLE_INVOICE_STATUS_EVENT',
    );

    // Keep the palette keyboard-driven after a mouse toggle.
    if (props.qsIsOpen === true) this.quickSearch$GetInput()?.focus();
  }

  // ── Data -> rows ──────────────────────────────────────────────────────────

  static quickSearch$OnAcmeData(e, props = this.props) {
    const data = e?.payload?.data ?? {};
    const invoices = data.invoices || [];
    const customers = data.customers || [];
    const signature = quickSearchDataSignature(invoices, customers);

    // Only statuses moved (a toggle's optimistic apply or authoritative
    // confirm): the pills have already repainted via STATUS_EVENT, and a
    // rebuild would cost the open overlay its scroll and highlight.
    if (signature === props.qsSignature && props.qsRowsBuilt === true) return;

    props.qsData = { invoices, customers };
    props.qsSignature = signature;
    props.qsRowsDirty = true;

    if (props.qsIsOpen === true) {
      this.quickSearch$BuildRows();
      return;
    }

    // Deferred so the dump's synchronous fan-out (page items, table rows)
    // finishes painting first; the overlay is hidden, so building costs no
    // layout. First open then finds the rows already in place.
    this.setTimeout(this.quickSearch$BuildRowsIfDirty, 80, true);
  }

  static quickSearch$BuildRowsIfDirty(props = this.props) {
    if (props.qsRowsDirty === true) this.quickSearch$BuildRows();
  }

  /**
   * Renders every row for both groups through DomElementTemplate — the same
   * engine and sanitize pass as every template in the app — and indexes the
   * elements by id for the sweep. Runs once per changed dump, never per
   * keystroke.
   */
  static quickSearch$BuildRows(props = this.props) {
    if (props.el == null || props.qsData == null) return;

    const customersEl = props.el$(CUSTOMERS_SLOT).el;
    const invoicesEl = props.el$(INVOICES_SLOT).el;
    if (customersEl == null || invoicesEl == null) return;

    const customerRows = buildQuickSearchCustomerRows(props.qsData.customers);
    const invoiceRows = buildQuickSearchInvoiceRows(
      props.qsData.invoices,
      QS_ICONS,
    );

    customersEl.replaceChildren(
      new DomElementTemplate(
        props.qsCustomerRowsTmpl,
        customerRows,
      ).renderDocFrag(),
    );
    invoicesEl.replaceChildren(
      new DomElementTemplate(
        props.qsInvoiceRowsTmpl,
        invoiceRows,
      ).renderDocFrag(),
    );

    const indexRows = (containerEl) =>
      new Map(
        Array.from(containerEl.querySelectorAll('[data-qs-id]')).map((el) => [
          el.dataset.qsId,
          el,
        ]),
      );

    props.qsCustomerRowEls = indexRows(customersEl);
    props.qsInvoiceRowEls = indexRows(invoicesEl);
    props.qsHighlightEl = null;
    props.qsRowsBuilt = true;
    props.qsRowsDirty = false;

    this.quickSearch$ApplyResults();
  }

  // ── Results -> sweep ──────────────────────────────────────────────────────

  static quickSearch$OnResults(e, props = this.props) {
    props.qsResults = e?.payload ?? null;
    this.quickSearch$ApplyResults();
  }

  /**
   * The keystroke-path worker: visibility classes, group counts, the empty
   * state, the ordered visible-row list, and a fresh default highlight on the
   * first match. No DOM is created or destroyed here.
   */
  static quickSearch$ApplyResults(props = this.props) {
    const results = props.qsResults;

    if (props.el == null || props.qsRowsBuilt !== true || results == null) {
      return;
    }

    const customerIds = new Set(results.customerIds || []);
    const invoiceIds = new Set(results.invoiceIds || []);
    const visibleRows = [];

    const sweep = (rowElsById, matchedIds) => {
      rowElsById.forEach((el, id) => {
        const isMatch = matchedIds.has(id);
        el.classList.toggle('hidden', isMatch === false);
        if (isMatch === true) visibleRows.push(el);
      });
    };

    // Customers group first, then invoices — the Map preserves each dump's
    // own order (customers name-asc, invoices newest-first), so the visible
    // list IS the keyboard order.
    sweep(props.qsCustomerRowEls, customerIds);
    sweep(props.qsInvoiceRowEls, invoiceIds);

    props.qsVisibleRows = visibleRows;

    const totalCustomers = results.totalCustomers ?? 0;
    const totalInvoices = results.totalInvoices ?? 0;

    props.el$('[data-qs-count="customers"]').els.forEach((el) => {
      el.textContent = `(${totalCustomers})`;
    });
    props.el$('[data-qs-count="invoices"]').els.forEach((el) => {
      el.textContent = `(${totalInvoices})`;
    });
    props
      .el$('[data-qs-group="customers"]')
      .toggleClass('hidden', totalCustomers === 0);
    props
      .el$('[data-qs-group="invoices"]')
      .toggleClass('hidden', totalInvoices === 0);
    props
      .el$('[data-qs-empty]')
      .toggleClass(
        'hidden',
        !(
          results.isLoaded === true &&
          totalCustomers === 0 &&
          totalInvoices === 0
        ),
      );

    // Fresh matches, fresh highlight: the first row, so Enter straight after
    // typing activates the top result.
    this.quickSearch$SetHighlight(visibleRows[0] ?? null);

    const resultsPanel = props.el$('[data-slot="qs-results"]').el;
    if (resultsPanel) resultsPanel.scrollTop = 0;
  }

  // ── Status repaint ────────────────────────────────────────────────────────

  /**
   * One invoice's status changed — optimistic apply, rollback or refresh, the
   * channel does not say which and this row does not care. Identical markup
   * to InvoicesItemStatusTraits, so an overlay pill and a table pill can
   * never drift.
   */
  static quickSearch$OnInvoiceStatus(e, props = this.props) {
    const { invoiceId, invoiceStatus } = e?.payload ?? {};

    if (invoiceStatus !== 'paid' && invoiceStatus !== 'pending') return;

    const rowEl = props.qsInvoiceRowEls?.get(String(invoiceId));
    const btn = rowEl?.querySelector('[data-qs-action="toggle"]');

    if (btn == null) return;

    btn.className = getInvoiceStatusClass(invoiceStatus);
    btn.innerHTML =
      invoiceStatus === 'paid'
        ? `Paid${QS_ICONS.svgCheck}`
        : `Pending${QS_ICONS.svgClock}`;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  static quickSearch$GetInput(props = this.props) {
    return props.el$('#quick-search-input').el;
  }
}
