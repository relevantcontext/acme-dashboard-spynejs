import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
import {
  buildQuickSearchResults,
  clampHighlightIndex,
} from 'utils/acme-quick-search-utils.js';
import { withClass } from 'utils/svg-icons.js';
import { AcmeAuthStateTraits } from 'traits/shell/acme-auth-state-traits.js';

// Built once at module load, the same way the invoices table builds ROW_ICONS.
// Passed into the pure builder rather than imported by it, which keeps the
// builder loadable by the test runner (it cannot follow .svg imports).
const RESULT_ICONS = {
  statusPaid: withClass('check', 'ml-1 w-4 text-white'),
  statusPending: withClass('clock', 'ml-1 w-4 text-gray-500'),
  pencil: withClass('pencil', 'w-4 text-gray-400'),
};

const KEYDOWN_ACTION = 'CHANNEL_UI_KEYDOWN_EVENT';

/**
 * The quick-search state machine: open/closed, the query, the match set and
 * the keyboard highlight all live HERE, on the channel — the overlay view is
 * a renderer of whatever this channel last said.
 *
 * ── Inputs ──────────────────────────────────────────────────────────────────
 *
 *   CHANNEL_UI keydown       Cmd/Ctrl-K (toggle, signed-in only), and — while
 *                            open — Escape, ArrowUp/ArrowDown, Enter. Fed by
 *                            AppHotkeysView's body-wide broadcast, so the
 *                            shortcut works from any page; see that view for
 *                            why this is not the WINDOW channel (passive
 *                            bindings cannot preventDefault).
 *   CHANNEL_UI               eventType `acmeQuickSearch`: the sidenav button
 *                            (open), the backdrop (close), the overlay input
 *                            (query keystrokes), and clicks inside the results
 *                            container. Result rows are bulk markup, so the
 *                            CONTAINER is the bound element — Spyne does not
 *                            delegate — and the clicked row is resolved from
 *                            event.target here.
 *   CHANNEL_ACME_DATA        the held dump. Recomputed on every landed dump
 *                            while open, so a toggle/edit/create is fresh in
 *                            the overlay by the same authority as every page.
 *   CHANNEL_ROUTE            any real navigation closes the overlay.
 *
 * ── Outputs ─────────────────────────────────────────────────────────────────
 *
 * OPEN / CLOSE / RESULTS / HIGHLIGHT paint the overlay. The three activation
 * instructions — TOGGLE_STATUS, EDIT_INVOICE, CUSTOMER_INVOICES — are consumed
 * by the overlay view, which RELAYS them to the owning domain channel via
 * sendInfoToChannel: a Channel cannot sendInfoToChannel (the same boundary
 * AcmeRequesterNullView exists for), and subscribing the domain channels to
 * this one would create a registration-order cycle with the data subscription
 * above. The relay keeps mouse clicks and Enter on one path: both converge
 * here, both leave as the same instruction, and the domain channel neither
 * knows nor cares which key or button asked.
 */
export class AcmeQuickSearchChannelTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'acmeQuickSearch$');
  }

  static acmeQuickSearch$OnRegistered() {
    this.props.isOpen = false;
    this.props.query = '';
    this.props.highlightIndex = -1;
    this.props.customers = [];
    this.props.invoices = [];
    this.props.flatRows = [];

    this.acmeQuickSearch$ListenToData();
    this.acmeQuickSearch$ListenToUiEvents();
    this.acmeQuickSearch$ListenToKeydown();
    this.acmeQuickSearch$ListenToRoute();
  }

  static acmeQuickSearch$ListenToData() {
    const loadedFilter = new ChannelPayloadFilter({
      payload: (payload) => payload?.status?.isLoaded === true,
    });

    this.getChannel('CHANNEL_ACME_DATA', loadedFilter).subscribe(
      this.acmeQuickSearch$OnData.bind(this),
    );
  }

  static acmeQuickSearch$ListenToUiEvents() {
    const quickSearchFilter = new ChannelPayloadFilter({
      eventType: 'acmeQuickSearch',
    });

    this.getChannel('CHANNEL_UI', quickSearchFilter).subscribe(
      this.acmeQuickSearch$OnUiEvent.bind(this),
    );
  }

  /**
   * Global keydown, via AppHotkeysView's body broadcast — NOT the WINDOW
   * channel, whose passive bindings would swallow the preventDefault that
   * keeps Cmd/Ctrl-K away from the browser's omnibox search (and the arrow
   * keys away from the input caret). Narrowed on the ACTION only: no other
   * view broadcasts keydown, and the filter's comparators read own
   * properties, which a KeyboardEvent's key/metaKey are not (they live on
   * the prototype) — the handler reads the event directly instead.
   */
  static acmeQuickSearch$ListenToKeydown() {
    const keydownFilter = new ChannelPayloadFilter({
      action: KEYDOWN_ACTION,
    });

    this.getChannel('CHANNEL_UI', keydownFilter).subscribe(
      this.acmeQuickSearch$OnKeydown.bind(this),
    );
  }

  static acmeQuickSearch$ListenToRoute() {
    const routeFilter = new ChannelPayloadFilter({
      action: 'CHANNEL_ROUTE_CHANGE_EVENT',
    });

    this.getChannel('CHANNEL_ROUTE', routeFilter).subscribe(
      this.acmeQuickSearch$OnRouteChange.bind(this),
    );
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  /**
   * A landed dump — first load, optimistic apply, rollback or authoritative
   * refresh; like the invoices channel, this one does not care which. The held
   * slices are replaced, and an OPEN overlay recomputes so its rows show the
   * same truth every other surface shows (a toggled pill repaints, a created
   * invoice appears, a row that stopped matching leaves). Closed, the refresh
   * costs nothing; the next open rebuilds from the fresh slices anyway.
   */
  static acmeQuickSearch$OnData(e) {
    this.props.customers = e?.payload?.data?.customers || [];
    this.props.invoices = e?.payload?.data?.invoices || [];

    if (this.props.isOpen === true) {
      this.acmeQuickSearch$PublishResults(
        'CHANNEL_ACME_QUICK_SEARCH_RESULTS_EVENT',
      );
    }
  }

  // ── UI events ─────────────────────────────────────────────────────────────

  static acmeQuickSearch$OnUiEvent(e) {
    const btnType = e?.payload?.btnType;

    if (btnType === 'open') {
      this.acmeQuickSearch$Open();
      return;
    }

    if (btnType === 'close') {
      this.acmeQuickSearch$Close();
      return;
    }

    if (btnType === 'query') {
      this.acmeQuickSearch$OnQueryInput(e);
      return;
    }

    if (btnType === 'results') {
      this.acmeQuickSearch$OnResultsClick(e);
    }
  }

  /**
   * A keystroke in the overlay input. The element is live, so its value is
   * current; identical values (arrow keys, Enter, modifier keyups) are
   * swallowed here so a highlight move never triggers a list re-render.
   */
  static acmeQuickSearch$OnQueryInput(e) {
    const value = e?.srcElement?.el?.value ?? '';

    if (value === this.props.query) return;

    this.props.query = value;
    this.props.highlightIndex = 0;
    this.acmeQuickSearch$PublishResults(
      'CHANNEL_ACME_QUICK_SEARCH_RESULTS_EVENT',
    );
  }

  /**
   * A click inside the results container. Rows are bulk markup under ONE bound
   * element, so the actionable element is resolved from the real click target:
   * the nearest ancestor carrying data-qs-kind names what was pressed, and its
   * dataset carries the id the instruction needs.
   */
  static acmeQuickSearch$OnResultsClick(e) {
    const target = e?.event?.target;

    if (target == null || typeof target.closest !== 'function') return;

    const actionable = target.closest('[data-qs-kind]');

    if (actionable == null) return;

    const { qsKind, invoiceId, customerName } = actionable.dataset;

    if (qsKind === 'toggle') {
      this.sendChannelPayload('CHANNEL_ACME_QUICK_SEARCH_TOGGLE_STATUS_EVENT', {
        invoiceId: String(invoiceId ?? ''),
      });
      return;
    }

    this.acmeQuickSearch$Activate({
      kind: qsKind,
      invoiceId,
      customerName,
    });
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  static acmeQuickSearch$OnKeydown(e) {
    // CHANNEL_UI envelope: the KeyboardEvent rides as `event` (the payload is
    // the bound element's dataset, and body has none).
    const evt = e?.event;

    if (evt == null || typeof evt.key !== 'string') return;

    const isShortcut =
      evt.key.toLowerCase() === 'k' &&
      (evt.metaKey === true || evt.ctrlKey === true) &&
      evt.altKey !== true;

    if (isShortcut === true) {
      // Signed-in app only — the overlay searches data a guest does not hold.
      if (AcmeAuthStateTraits.acmeAuthState$IsAuthenticated() === false) return;

      evt.preventDefault();
      if (this.props.isOpen === true) {
        this.acmeQuickSearch$Close();
      } else {
        this.acmeQuickSearch$Open();
      }
      return;
    }

    if (this.props.isOpen !== true) return;

    if (evt.key === 'Escape') {
      this.acmeQuickSearch$Close();
      return;
    }

    if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      evt.preventDefault();
      this.acmeQuickSearch$MoveHighlight(evt.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (evt.key === 'Enter') {
      const row = this.props.flatRows[this.props.highlightIndex];

      if (row == null) return;

      evt.preventDefault();
      this.acmeQuickSearch$Activate(row);
    }
  }

  static acmeQuickSearch$MoveHighlight(step) {
    const total = this.props.flatRows.length;

    if (total === 0) return;

    this.props.highlightIndex = clampHighlightIndex(
      this.props.highlightIndex + step,
      total,
    );

    // Highlight-only payload: moving the bar must not rebuild dozens of rows.
    this.sendChannelPayload('CHANNEL_ACME_QUICK_SEARCH_HIGHLIGHT_EVENT', {
      isOpen: true,
      query: this.props.query,
      highlightIndex: this.props.highlightIndex,
      totalMatched: total,
    });
  }

  // ── Activation ────────────────────────────────────────────────────────────

  /**
   * The highlighted (or clicked) row's PRIMARY action: an invoice opens its
   * edit page, a customer opens the invoices page filtered to them. The pill
   * toggle is click-only and never arrives here. CLOSE is emitted first so the
   * overlay is gone even when the destination route equals the current one.
   */
  static acmeQuickSearch$Activate(row = {}) {
    if (row.kind === 'invoice') {
      this.acmeQuickSearch$Close();
      this.sendChannelPayload('CHANNEL_ACME_QUICK_SEARCH_EDIT_INVOICE_EVENT', {
        invoiceId: String(row.invoiceId ?? ''),
      });
      return;
    }

    if (row.kind === 'customer') {
      this.acmeQuickSearch$Close();
      this.sendChannelPayload(
        'CHANNEL_ACME_QUICK_SEARCH_CUSTOMER_INVOICES_EVENT',
        { customerName: String(row.customerName ?? '') },
      );
    }
  }

  // ── Route ─────────────────────────────────────────────────────────────────

  static acmeQuickSearch$OnRouteChange() {
    if (this.props.isOpen === true) this.acmeQuickSearch$Close();
  }

  // ── State transitions ─────────────────────────────────────────────────────

  static acmeQuickSearch$Open() {
    if (this.props.isOpen === true) return;

    this.props.isOpen = true;
    // The query survives close/open; the view selects the input text so
    // typing replaces it. The results are rebuilt from the CURRENT dump.
    this.acmeQuickSearch$PublishResults('CHANNEL_ACME_QUICK_SEARCH_OPEN_EVENT');
  }

  static acmeQuickSearch$Close() {
    if (this.props.isOpen !== true) return;

    this.props.isOpen = false;
    this.sendChannelPayload('CHANNEL_ACME_QUICK_SEARCH_CLOSE_EVENT', {
      isOpen: false,
      query: this.props.query,
    });
  }

  /**
   * Builds and publishes the current match set. flatRows is held back on the
   * channel for Enter/highlight resolution; the payload carries the rendered
   * groups plus the highlight so one emission paints a complete overlay.
   */
  static acmeQuickSearch$PublishResults(action) {
    const results = buildQuickSearchResults(
      this.props.customers,
      this.props.invoices,
      this.props.query,
      RESULT_ICONS,
    );

    this.props.flatRows = results.flatRows;
    this.props.highlightIndex = clampHighlightIndex(
      this.props.highlightIndex,
      results.flatRows.length,
    );

    // flatRows stays channel-side (Enter/highlight resolution); the payload
    // carries only what the template renders plus the highlight.
    const templateResults = { ...results };
    delete templateResults.flatRows;

    this.sendChannelPayload(action, {
      isOpen: true,
      ...templateResults,
      highlightIndex: this.props.highlightIndex,
    });
  }
}
