import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
import {
  CUSTOMER_PARAMS_EVENT,
  filterCustomers,
  readCustomerParams,
} from 'utils/acme-customer-utils.js';

const PARAMS_CHANGED_ACTION = `CHANNEL_WINDOW_${CUSTOMER_PARAMS_EVENT.toUpperCase()}_EVENT`;
const POPSTATE_ACTION = 'CHANNEL_WINDOW_POPSTATE_EVENT';

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

  static acmeCustomers$OnSearch(e) {
    const query = e?.srcElement?.el?.value ?? '';

    this.sendChannelPayload('CHANNEL_ACME_CUSTOMERS_UPDATE_PARAMS_EVENT', {
      params: { query },
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

  static acmeCustomers$PublishList() {
    const { query } = readCustomerParams(window.location.search);
    const customers = this.props.customers || [];
    const filtered = filterCustomers(customers, query);

    this.sendChannelPayload('CHANNEL_ACME_CUSTOMERS_LIST_EVENT', {
      matchedIds: filtered.map(({ id }) => id),
      allIds: customers.map(({ id }) => id),
      query,
      totalMatched: filtered.length,
    });
  }
}
