import { Channel } from 'spyne';
import { AcmeCustomersChannelTraits } from 'traits/db/db-customers-channel-traits.js';

/**
 * Customer matching and the message boundary for the customers page.
 *
 * Mirrors ChannelAcmeInvoices: window.location is the search AND page state,
 * this channel emits URL instructions and re-reads the result through
 * CHANNEL_WINDOW, and replay is true because a view mounting later needs the
 * latest match, not merely the next change. [choose-replay-semantics]
 *
 * All behaviour lives in AcmeCustomersChannelTraits — this class is structure
 * and event flow only.
 */
export class ChannelAcmeCustomers extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_ACME_CUSTOMERS';
    props.replay = true;
    props.traits = [AcmeCustomersChannelTraits];
    super(name, props);
  }

  onRegistered() {
    this.acmeCustomers$OnRegistered();
  }

  addRegisteredActions() {
    return [
      // An instruction to change the URL, consumed only by the query-params
      // null view. The resulting list arrives on the action below, after the
      // URL has actually moved.
      'CHANNEL_ACME_CUSTOMERS_UPDATE_PARAMS_EVENT',

      // Every customer id matching the current query, plus the resolved page.
      'CHANNEL_ACME_CUSTOMERS_LIST_EVENT',

      // The pagination ViewStream's page slice, relayed for the table. The
      // pair form auto-wires the incoming sendInfoToChannel transmit to the
      // trait method. [register-channel-action-vocabulary]
      [
        'CHANNEL_ACME_CUSTOMERS_VISIBLE_IDS_EVENT',
        'acmeCustomers$OnVisibleIds',
      ],
    ];
  }
}
