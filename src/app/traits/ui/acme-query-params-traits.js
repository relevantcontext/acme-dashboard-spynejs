import { SpyneTrait } from 'spyne';
import { INVOICE_PARAMS_EVENT } from 'utils/acme-invoice-utils.js';
import { CUSTOMER_PARAMS_EVENT } from 'utils/acme-utils.js';
import { buildAcmeSearch } from 'utils/acme-utils.js';

const CHANGE_EVENT_BY_ACTION = {
  CHANNEL_ACME_INVOICES_UPDATE_PARAMS_EVENT: INVOICE_PARAMS_EVENT,
  CHANNEL_ACME_CUSTOMERS_UPDATE_PARAMS_EVENT: CUSTOMER_PARAMS_EVENT,
  // The quick-search overlay's customer selection writes the INVOICES query —
  // the search channel cannot push into the invoices channel, so its params
  // action joins this map and the announced write is the meeting point.
  CHANNEL_ACME_SEARCH_UPDATE_INVOICE_PARAMS_EVENT: INVOICE_PARAMS_EVENT,
};

export class AcmeQueryParamsTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'acmeQueryParams$');
  }

  static acmeQueryParams$OnUpdate(e) {
    const { params, historyMode } = e?.payload || {};
    const changeEventName = CHANGE_EVENT_BY_ACTION[e?.action];

    if (!params || !changeEventName) return;

    const { pathname, search } = window.location;
    const nextSearch = buildAcmeSearch(search, params);
    const url = nextSearch === '' ? pathname : `${pathname}?${nextSearch}`;

    // The channel says which history verb its params deserve: keystrokes
    // amend one entry (replace, the default), a sort change is a step the
    // back button should return through (push). Either way neither call
    // fires an event of its own, so the loop is closed by the dispatch below.
    if (historyMode === 'push') {
      window.history.pushState({}, '', url);
    } else {
      window.history.replaceState({}, '', url);
    }
    window.dispatchEvent(new CustomEvent(changeEventName));
  }
}
