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
      // Auth lifecycle. INIT_AUTH is always this channel's FIRST emission — it
      // resolves from the unpaused session request at boot, and ChannelApp
      // merges this channel expecting exactly that. AUTH_CHANGED follows only
      // when the identity actually changes, not on every re-check.
      'CHANNEL_ACME_API_INIT_AUTH_EVENT',
      'CHANNEL_ACME_API_AUTH_CHANGED_EVENT',

      // Fires on every /api/auth/session response, including a re-check that
      // changed nothing, and carries didRequestFail when the request itself
      // failed. The two actions above describe the lifecycle; this one just
      // reports that the server was asked.
      'CHANNEL_ACME_API_SESSION_EVENT',

      // Login outcome, split so a view can listen for one or the other without
      // inspecting the payload. SUCCESS carries { user }; FAILED carries the
      // API's own message — 'Invalid credentials.' — plus the HTTP status.
      'CHANNEL_ACME_API_LOGIN_SUCCESS_EVENT',
      'CHANNEL_ACME_API_LOGIN_FAILED_EVENT',

      // Sign out succeeded — the session cookie has been cleared server-side.
      'CHANNEL_ACME_API_LOGOUT_EVENT',

      // Any other auth outcome, including a failed sign out.
      'CHANNEL_ACME_API_AUTH_EVENT',

      // The data dump landed in SpyneAppProperties. LOADED is the first one
      // after authentication; UPDATED is every refresh after a mutation. They
      // are split so a view can render on first load and re-render on change
      // without inspecting a flag — the same split as INIT_AUTH / AUTH_CHANGED.
      //
      // A view that mounts after the dump has landed does not need either of
      // these: it reads AcmeDataStateTraits.acmeData$Get() in onRendered. These
      // exist for views already on screen when the data changes underneath them.
      'CHANNEL_ACME_API_DATA_LOADED_EVENT',
      'CHANNEL_ACME_API_DATA_UPDATED_EVENT',

      // A create / update / delete returned. Carries the API's own message, for
      // form-level feedback. DATA_UPDATED follows once the refreshed dump lands.
      'CHANNEL_ACME_API_MUTATION_EVENT',
      'CHANNEL_ACME_API_ERROR_EVENT',
    ];
  }

  onViewStreamInfo() {}
}
