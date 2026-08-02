import { Channel } from 'spyne';
import { AcmeCustomersChannelTraits } from 'traits/channel/acme-customers-channel-traits.js';

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
      'CHANNEL_ACME_CUSTOMERS_UPDATE_PARAMS_EVENT',
      'CHANNEL_ACME_CUSTOMERS_LIST_EVENT',
    ];
  }
}
