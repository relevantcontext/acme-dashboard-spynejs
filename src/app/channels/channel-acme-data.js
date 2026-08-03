import { Channel } from 'spyne';
import { AcmeDataChannelTraits } from 'traits/acme-data-channel-traits.js';

/**
 * Every read and write of Acme business data.
 *
 * The second of the two Acme channels a view subscribes to. It emits only when
 * it has data or a data outcome — never auth lifecycle, which is
 * CHANNEL_ACME_AUTH's job.
 *
 * ── When it first speaks ────────────────────────────────────────────────────
 *
 * Not at boot. It waits for CHANNEL_ACME_AUTH to report an authenticated user,
 * requests /api/bootstrap, and emits DATA_LOADED once that returns. A page can
 * therefore treat any emission as "there is data" rather than having to check.
 *
 * ── Replay ──────────────────────────────────────────────────────────────────
 *
 * This is a current-value channel, not an ephemeral-event one: a page mounting
 * after the dump has landed needs the data, so it replays. [choose-replay-semantics]
 *
 * The consequence every action must respect is in acmeData$Publish.
 *
 * All behaviour lives in AcmeDataChannelTraits — this class is structure and
 * event flow only.
 *
 * NOTE for consumers: register only ONE listener per action name in a given
 * ViewStream. A duplicate registration for the same action clobbers the first.
 */
export class ChannelAcmeData extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_ACME_DATA';
    props.replay = true;
    props.traits = [AcmeDataChannelTraits];
    super(name, props);
  }

  onRegistered() {
    this.acmeData$OnRegistered();
  }

  addRegisteredActions() {
    return [
      // Consumed by AcmeRequester. Views do not listen for this.
      'CHANNEL_ACME_DATA_REQUEST_EVENT',
      'CHANNEL_ACME_DATA_INVOICE_SUBMIT_EVENT',

      // The dump landed. LOADED is the first one after authentication; UPDATED
      // is every refresh after a mutation. Split so a view can render on first
      // load and re-render on change without inspecting a flag — the same split
      // as the auth channel's INIT / CHANGED.
      'CHANNEL_ACME_DATA_LOADED_EVENT',
      'CHANNEL_ACME_DATA_UPDATED_EVENT',

      // A create / update / delete returned, carrying the API's own message for
      // form-level feedback. DATA_UPDATED follows once the refreshed dump lands.
      'CHANNEL_ACME_DATA_MUTATION_EVENT',

      // Any failed request. Carries the url that failed — error payloads are
      // built from real request metadata, unlike success payloads, which all
      // report the fetch channel's constructor url.
      'CHANNEL_ACME_DATA_ERROR_EVENT',
    ];
  }

  onViewStreamInfo(e) {
    this.acmeData$OnViewStreamInfo(e);
  }
}
