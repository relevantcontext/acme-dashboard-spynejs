import { Channel } from 'spyne';
import { AcmeAuthChannelTraits } from 'traits/channel/acme-auth-channel-traits.js';

/**
 * Who the user is, and everything that changes the answer.
 *
 * One of the two Acme channels a view ever subscribes to — the other is
 * CHANNEL_ACME_DATA. The three CHANNEL_FETCH_ACME_* channels behind them are
 * transport and nothing else.
 *
 * This channel is the only writer of auth state, which is held in
 * SpyneAppProperties by AcmeAuthStateTraits. That split is deliberate: any view
 * may need to know whether the user is signed in at any point in its
 * constructor, and a channel cannot answer a question asked before it was
 * subscribed to. The actions below are for reacting to a *change*; the store is
 * for asking what is true now.
 *
 * All behaviour lives in AcmeAuthChannelTraits — this class is structure and
 * event flow only.
 *
 * NOTE for consumers: register only ONE listener per action name in a given
 * ViewStream. A duplicate registration for the same action clobbers the first.
 */
export class ChannelAcmeAuth extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_ACME_AUTH';
    props.replay = true;
    props.traits = [AcmeAuthChannelTraits];
    super(name, props);
  }

  onRegistered() {
    this.acmeAuth$OnRegistered();
  }

  addRegisteredActions() {
    return [
      // Consumed by AcmeRequester, the null-appended ViewStream that performs
      // the actual fetch. Views do not listen for this.
      'CHANNEL_ACME_AUTH_REQUEST_EVENT',

      // The lifecycle pair. INIT is always this channel's FIRST emission — it
      // resolves from the unpaused session request at boot, and ChannelApp's
      // merge is waiting on exactly that. CHANGED follows only when the identity
      // actually changes, not on every re-check.
      'CHANNEL_ACME_AUTH_INIT_EVENT',
      'CHANNEL_ACME_AUTH_CHANGED_EVENT',

      // Fires on every /api/auth/session response, including a re-check that
      // changed nothing, and carries didRequestFail when the request itself
      // failed. The two above describe the lifecycle; this one just reports that
      // the server was asked.
      'CHANNEL_ACME_AUTH_SESSION_EVENT',

      // Login outcome, split so a view can listen for one or the other without
      // inspecting the payload. SUCCESS carries { user }; FAILED carries the
      // API's own message — 'Invalid credentials.' — plus the HTTP status.
      'CHANNEL_ACME_AUTH_LOGIN_SUCCESS_EVENT',
      'CHANNEL_ACME_AUTH_LOGIN_FAILED_EVENT',

      // Sign out succeeded and the session cookie is cleared server-side.
      // AppContainer is the only listener, and it responds by replacing the
      // document rather than routing. Nothing else should act on this: by the
      // time a second listener ran, the page it belongs to is being discarded.
      'CHANNEL_ACME_AUTH_SIGNOUT_COMPLETED_EVENT',

      // Any other auth failure, including a failed sign out.
      'CHANNEL_ACME_AUTH_ERROR_EVENT',
    ];
  }

  onViewStreamInfo() {}
}
