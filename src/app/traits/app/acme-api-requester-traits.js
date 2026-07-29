import { SpyneTrait } from 'spyne';

/**
 * Logic for AcmeApiRequester.
 *
 * A ChannelFetch request can only be triggered by a ViewStream —
 * `sendInfoToChannel` is a ViewStream method and Channel has no equivalent, so
 * a channel cannot ask another channel to fetch. This trait is the ViewStream
 * side of that boundary: ChannelAcmeApi decides *what* to request, and this
 * turns the instruction into the actual sendInfoToChannel call.
 */
export class AcmeApiRequesterTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'acmeRequester$';
    super(context, traitPrefix);
  }

  /**
   * Receives CHANNEL_ACME_API_REQUEST_EVENT and forwards it to the named
   * ChannelFetch.
   *
   * `channelName` selects the target; everything else on the payload is the
   * fetch configuration. ChannelFetch reads only these keys:
   *   mapFn, url, header, headers, body, mode, method, responseType, debug
   *
   * The action MUST be the third argument to sendInfoToChannel. Passing it
   * inside the payload silently falls back to 'VIEWSTREAM_EVENT', which
   * ChannelFetch does not handle — the request never fires and nothing errors.
   */
  static acmeRequester$OnRequest(e) {
    const { channelName, ...fetchProps } = e.payload ?? {};

    if (!channelName) {
      console.warn(
        'Spyne Warning: AcmeApiRequester received a request with no channelName',
      );
      return;
    }

    this.sendInfoToChannel(
      channelName,
      fetchProps,
      `${channelName}_REQUEST_EVENT`,
    );
  }
}
