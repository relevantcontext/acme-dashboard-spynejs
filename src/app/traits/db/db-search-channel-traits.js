import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
import { filterInvoices } from 'utils/acme-invoice-utils.js';
import {
  filterCustomers,
  QUICK_SEARCH_MAX_PER_GROUP,
} from 'utils/acme-utils.js';

const KEYDOWN_ACTION = 'CHANNEL_WINDOW_KEYDOWN_EVENT';

/**
 * Logic for CHANNEL_ACME_SEARCH — the global quick-search state machine.
 *
 * The channel owns three facts: whether the overlay is open, what the current
 * query is, and what matches it. Everything that can open or close the overlay
 * — the Cmd/Ctrl-K shortcut, the sidenav affordance, Escape, a navigation, a
 * result activation — converges here, so "is the overlay open" has exactly one
 * author and the host/overlay pair only ever receive. [state-machine-in-channel]
 *
 * ── Matching is the same code the pages run ─────────────────────────────────
 *
 * The collections are held from CHANNEL_ACME_DATA's dump, and the match runs
 * filterInvoices / filterCustomers — the ILIKE-parity functions the invoices
 * and customers pages already use — so the overlay can never disagree with a
 * page about what a query matches. No request, no debounce: the search is an
 * in-memory filter per keystroke. [record:debounced-typeahead-search —
 * LOCAL-SYNCHRONOUS variant]
 *
 * ── No replay ───────────────────────────────────────────────────────────────
 *
 * Open/close and results are ephemeral events, not current-value state a late
 * subscriber should inherit: the overlay is born from OPEN and starts every
 * session blank, so replaying a previous session's RESULTS (or a stale CLOSE)
 * to a newly-born overlay would be wrong, not merely redundant.
 * [choose-replay-semantics]
 */
export class AcmeSearchChannelTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'acmeSearch$');
  }

  static acmeSearch$OnRegistered() {
    this.props.searchIsOpen = false;
    this.props.searchQuery = '';

    this.acmeSearch$ListenToData();
    this.acmeSearch$ListenToUiEvents();
    this.acmeSearch$ListenToKeydown();
    this.acmeSearch$ListenToRoute();
  }

  static acmeSearch$ListenToData() {
    const loadedFilter = new ChannelPayloadFilter({
      payload: (payload) => payload?.status?.isLoaded === true,
    });

    this.getChannel('CHANNEL_ACME_DATA', loadedFilter).subscribe(
      this.acmeSearch$OnData.bind(this),
    );
  }

  static acmeSearch$ListenToUiEvents() {
    const searchUiFilter = new ChannelPayloadFilter({
      eventType: 'acmeSearch',
      btnType: (btnType) =>
        [
          'open-quick-search',
          'close-quick-search',
          'quick-search',
          'select-customer',
        ].includes(btnType),
    });

    this.getChannel('CHANNEL_UI', searchUiFilter).subscribe(
      this.acmeSearch$OnUiEvent.bind(this),
    );
  }

  /**
   * The global shortcut. CHANNEL_WINDOW carries every keydown; this narrows by
   * action label and switches on the key inside the handler — the payload of a
   * generic window event is the native event, whose properties live on the
   * prototype, so a bare-key filter cannot see them. [window-event-via-channel]
   */
  static acmeSearch$ListenToKeydown() {
    const keydownFilter = new ChannelPayloadFilter({
      action: KEYDOWN_ACTION,
    });

    this.getChannel('CHANNEL_WINDOW', keydownFilter).subscribe(
      this.acmeSearch$OnKeydown.bind(this),
    );
  }

  /**
   * Any navigation closes the overlay: an edit-link activation, a customer
   * selection, a back button — the overlay must never survive onto a new page.
   */
  static acmeSearch$ListenToRoute() {
    const routeFilter = new ChannelPayloadFilter({
      action: 'CHANNEL_ROUTE_CHANGE_EVENT',
    });

    this.getChannel('CHANNEL_ROUTE', routeFilter).subscribe(
      this.acmeSearch$OnRoute.bind(this),
    );
  }

  // ── Inbound ───────────────────────────────────────────────────────────────

  /**
   * The dump landed or refreshed. Holding both collections here is what makes
   * OPEN gateable ("no data, no overlay — the guest pages never see it") and
   * what keeps an OPEN overlay fresh: a mutation republishes the dump, and the
   * republished results below let a row that stopped matching dispose itself
   * and the counts correct — the same freshness path every other surface has.
   */
  static acmeSearch$OnData(e) {
    this.props.searchInvoices = e?.payload?.data?.invoices || [];
    this.props.searchCustomers = e?.payload?.data?.customers || [];
    this.props.searchIsLoaded = true;

    if (this.props.searchIsOpen === true) {
      this.acmeSearch$PublishResults(true);
    }
  }

  static acmeSearch$OnUiEvent(e) {
    const { btnType, customerName } = e?.payload || {};

    if (btnType === 'open-quick-search') return this.acmeSearch$Open();
    if (btnType === 'close-quick-search') return this.acmeSearch$Close();
    if (btnType === 'select-customer') {
      return this.acmeSearch$SelectCustomer(customerName);
    }

    this.acmeSearch$OnQueryInput(e);
  }

  static acmeSearch$OnKeydown(e) {
    const evt = e?.payload || {};

    if (
      (evt.key === 'k' || evt.key === 'K') &&
      (evt.metaKey === true || evt.ctrlKey === true)
    ) {
      // Synchronous chain from the native listener, so the browser's own
      // Cmd/Ctrl-K binding can still be suppressed here.
      e?.event?.preventDefault?.();

      if (this.props.searchIsOpen === true) return this.acmeSearch$Close();
      return this.acmeSearch$Open();
    }

    if (evt.key === 'Escape' && this.props.searchIsOpen === true) {
      this.acmeSearch$Close();
    }
  }

  static acmeSearch$OnRoute() {
    if (this.props.searchIsOpen === true) this.acmeSearch$Close();
  }

  /**
   * A keystroke in the overlay's input. The value is read live off the
   * broadcasting element, exactly like the page searches. Unchanged values
   * (arrow keys, modifier keyups) publish nothing, so keyboard navigation in
   * the overlay never resets the result list under the highlight.
   */
  static acmeSearch$OnQueryInput(e) {
    const query = e?.srcElement?.el?.value ?? '';

    if (query === this.props.searchQuery) return;

    this.props.searchQuery = query;
    this.acmeSearch$PublishResults(false);
  }

  /**
   * The overlay transmits Enter-activations here; clicks arrive through
   * CHANNEL_UI. Both converge on the same select method.
   */
  static acmeSearch$OnViewStreamInfo(e) {
    if (e?.action !== 'CHANNEL_ACME_SEARCH_SELECT_EVENT') return;

    this.acmeSearch$SelectCustomer(e?.payload?.customerName);
  }

  // ── State transitions ─────────────────────────────────────────────────────

  static acmeSearch$Open() {
    // No data, no overlay: the dump exists only for an authenticated session,
    // so this one gate keeps the shortcut inert on the guest pages.
    if (this.props.searchIsLoaded !== true) return;
    if (this.props.searchIsOpen === true) return;

    this.props.searchIsOpen = true;
    this.props.searchQuery = '';

    this.sendChannelPayload('CHANNEL_ACME_SEARCH_OPEN_EVENT', {});
  }

  static acmeSearch$Close() {
    if (this.props.searchIsOpen !== true) return;

    this.props.searchIsOpen = false;

    this.sendChannelPayload('CHANNEL_ACME_SEARCH_CLOSE_EVENT', {});
  }

  /**
   * A customer result: land on the invoices page filtered to that customer.
   *
   * Three moves, in order. Close first, so the overlay is gone before the page
   * swaps. Then the route — the one carve-out by which a channel may navigate.
   * Then the query param, published as this channel's own params action: the
   * null view writes it onto the (now invoices) URL and announces the write,
   * and the invoices channel republishes its match — the same loop a keystroke
   * in the page's own search box travels. This channel never pushes into the
   * invoices channel; the window event is the meeting point.
   */
  static acmeSearch$SelectCustomer(customerName) {
    const name = String(customerName ?? '').trim();

    if (name === '') return;

    this.acmeSearch$Close();

    this.sendPayloadToRouteChannel({
      pageId: 'dashboard',
      topicId: 'invoices',
      optionId: '',
    });

    this.sendChannelPayload('CHANNEL_ACME_SEARCH_UPDATE_INVOICE_PARAMS_EVENT', {
      params: { query: name },
      historyMode: 'replace',
    });
  }

  // ── Outbound ──────────────────────────────────────────────────────────────

  /**
   * The match, both groups, one payload. An empty query publishes empty groups
   * rather than everything — matching "everything" is correct ILIKE semantics
   * for a list page but useless for a palette, whose empty state is a hint.
   *
   * Capped matches ride for rendering; uncapped totals ride for the counts.
   * isDataRefresh distinguishes "the data moved under the same query" (keep
   * the keyboard highlight) from "the query changed" (reset it).
   */
  static acmeSearch$PublishResults(isDataRefresh = false) {
    const query = String(this.props.searchQuery || '').trim();
    const hasQuery = query !== '';

    const customers = hasQuery
      ? filterCustomers(this.props.searchCustomers || [], query)
      : [];
    const invoices = hasQuery
      ? filterInvoices(this.props.searchInvoices || [], query)
      : [];

    this.sendChannelPayload('CHANNEL_ACME_SEARCH_RESULTS_EVENT', {
      query,
      totalCustomers: customers.length,
      totalInvoices: invoices.length,
      customerMatches: customers.slice(0, QUICK_SEARCH_MAX_PER_GROUP),
      invoiceMatches: invoices.slice(0, QUICK_SEARCH_MAX_PER_GROUP),
      isDataRefresh: isDataRefresh === true,
    });
  }
}
