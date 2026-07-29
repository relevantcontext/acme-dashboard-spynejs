import { ViewStream } from 'spyne';
import { AcmeApiRequesterTraits } from 'traits/app/acme-api-requester-traits.js';

/**
 * The ViewStream half of the Acme data path.
 *
 * ChannelFetch requests can only be sent from a ViewStream — `sendInfoToChannel`
 * is a ViewStream method and Channel has no equivalent. This view exists purely
 * to satisfy that boundary: it renders nothing, is appended to null, and its
 * only job is to listen for instructions from ChannelAcmeApi and turn them into
 * fetch requests.
 *
 * It is persistent rather than spawned per request, so there is one subscriber
 * for the lifetime of the app instead of a view being created and disposed on
 * every keystroke of an invoice search.
 *
 * Appended in index.js alongside the channels, so the whole data path is
 * discoverable from one entry point.
 */
export class AcmeApiRequester extends ViewStream {
  constructor(props = {}) {
    props.channels = ['CHANNEL_ACME_API'];
    props.traits = [AcmeApiRequesterTraits];

    super(props);
  }

  addActionListeners() {
    // One listener per action name — a duplicate registration for the same
    // action clobbers the first.
    return [['CHANNEL_ACME_API_REQUEST_EVENT', 'acmeRequester$OnRequest']];
  }
}
