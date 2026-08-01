import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
import {
  filterInvoices,
  paginateInvoices,
  getTotalPages,
  generatePagination,
  readInvoiceParams,
  INVOICE_PARAMS_EVENT,
} from 'traits/utils/acme-invoice-utils.js';

// The custom window event InvoicesTableParamsNullView dispatches after it writes
// the URL. The label is derived here rather than written out, exactly as
// CHANNEL_WINDOW derives it, so the name has one definition — the same constant
// index.js registers and the null view dispatches.
const PARAMS_CHANGED_ACTION = `CHANNEL_WINDOW_${INVOICE_PARAMS_EVENT.toUpperCase()}_EVENT`;

// Back and forward. The route channel owns popstate through `window.onpopstate`
// — a property assignment, so nothing here may touch it — but CHANNEL_WINDOW
// binds with addEventListener, so both observe the same event without collision.
//
// It is needed because paging does not move routeData: /dashboard/invoices?page=2
// and ?page=3 are the same path, so the route channel sees no change and a
// history step would otherwise be invisible.
const POPSTATE_ACTION = 'CHANNEL_WINDOW_POPSTATE_EVENT';

/**
 * Logic for ChannelAcmeInvoices — search and pagination for the invoices table.
 *
 * ── The loop, and why it runs one way ───────────────────────────────────────
 *
 *   search / pagination UI event
 *     -> this channel            captures, emits UPDATE_PARAMS_EVENT
 *       -> InvoicesTableView     writes the URL — the ONLY writer
 *         -> custom window event
 *           -> CHANNEL_WINDOW
 *             -> this channel    reads location.search, resolves, emits
 *               -> InvoicesList
 *
 * This channel never holds `query` or `page`. window.location is the state, and
 * it is read fresh on every params event.
 *
 * That is the whole reason the write lives in the view. A channel that both
 * wrote and read the URL would have to tell its own edits apart from a deeplink
 * — identity is never implicit here, so that means a correlation mechanism
 * existing solely to undo an ambiguity it created. Writing elsewhere means the
 * question never arises: a bookmark, a back button and a keystroke all arrive by
 * the same path and are indistinguishable, correctly.
 *
 * The one rule that IS behaviour lives here rather than in the view: a new
 * search resets to page 1, while paging preserves the query. Next.js does the
 * same in search.tsx (`params.set('page', '1')`).
 *
 * ── What it does hold ───────────────────────────────────────────────────────
 *
 * The invoices themselves, from CHANNEL_ACME_DATA. A channel cannot pull from
 * another synchronously, so the set is kept to resolve against — that is a data
 * cache, not UI state, and it is replaced wholesale whenever the dump changes.
 */
export class AcmeInvoicesChannelTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'acmeInvoices$';
    super(context, traitPrefix);
  }

  // ── Wiring ────────────────────────────────────────────────────────────────

  static acmeInvoices$OnRegistered() {
    this.acmeInvoices$ListenToData();
    this.acmeInvoices$ListenToUiEvents();
    this.acmeInvoices$ListenToParams();
  }

  /**
   * The set to resolve against. Admits only payloads carrying a landed dump,
   * which also excludes CHANNEL_ACME_DATA_REQUEST_EVENT — fetch config with no
   * status at all. [admit-by-payload-filter]
   */
  static acmeInvoices$ListenToData() {
    const loadedFilter = new ChannelPayloadFilter({
      payload: (payload) => payload?.status?.isLoaded === true,
    });

    this.getChannel('CHANNEL_ACME_DATA', loadedFilter).subscribe(
      this.acmeInvoices$OnData.bind(this),
    );
  }

  /**
   * Search and pagination arrive as ordinary UI broadcasts. The views declare
   * them and carry nothing else — no handler, no state, no URL writing.
   *
   * Two subscriptions rather than one because UISearchView is shared with the
   * customers table: its eventType is `acmeSearch` for both, and btnType is what
   * says which list a keystroke belongs to.
   */
  static acmeInvoices$ListenToUiEvents() {
    const searchFilter = new ChannelPayloadFilter({
      eventType: 'acmeSearch',
      btnType: 'filter-invoices',
    });

    this.getChannel('CHANNEL_UI', searchFilter).subscribe(
      this.acmeInvoices$OnSearchEvent.bind(this),
    );

    const pageFilter = new ChannelPayloadFilter({
      eventType: 'acmeInvoices',
      btnType: 'page',
    });

    this.getChannel('CHANNEL_UI', pageFilter).subscribe(
      this.acmeInvoices$OnPageEvent.bind(this),
    );
  }

  /**
   * The only way this channel learns what the params are.
   *
   * Both entries run the same method: a custom event after the table writes, and
   * popstate for back/forward. Neither payload is read — the event says "the URL
   * moved", and location.search says what it moved to.
   */
  static acmeInvoices$ListenToParams() {
    const paramsActionsPayloadFilter = new ChannelPayloadFilter({
      action: (a) => [PARAMS_CHANGED_ACTION, POPSTATE_ACTION].includes(a),
    });

    this.getChannel('CHANNEL_WINDOW', paramsActionsPayloadFilter).subscribe(
      this.acmeInvoices$OnParamsChanged.bind(this),
    );
  }

  // ── Inbound ───────────────────────────────────────────────────────────────

  static acmeInvoices$OnData(e) {
    this.props.invoices = e?.payload?.data?.invoices || [];
    this.acmeInvoices$PublishList();
  }

  static acmeInvoices$OnParamsChanged() {
    this.acmeInvoices$PublishList();
  }

  /**
   * A new search returns to page 1 — otherwise a narrowed set leaves the user on
   * a page that no longer exists.
   *
   * The value is read live off the element rather than from any stored copy —
   * CHANNEL_UI reports the raising element, and its current value is the truth.
   */
  static acmeInvoices$OnSearchEvent(e) {
    const query = e?.srcElement?.el?.value ?? '';

    this.acmeInvoices$PublishParams({ query, page: 1 });
  }

  /**
   * Paging preserves the query, so only `page` is sent and the table keeps the
   * rest of the URL as it is.
   */
  static acmeInvoices$OnPageEvent(e) {
    const page = Number(e?.payload?.page);

    if (!Number.isFinite(page) || page < 1) return;

    this.acmeInvoices$PublishParams({ page });
  }

  // ── Outbound ──────────────────────────────────────────────────────────────

  /**
   * An instruction, not a state change. The table applies it to the URL, and
   * this channel finds out what happened the same way a bookmark would.
   *
   * No history mode rides it. Every params write REPLACES — see the null view
   * for why — so there is nothing here to select.
   */
  static acmeInvoices$PublishParams(params) {
    this.sendChannelPayload('CHANNEL_ACME_INVOICES_UPDATE_PARAMS_EVENT', {
      params,
    });
  }

  /**
   * Resolves the current URL against the held set and emits a finished list.
   *
   * Everything the table and the pager need is computed here so neither has to:
   * the rows for this page, the page count for THIS query (a narrowed search has
   * fewer pages), and the ellipsis-aware page sequence.
   */
  static acmeInvoices$PublishList() {
    const { query, page } = readInvoiceParams(window.location.search);
    const invoices = this.props.invoices || [];

    const filtered = filterInvoices(invoices, query);
    const totalPages = getTotalPages(filtered.length);
    const paginated = paginateInvoices(filtered, page);

    this.sendChannelPayload('CHANNEL_ACME_INVOICES_LIST_EVENT', {
      invoices: paginated,

      // The ids on this page, in order. The table renders every invoice once
      // and treats a query as a visibility pass, so what it needs is not the
      // rows but the answer to "which of the rows I already have, and which of
      // those is first and last". Resolving that here keeps the view's work to
      // a Set membership test per row.
      pageIds: paginated.map((invoice) => invoice.id),

      // Every id the channel currently holds, unfiltered — the answer to "does
      // this invoice still exist", which is a different question from "is it on
      // this page". A row absent from the PAGE hides; a row absent from HERE has
      // been deleted and disposes itself. Without the distinction a deleted row
      // would merely hide, and its view would outlive its record.
      allIds: invoices.map((invoice) => invoice.id),
      pages: generatePagination(page, totalPages),
      totalPages,
      page,
      query,
      filtered,
      totalFiltered: filtered.length,
    });
  }
}
