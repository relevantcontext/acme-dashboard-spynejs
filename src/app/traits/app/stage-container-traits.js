import { SpyneTrait } from 'spyne';
import { AcmeAuthStateTraits } from 'traits/app/acme-auth-state-traits.js';
import { NavBreadcrumbView } from 'components/nav/nav-breadcrumb-view.js';
import { UISideNavView } from 'components/page-items/acme/ui-sidenav-view.js';
import { Page404View } from 'components/pages/page-404-view.js';
import { PageView } from 'components/pages/page-view.js';

export class StageContainerTraits extends SpyneTrait {
  // Pages a guest may view. An authenticated user is redirected off them, and
  // they render without the dashboard shell — in the Next.js app they are simply
  // the routes that do not sit under dashboard/layout.tsx.
  //
  // The two meanings coincide here because the dashboard shell IS the
  // authenticated area. If that ever stops being true, this needs to become two
  // lists rather than one.
  static GUEST_ONLY_PAGES = ['home', 'login'];

  // Where each side of the auth boundary is sent when it lands on the wrong one.
  static REDIRECT_UNAUTHENTICATED_PAGE = 'login';
  static REDIRECT_AUTHENTICATED_PAGE = 'dashboard';

  constructor(context) {
    let traitPrefix = 'stage$';
    super(context, traitPrefix);
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
  static stage$GetRedirectPageId(pageId, isAuthenticated) {
    const isGuestOnlyPage =
      StageContainerTraits.GUEST_ONLY_PAGES.includes(pageId);

    if (!isGuestOnlyPage) {
      if (isAuthenticated) return undefined;
      return StageContainerTraits.REDIRECT_UNAUTHENTICATED_PAGE;
    } else if (isAuthenticated) {
      return StageContainerTraits.REDIRECT_AUTHENTICATED_PAGE;
    }

    return undefined;
  }

  /**
   * Re-runs the redirect rule when auth changes without the route moving.
   *
   * Signing out on /dashboard fires AUTH_CHANGED and nothing else — no route
   * event — so without this the user sits on a page they can no longer load,
   * every request silently 401ing. The same path covers logging in while on
   * /login, which is a guest-only page and so redirects to the dashboard.
   *
   * INIT_AUTH deliberately does not trigger this. At boot the route event is
   * already about to run and would redirect twice.
   */
  static stage$OnAuthChanged(e) {
    const { isAuthenticated } = e.payload;

    const redirectPageId = StageContainerTraits.stage$GetRedirectPageId(
      this.props.currentPageId,
      isAuthenticated,
    );

    if (redirectPageId !== undefined) {
      this.sendInfoToChannel('CHANNEL_ROUTE', { pageId: redirectPageId });
    }
  }

  static stage$OnRouteEvent(e, isDeepLink = false) {
    const { pageId, is404 } = e.payload;
    const data = e.payload;

    // Read live rather than from payload.initData. initData is captured once,
    // when appStatus$GetChannels' merge resolves, and is never refreshed — so
    // after a login it still reports the boot-time auth state. Using it here
    // redirected the user straight back to /login the moment they signed in.
    const isAuthenticated = AcmeAuthStateTraits.acmeAuthState$IsAuthenticated();

    // Tracked so a later auth change can be evaluated against the page the user
    // is actually on. Set before the early returns below: if this call
    // redirects, the resulting route event overwrites it with the new pageId.
    this.props.currentPageId = pageId;

    // 404 short-circuits ahead of the auth check. An invalid route is not a
    // redirect decision, and resolving it first keeps the redirect rule to the
    // single boolean pair above.
    if (is404 || pageId === '404') {
      this.stage$ShowShell(false);
      this.appendView(new Page404View({ data, isDeepLink }), '.page-container');
      return;
    }

    const redirectPageId = StageContainerTraits.stage$GetRedirectPageId(
      pageId,
      isAuthenticated,
    );

    // Short-circuit before rendering: the requested page is never built, the
    // route simply moves and this method runs again for the new pageId.
    if (redirectPageId !== undefined) {
      this.sendInfoToChannel('CHANNEL_ROUTE', { pageId: redirectPageId });
      return;
    }

    this.stage$ShowShell(
      !StageContainerTraits.GUEST_ONLY_PAGES.includes(pageId),
    );
    this.appendView(new PageView({ data, isDeepLink }), '.page-container');
  }

  /**
   * Guest-only pages get no sidenav and no page gutter — the landing page in
   * particular needs the width back, since its copy column is only md:w-2/5
   * with md:px-20 inside it.
   */
  static stage$ShowShell(hasShell) {
    this.props.el$('.slot-ui').toggle('hide', !hasShell);
    this.props.el$('.slot-page').toggle('is-full-bleed', !hasShell);
  }

  static stage$OnAppInitEvent(e) {
    this.stage$OnRouteEvent(e, true);
  }

  static stage$OnRendered() {
    this.appendView(new UISideNavView(), '.slot-ui');
    this.appendView(new NavBreadcrumbView(), '.slot-ui');
  }
}
