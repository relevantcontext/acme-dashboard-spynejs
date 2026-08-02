import { ViewStream } from 'spyne';
import { AcmeQueryParamsTraits } from 'traits/app/acme-query-params-traits.js';

export class AcmeQueryParamsNullView extends ViewStream {
  constructor(props = {}) {
    props.channels = ['CHANNEL_ACME_INVOICES', 'CHANNEL_ACME_CUSTOMERS'];
    props.traits = [AcmeQueryParamsTraits];

    super(props);
  }

  addActionListeners() {
    return [
      ['CHANNEL_ACME_INVOICES_UPDATE_PARAMS_EVENT', 'acmeQueryParams$OnUpdate'],
      [
        'CHANNEL_ACME_CUSTOMERS_UPDATE_PARAMS_EVENT',
        'acmeQueryParams$OnUpdate',
      ],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
