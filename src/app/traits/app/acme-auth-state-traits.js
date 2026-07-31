import { SpyneTrait, SpyneAppProperties } from 'spyne';

const AUTH_STATE_PROP = 'acmeAuthState';

/**
 * The app's single source of truth for auth state.
 *
 * ChannelAcmeApi writes here whenever the server tells it something about the
 * session — the initial /api/auth/session response, a login, a sign out. Views
 * read it with the statics below.
 *
 * Deliberately its own module rather than living on stage traits or the channel
 * traits: stage traits own page swapping, channel traits own request/response
 * flow, and this is read by arbitrary views that should not have to import
 * either. It holds no context, so it is called statically —
 * `AcmeAuthStateTraits.acmeAuthState$Get()` — the same way
 * AcmeDbConnectionsTraits is invoked from index.js.
 *
 * Views that render after app init can read this instead of subscribing: by the
 * time any page exists, INIT_AUTH has already resolved. Views that need to react
 * to a later change still listen for CHANNEL_ACME_API_AUTH_CHANGED_EVENT.
 */
export class AcmeAuthStateTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'acmeAuthState$';
    super(context, traitPrefix);
  }

  /**
   * @returns {{user: Object|null, isAuthenticated: Boolean, isInitialized: Boolean}}
   */
  static acmeAuthState$Get() {
    return (
      SpyneAppProperties.getProp(AUTH_STATE_PROP) || {
        user: null,
        isAuthenticated: false,
        isInitialized: false,
      }
    );
  }

  static acmeAuthState$IsAuthenticated() {
    return AcmeAuthStateTraits.acmeAuthState$Get().isAuthenticated === true;
  }

  static acmeAuthState$GetUser() {
    return AcmeAuthStateTraits.acmeAuthState$Get().user;
  }

  /**
   * Stores the state and reports whether it actually changed, so the caller can
   * decide between INIT_AUTH and AUTH_CHANGED without comparing twice.
   *
   * Identity is compared on the user id rather than the object, since each
   * response builds a fresh object and would otherwise always look "changed".
   *
   * @returns {{changed: Boolean, wasInitialized: Boolean, state: Object}}
   */
  static acmeAuthState$Set(user = null) {
    const previous = AcmeAuthStateTraits.acmeAuthState$Get();
    const nextUser = user || null;

    const state = {
      user: nextUser,
      isAuthenticated: nextUser !== null,
      isInitialized: true,
    };

    SpyneAppProperties.setProp(AUTH_STATE_PROP, state);

    return {
      state,
      wasInitialized: previous.isInitialized === true,
      changed: (previous.user?.id ?? null) !== (nextUser?.id ?? null),
    };
  }
}
