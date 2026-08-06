import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
import { AcmeAuthStateTraits } from 'traits/shell/acme-auth-state-traits.js';

/**
 * The app's auth-boundary policy, applied by ChannelApp.
 *
 * ── Why this is not a view's job ────────────────────────────────────────────
 *
 * It used to live on StageContainer, which meant a view that renders pages was
 * also deciding which pages may be rendered at all. Those are different
 * questions, and only the second one needs auth state.
 *
 * ChannelApp already sits where the answer is available: it holds the route and
 * the model, and it decides when to emit page data. Putting the rule here lets a
 * redirect happen *instead of* emitting rather than after it — the stage is
 * never told to build a page the user may not see, so there is nothing to
 * unbuild.
 *
 * ── Routing from a channel ──────────────────────────────────────────────────
 *
 * A Channel cannot sendInfoToChannel, but routing is the one carve-out: Channel
 * assigns `this.sendPayloadToRouteChannel` in its constructor, and
 * RouteChannelUpdater spins up a temporary null-appended ViewStream, sends the
 * payload, and disposes itself after the broadcast. So no relay view is needed
 * here, unlike every other channel-to-fetch path in this app.
 */
export class AppRedirectTraits extends SpyneTrait {
  // Pages a guest may view. An authenticated user is redirected off them.
  //
  // In the Next.js app these are simply the routes that do not sit under
  // dashboard/layout.tsx. The layout meaning and the auth meaning coincide here
  // because the dashboard shell IS the authenticated area; if that ever stops
  // being true, this needs to become two lists rather than one.
  static GUEST_ONLY_PAGES = ['home', 'login'];

  // Where each side of the auth boundary is sent when it lands on the wrong one.
  static REDIRECT_UNAUTHENTICATED_PAGE = 'login';
  static REDIRECT_AUTHENTICATED_PAGE = 'dashboard';

  constructor(context) {
    let traitPrefix = 'appRedirect$';
    super(context, traitPrefix);
  }

  /**
   * Signing out on /dashboard, or a 401 revoking the session, changes auth
   * without moving the route — so without this the user sits on a page they can
   * no longer load, every request silently 401ing.
   *
   * Only CHANGED, never INIT. At boot the merge is already about to evaluate the
   * boot route, and reacting to INIT as well would redirect twice.
   */
  static appRedirect$ListenToAuth() {
    const authChangedFilter = new ChannelPayloadFilter({
      action: 'CHANNEL_ACME_AUTH_CHANGED_EVENT',
    });

    this.getChannel('CHANNEL_ACME_AUTH', authChangedFilter).subscribe(
      this.appRedirect$OnAuthChanged.bind(this),
    );
  }

  static appRedirect$OnAuthChanged() {
    this.appRedirect$Apply(this.props.currentPageId);
  }

  /**
   * Redirects if the rule says to, and reports whether it did so the caller can
   * skip emitting page data for a page that is about to be replaced.
   *
   * Auth is read live rather than taken from a payload. `initData.isAuthenticated`
   * was once captured when the boot merge resolved and never refreshed, which
   * sent users straight back to /login the moment they signed in.
   *
   * @returns {Boolean} true when a redirect was issued
   */
  static appRedirect$Apply(pageId) {
    // Tracked so a later auth change can be evaluated against the page the user
    // is actually on. Set before the early return: if this call redirects, the
    // resulting route event overwrites it with the new pageId.
    this.props.currentPageId = pageId;

    const redirectPageId = AppRedirectTraits.appRedirect$GetPageId(
      pageId,
      AcmeAuthStateTraits.acmeAuthState$IsAuthenticated(),
    );

    if (redirectPageId === undefined) return false;

    this.sendPayloadToRouteChannel({ pageId: redirectPageId });
    return true;
  }

  /**
   * Returns the pageId to redirect to, or undefined to render as requested.
   *
   * Deliberately mirrors the authorized() callback in the Next.js app's
   * auth.config.ts branch for branch, so the two can be read side by side:
   *
   *   const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
   *   if (isOnDashboard) {
   *     if (isLoggedIn) return true;
   *     return false;                                    // → login
   *   } else if (isLoggedIn) {
   *     return Response.redirect(new URL('/dashboard'));
   *   }
   *   return true;
   *
   * `!isGuestOnlyPage` is their `isOnDashboard`, and `undefined` is their
   * `return true`.
   */
  static appRedirect$GetPageId(pageId, isAuthenticated) {
    const isGuestOnlyPage = AppRedirectTraits.GUEST_ONLY_PAGES.includes(pageId);

    if (!isGuestOnlyPage) {
      if (isAuthenticated) return undefined;
      return AppRedirectTraits.REDIRECT_UNAUTHENTICATED_PAGE;
    } else if (isAuthenticated) {
      return AppRedirectTraits.REDIRECT_AUTHENTICATED_PAGE;
    }

    return undefined;
  }
}
