import { SpyneTrait } from 'spyne';
import { INVOICE_PARAMS_EVENT } from 'utils/acme-invoice-utils.js';
import { CUSTOMER_PARAMS_EVENT } from 'utils/acme-utils.js';
import { buildAcmeSearch } from 'utils/acme-utils.js';

const CHANGE_EVENT_BY_ACTION = {
  CHANNEL_ACME_INVOICES_UPDATE_PARAMS_EVENT: INVOICE_PARAMS_EVENT,
  CHANNEL_ACME_CUSTOMERS_UPDATE_PARAMS_EVENT: CUSTOMER_PARAMS_EVENT,
};

export class AcmeQueryParamsTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'acmeQueryParams$');
  }

  static acmeQueryParams$OnUpdate(e) {
    const { params } = e?.payload || {};
    const changeEventName = CHANGE_EVENT_BY_ACTION[e?.action];

    if (!params || !changeEventName) return;

    const { pathname, search } = window.location;
    const nextSearch = buildAcmeSearch(search, params);
    const url = nextSearch === '' ? pathname : `${pathname}?${nextSearch}`;

    window.history.replaceState({}, '', url);
    window.dispatchEvent(new CustomEvent(changeEventName));
  }
}
