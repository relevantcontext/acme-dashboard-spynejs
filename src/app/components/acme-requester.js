import { ViewStream } from 'spyne';
import { AcmeRequesterTraits } from 'traits/acme-requester-traits.js';

/**
 * The ViewStream half of the Acme request path.
 *
 * ChannelFetch requests can only be sent from a ViewStream — `sendInfoToChannel`
 * is a ViewStream method and Channel has no equivalent. This view exists purely
 * to satisfy that boundary: it renders nothing, is appended to null, and its
 * only job is to turn request instructions into fetch requests.
 *
 * ── Why one requester for two channels ──────────────────────────────────────
 *
 * ChannelAcmeAuth and ChannelAcmeData publish the same shape — a `channelName`
 * plus fetch props — and the handler dispatches on that name. A requester per
 * channel would be symmetrical and entirely redundant, since neither the payload
 * nor the handling differs by origin.
 *
 * Routing is the one exception to this whole pattern and needs nothing here:
 * Channel ships `sendPayloadToRouteChannel`, which spins up its own temporary
 * view and disposes it after the broadcast.
 *
 * It is persistent rather than spawned per request, so there is one subscriber
 * for the lifetime of the app instead of a view created and disposed on every
 * request.
 *
 * Appended in index.js alongside the channels, so the whole request path is
 * discoverable from one entry point.
 */
export class AcmeRequester extends ViewStream {
  constructor(props = {}) {
    props.channels = ['CHANNEL_ACME_AUTH', 'CHANNEL_ACME_DATA'];
    props.traits = [AcmeRequesterTraits];

    super(props);
  }

  addActionListeners() {
    // One listener per action name — a duplicate registration for the same
    // action clobbers the first. These are two distinct names, so both stand.
    return [
      ['CHANNEL_ACME_AUTH_REQUEST_EVENT', 'acmeRequester$OnRequest'],
      ['CHANNEL_ACME_DATA_REQUEST_EVENT', 'acmeRequester$OnRequest'],
    ];
  }
}
