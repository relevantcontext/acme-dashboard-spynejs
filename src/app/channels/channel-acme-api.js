import { Channel } from 'spyne';
import { AcmeApiChannelTraits } from 'traits/channel/acme-api-channel-traits.js';

/**
 * The intermediary between the Acme ChannelFetch instances and UI events.
 *
 * Views raise semantic UI events through broadcastEvents; this channel turns
 * them into requests against the ChannelFetch instances registered by
 * AcmeDbConnectionsTraits, and republishes the responses as the actions below.
 * No ViewStream subscribes to a fetch channel directly, so URL shapes and
 * request bodies stay in one place.
 *
 * All behaviour lives in AcmeApiChannelTraits — this class is structure and
 * event flow only.
 *
 * NOTE for consumers: register only ONE listener per action name in a given
 * ViewStream. A duplicate registration for the same action clobbers the first.
 */
export class ChannelAcmeApi extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_ACME_API';
    props.sendCachedPayload = true;
    props.traits = [AcmeApiChannelTraits];
    super(name, props);
  }

  onRegistered() {
    this.acmeApi$OnRegistered();
  }

  addRegisteredActions() {
    return [
      // Consumed by AcmeApiRequester, the null-appended ViewStream that
      // performs the actual fetch. Views do not listen for this.
      'CHANNEL_ACME_API_REQUEST_EVENT',
      'CHANNEL_ACME_API_SESSION_EVENT',
      'CHANNEL_ACME_API_AUTH_EVENT',
      'CHANNEL_ACME_API_CARDS_EVENT',
      'CHANNEL_ACME_API_INVOICES_EVENT',
      'CHANNEL_ACME_API_CUSTOMERS_EVENT',
      'CHANNEL_ACME_API_MUTATION_EVENT',
      'CHANNEL_ACME_API_ERROR_EVENT',
    ];
  }

  onViewStreamInfo() {}
}
