import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
import {
  filterInvoices,
  sortInvoices,
  nextInvoiceSortValue,
  readInvoiceParams,
  INVOICE_PARAMS_EVENT,
  INVOICE_MOBILE_QUERY,
} from 'utils/acme-invoice-utils.js';

const PARAMS_CHANGED_ACTION = `CHANNEL_WINDOW_${INVOICE_PARAMS_EVENT.toUpperCase()}_EVENT`;
const POPSTATE_ACTION = 'CHANNEL_WINDOW_POPSTATE_EVENT';

/**
 * Invoice matching and message routing for ChannelAcmeInvoices.
 *
 * The channel holds the authoritative invoice collection so it can answer the
 * domain question "which invoices match this query?" It owns no pagination
 * state and performs no pagination calculation.
 *
 * Pagination is a handshake:
 *
 *   control CHANNEL_UI request
 *     -> this channel validates and emits PAGINATION_EVENT
 *       -> pagination ViewStream updates its local PaginationTraits state
 *         -> visible IDs return through onViewStreamInfo
 *           -> this channel relays VISIBLE_IDS_EVENT to the table
 */
export class AcmeInvoicesChannelTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'acmeInvoices$');
  }

  static acmeInvoices$OnRegistered() {
    // Seeded from a direct read, not from the channel: the WINDOW mediaQuery
    // observable is fromEventPattern over matchMedia's change listener, so it
    // emits on CROSSINGS only — a page loaded at mobile width would otherwise
    // wait for a resize to learn what it is. Same precedent as reading
    // location.search: the browser holds the state, the channel conforms it.
    this.props.isMobile = window.matchMedia(INVOICE_MOBILE_QUERY).matches;

    this.acmeInvoices$ListenToData();
    this.acmeInvoices$ListenToUiEvents();
    this.acmeInvoices$ListenToParams();
    this.acmeInvoices$ListenToRoute();
    this.acmeInvoices$ListenToMediaQuery();
  }

  static acmeInvoices$ListenToData() {
    const loadedFilter = new ChannelPayloadFilter({
      payload: (payload) => payload?.status?.isLoaded === true,
    });

    this.getChannel('CHANNEL_ACME_DATA', loadedFilter).subscribe(
      this.acmeInvoices$OnData.bind(this),
    );
  }

  static acmeInvoices$ListenToUiEvents() {
    const searchFilter = new ChannelPayloadFilter({
      eventType: 'acmeSearch',
      btnType: 'filter-invoices',
    });

    this.getChannel('CHANNEL_UI', searchFilter).subscribe(
      this.acmeInvoices$OnSearchEvent.bind(this),
    );

    const paginationFilter = new ChannelPayloadFilter({
      eventType: 'acmeInvoices',
      btnType: 'pagination',
    });

    this.getChannel('CHANNEL_UI', paginationFilter).subscribe(
      this.acmeInvoices$OnPaginationRequest.bind(this),
    );

    const sortFilter = new ChannelPayloadFilter({
      eventType: 'acmeInvoices',
      btnType: 'sort',
    });

    this.getChannel('CHANNEL_UI', sortFilter).subscribe(
      this.acmeInvoices$OnSortRequest.bind(this),
    );

    const formNavigationFilter = new ChannelPayloadFilter({
      eventType: 'acmeInvoices',
      btnType: (btnType) => ['create', 'edit', 'cancel'].includes(btnType),
    });
    this.getChannel('CHANNEL_UI', formNavigationFilter).subscribe(
      this.acmeInvoices$OnFormNavigation.bind(this),
    );
  }

  static acmeInvoices$ListenToParams() {
    const paramsActionsPayloadFilter = new ChannelPayloadFilter({
      action: (action) =>
        [PARAMS_CHANGED_ACTION, POPSTATE_ACTION].includes(action),
    });

    this.getChannel('CHANNEL_WINDOW', paramsActionsPayloadFilter).subscribe(
      this.acmeInvoices$OnParamsChanged.bind(this),
    );
  }

  /**
   * The raw window fact becomes domain vocabulary here: mediaQueryName
   * 'mobile' arrives as {matches}, leaves as DISPLAY_EVENT {isMobile}. One
   * subscriber conforms; everything downstream speaks invoices, not viewports.
   * 
   */
  static acmeInvoices$ListenToMediaQuery() {
    const mobileQueryFilter = new ChannelPayloadFilter({
      mediaQueryName: 'mobile',
    });

    this.getChannel('CHANNEL_WINDOW', mobileQueryFilter).subscribe(
      this.acmeInvoices$OnMediaQuery.bind(this),
    );
  }

  static acmeInvoices$OnMediaQuery(e) {
    this.props.isMobile = e?.payload?.matches === true;

    this.sendChannelPayload('CHANNEL_ACME_INVOICES_DISPLAY_EVENT', {
      isMobile: this.props.isMobile,
    });
  }

  static acmeInvoices$ListenToRoute() {
    const routeFilter = new ChannelPayloadFilter({
      action: 'CHANNEL_ROUTE_CHANGE_EVENT',
    });

    this.getChannel('CHANNEL_ROUTE', routeFilter).subscribe(
      this.acmeInvoices$OnRoute.bind(this),
    );
  }

  /**
   * A full-state dump landed — first load, optimistic apply, rollback or
   * authoritative refresh; this channel does not care which. It conforms the
   * raw fact "the collection changed" into two domain vocabularies:
   *
   *   STATUS_EVENT  per invoice whose status differs from the previously held
   *                 collection — the payload a mounted row repaints from.
   *                 Emitted BEFORE PublishList, so the synchronous chain that
   *                 follows (LIST -> pagination -> VISIBLE_IDS relay) is what
   *                 the replay cache ends the turn holding — no subscriber can
   *                 ever be born onto the partial STATUS payload.
   *   LIST_EVENT    the recomputed match, flagged isDataRefresh so pagination
   *                 keeps the current page rather than treating a data refresh
   *                 like a new search. 
   */
  static acmeInvoices$OnData(e) {
    const prevInvoices = this.props.invoices;
    const nextInvoices = e?.payload?.data?.invoices || [];

    this.props.invoices = nextInvoices;
    this.props.customerOptions = e?.payload?.data?.customerOptions || [];

    if (Array.isArray(prevInvoices) === true) {
      const prevStatusById = new Map(
        prevInvoices.map(({ id, status }) => [String(id), status]),
      );

      nextInvoices.forEach(({ id, status }) => {
        const prevStatus = prevStatusById.get(String(id));

        if (prevStatus === undefined || prevStatus === status) return;

        this.sendChannelPayload('CHANNEL_ACME_INVOICES_STATUS_EVENT', {
          invoiceId: String(id),
          invoiceStatus: status,
          isPaid: status === 'paid',
        });
      });
    }

    this.acmeInvoices$PublishList(true);
  }

  static acmeInvoices$OnFormNavigation(e) {
    const { btnType, invoiceId } = e?.payload || {};
    const customers = this.props.customerOptions || [];

    if (btnType === 'cancel') {
      this.sendPayloadToRouteChannel({
        pageId: 'dashboard',
        topicId: 'invoices',
        optionId: '',
      });
      return;
    }

    if (btnType === 'create') {
      this.sendChannelPayload('CHANNEL_ACME_INVOICES_CREATE_EVENT', {
        customers,
      });
      this.sendPayloadToRouteChannel({
        pageId: 'dashboard',
        topicId: 'invoices',
        optionId: 'create',
      });
      return;
    }

    const invoice = (this.props.invoices || []).find(
      ({ id }) => String(id) === String(invoiceId),
    );
    if (!invoice) return;

    const customerId =
      invoice.customer_id ??
      customers.find(({ name }) => name === invoice.name)?.id;

    this.sendChannelPayload('CHANNEL_ACME_INVOICES_EDIT_EVENT', {
      customers,
      invoice: {
        ...invoice,
        customer_id: customerId,
        amount: Number(invoice.amount) / 100,
      },
    });
    this.sendPayloadToRouteChannel({
      pageId: 'dashboard',
      topicId: 'invoices',
      optionId: 'edit',
    });
  }

  static acmeInvoices$OnParamsChanged() {
    this.acmeInvoices$PublishList();
  }

  static acmeInvoices$OnRoute(e) {
    const { pageId, topicId, optionId } = e?.payload?.routeData || {};
    const isInvoicesList =
      pageId === 'dashboard' &&
      topicId === 'invoices' &&
      (optionId === '' || optionId === undefined);

    if (isInvoicesList) this.acmeInvoices$PublishList();
  }

  static acmeInvoices$OnSearchEvent(e) {
    const query = e?.srcElement?.el?.value ?? '';

    this.acmeInvoices$PublishParams({ query });
  }

  /**
   * A header click asks for a sort; the current sort lives in the URL, so the
   * transition is computed from there rather than from held state — same
   * column flips direction, a new column starts ascending.
   *
   * Pushed rather than replaced: each sort is a distinct view of the list the
   * back button should return through, where keystrokes are amendments to one
   * search. The popstate listener above already closes that loop.
   */
  static acmeInvoices$OnSortRequest(e) {
    const clickedKey = e?.payload?.sortKey;
    const { sortKey, sortDir } = readInvoiceParams(window.location.search);
    const sort = nextInvoiceSortValue(sortKey, sortDir, clickedKey);

    if (sort === '') return;

    this.acmeInvoices$PublishParams({ sort }, 'push');
  }

  /**
   * A control can request a page but cannot change one. The declared channel
   * action below is the only event the pagination ViewStream treats as a page
   * transition.
   */
  static acmeInvoices$OnPaginationRequest(e) {
    const pageNumber = Number(e?.payload?.pageNumber);

    if (!Number.isFinite(pageNumber) || pageNumber < 1) return;

    this.sendChannelPayload('CHANNEL_ACME_INVOICES_PAGINATION_EVENT', {
      pageNumber: Math.floor(pageNumber),
    });
  }

  static acmeInvoices$PublishParams(params, historyMode = 'replace') {
    this.sendChannelPayload('CHANNEL_ACME_INVOICES_UPDATE_PARAMS_EVENT', {
      params,
      historyMode,
    });
  }

  /**
   * Emits all ordered matches; the local pagination trait slices them.
   *
   * The sort executes HERE, on the full match set before the slice — sorting a
   * page would order six rows against each other and nothing else. matchedIds
   * carries the order; pagination and the table never re-derive it.
   */
  static acmeInvoices$PublishList(isDataRefresh = false) {
    const { query, sortKey, sortDir } = readInvoiceParams(
      window.location.search,
    );
    const invoices = this.props.invoices || [];
    const filtered = filterInvoices(invoices, query);
    const ordered = sortInvoices(filtered, sortKey, sortDir);

    // isMobile rides EVERY emission, not only DISPLAY_EVENT. The channel
    // replays one payload, so a table born after the last breakpoint crossing
    // must find the current mode in whatever payload it replays — complete
    // state on every action, or a late subscriber renders the wrong layout.
    // sortKey/sortDir ride for the same reason: a late-born table must paint
    // its header indicator from whatever payload it replays.
    // isDataRefresh distinguishes "the DATA changed under the same view" (a
    // mutation landed — pagination should hold its page) from "the VIEW of the
    // data changed" (search/sort/route — pagination restarts at page one, as
    // it always has).
    this.sendChannelPayload('CHANNEL_ACME_INVOICES_LIST_EVENT', {
      matchedIds: ordered.map((invoice) => invoice.id),
      query,
      totalMatched: ordered.length,
      isMobile: this.props.isMobile === true,
      sortKey,
      sortDir,
      isDataRefresh: isDataRefresh === true,
    });
  }

  /**
   * Relays a view result without storing or interpreting pagination state.
   * Composed, not mutated: the display mode joins the pagination view's frozen
   * payload on a new envelope, so the relay also satisfies the complete-state
   * rule for the payload the table actually consumes.
   * 
   */
  static acmeInvoices$OnViewStreamInfo(e) {
    const { action, payload } = e || {};

    if (action !== 'CHANNEL_ACME_INVOICES_VISIBLE_IDS_EVENT') return;

    // Sort joins the relay the same way isMobile does — read live from the
    // URL, the one authority PublishList also reads, so the two payloads
    // cannot disagree. The table paints order and indicator from this one
    // envelope.
    const { sortKey, sortDir } = readInvoiceParams(window.location.search);

    this.sendChannelPayload(action, {
      ...payload,
      isMobile: this.props.isMobile === true,
      sortKey,
      sortDir,
    });
  }
}
