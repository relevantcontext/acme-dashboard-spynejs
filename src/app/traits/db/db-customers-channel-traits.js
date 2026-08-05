import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
import {
  CUSTOMER_PARAMS_EVENT,
  filterCustomers,
  readCustomerParams,
} from 'utils/acme-utils.js';

const PARAMS_CHANGED_ACTION = `CHANNEL_WINDOW_${CUSTOMER_PARAMS_EVENT.toUpperCase()}_EVENT`;
const POPSTATE_ACTION = 'CHANNEL_WINDOW_POPSTATE_EVENT';

/**
 * Customer matching and message routing for ChannelAcmeCustomers.
 *
 * The channel holds the authoritative customer collection so it can answer
 * "which customers match this query?" It owns no pagination state and performs
 * no pagination calculation — the page, like the query, lives in the URL:
 *
 *   control CHANNEL_UI request
 *     -> this channel validates and emits UPDATE_PARAMS (a URL instruction)
 *       -> the query-params null view writes the URL and announces it
 *         -> this channel re-reads the URL and emits LIST with the resolved page
 *           -> the pagination ViewStream slices; visible IDs return through
 *              the registered VISIBLE_IDS action to the table
 *
 * Because every page transition round-trips through window.location, a page
 * click, a bookmark and a back/forward step arrive by one path and are
 * indistinguishable — the same loop the search box already rides.
 */
export class AcmeCustomersChannelTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'acmeCustomers$');
  }

  static acmeCustomers$OnRegistered() {
    this.acmeCustomers$ListenToData();
    this.acmeCustomers$ListenToUi();
    this.acmeCustomers$ListenToParams();
    this.acmeCustomers$ListenToRoute();
  }

  static acmeCustomers$ListenToData() {
    const loadedFilter = new ChannelPayloadFilter({
      payload: (payload) => payload?.status?.isLoaded === true,
    });

    this.getChannel('CHANNEL_ACME_DATA', loadedFilter).subscribe(
      this.acmeCustomers$OnData.bind(this),
    );
  }

  static acmeCustomers$ListenToUi() {
    const searchFilter = new ChannelPayloadFilter({
      eventType: 'acmeSearch',
      btnType: 'filter-customers',
    });

    this.getChannel('CHANNEL_UI', searchFilter).subscribe(
      this.acmeCustomers$OnSearch.bind(this),
    );

    const paginationFilter = new ChannelPayloadFilter({
      eventType: 'acmeCustomers',
      btnType: 'pagination',
    });

    this.getChannel('CHANNEL_UI', paginationFilter).subscribe(
      this.acmeCustomers$OnPaginationRequest.bind(this),
    );
  }

  static acmeCustomers$ListenToParams() {
    const paramsFilter = new ChannelPayloadFilter({
      action: (action) =>
        [PARAMS_CHANGED_ACTION, POPSTATE_ACTION].includes(action),
    });

    this.getChannel('CHANNEL_WINDOW', paramsFilter).subscribe(
      this.acmeCustomers$PublishList.bind(this),
    );
  }

  static acmeCustomers$ListenToRoute() {
    const routeFilter = new ChannelPayloadFilter({
      action: 'CHANNEL_ROUTE_CHANGE_EVENT',
    });

    this.getChannel('CHANNEL_ROUTE', routeFilter).subscribe(
      this.acmeCustomers$OnRoute.bind(this),
    );
  }

  static acmeCustomers$OnData(e) {
    this.props.customers = e?.payload?.data?.customers || [];
    this.acmeCustomers$PublishList();
  }

  /**
   * A new search is a new VIEW of the data, so it restarts at page one:
   * clearing the `page` key (empty string deletes through buildAcmeSearch)
   * IS page one, and leaves the URL as clean as before pagination existed.
   * Keystrokes amend one history entry — the default replace — exactly as
   * they always have.
   */
  static acmeCustomers$OnSearch(e) {
    const query = e?.srcElement?.el?.value ?? '';

    this.sendChannelPayload('CHANNEL_ACME_CUSTOMERS_UPDATE_PARAMS_EVENT', {
      params: { query, page: '' },
    });
  }

  /**
   * A control can request a page but cannot change one — the request becomes
   * a URL write, and only the announced write moves the list. Pushed rather
   * than replaced: each page is a distinct view of the list the back button
   * should return through, the same ruling as the invoices sort. Page one
   * deletes the key, so the first page's URL is canonical.
   */
  static acmeCustomers$OnPaginationRequest(e) {
    const pageNumber = Number(e?.payload?.pageNumber);

    if (!Number.isFinite(pageNumber) || pageNumber < 1) return;

    this.sendChannelPayload('CHANNEL_ACME_CUSTOMERS_UPDATE_PARAMS_EVENT', {
      params: { page: pageNumber <= 1 ? '' : String(Math.floor(pageNumber)) },
      historyMode: 'push',
    });
  }

  static acmeCustomers$OnRoute(e) {
    const { pageId, topicId, optionId } = e?.payload?.routeData || {};
    const isCustomersList =
      pageId === 'dashboard' &&
      topicId === 'customers' &&
      (optionId === '' || optionId === undefined);

    if (isCustomersList) this.acmeCustomers$PublishList();
  }

  /**
   * Emits all ordered matches; the pagination ViewStream slices them.
   * pageNumber rides every emission so any LIST is complete state — a
   * subscriber born late replays the current page, not merely the current
   * match set. [state-machine-in-channel]
   */
  static acmeCustomers$PublishList() {
    const { query, page } = readCustomerParams(window.location.search);
    const customers = this.props.customers || [];
    const filtered = filterCustomers(customers, query);

    this.sendChannelPayload('CHANNEL_ACME_CUSTOMERS_LIST_EVENT', {
      matchedIds: filtered.map(({ id }) => id),
      query,
      pageNumber: page,
      totalMatched: filtered.length,
    });
  }

  /**
   * Relays the pagination view's result without storing or interpreting it —
   * auto-wired from the registered VISIBLE_IDS action pair. The payload is
   * frozen on arrival, so the relay re-emits a copy.
   * [register-channel-action-vocabulary] [clone-frozen-payload]
   */
  static acmeCustomers$OnVisibleIds(e) {
    this.sendChannelPayload('CHANNEL_ACME_CUSTOMERS_VISIBLE_IDS_EVENT', {
      ...e?.payload,
    });
  }
}
