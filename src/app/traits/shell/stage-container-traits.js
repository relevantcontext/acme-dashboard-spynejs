import { SpyneTrait } from 'spyne';
import { Page404View } from 'components/pages/page-404-view.js';
import { PageGuestView } from 'components/pages/page-guest-view.js';
import { PageAcmeView } from 'components/pages/page-acme-view.js';
import { NavBreadcrumbView} from 'components/nav/nav-breadcrumb-view.js';

/**
 * Logic for StageContainer — the page column, and nothing else.
 *
 * It answers one question: given a page-data event, what renders here? It does
 * not decide whether the user is allowed to be on this page. ChannelApp applies
 * the auth boundary before emitting, so by the time an event arrives here the
 * route has already been permitted — a redirect means no event is sent at all.
 *
 * The sidenav is not its concern either. UIContainer owns that column and reads
 * the route itself.
 */
export class StageContainerTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'stage$';
    super(context, traitPrefix);
  }

  /**
   * The page class IS the declaration of what kind of page this is.
   *
   * PageGuestView renders without the dashboard shell and subscribes to no data.
   * PageAcmeView is the real app — it takes the shell and the Acme data. Anything
   * not named here is an app page, so new dashboard routes need no entry.
   */
  static stage$GetPageClass(pageId) {
    const pageIdLookup = {
      login: PageGuestView,
      home: PageGuestView,
      404: Page404View,
    };

    return pageIdLookup[pageId] || PageAcmeView;
  }

  static stage$OnRouteEvent(e, isDeepLink = false) {
    const { pageId, is404 } = e.payload;
    const data = e.payload;

    // is404 is computed by ChannelApp from the whole routeData, so it catches an
    // invalid topicId or optionId that pageId alone would not.
    const PageClass = is404 ? Page404View : this.stage$GetPageClass(pageId);

    // Only the real app takes the gutter. Derived from the page class rather
    // than from a second list of page ids, so the two cannot disagree.
    this.stage$ShowShell(PageClass === PageAcmeView);
    this.appendView(new PageClass({ data, isDeepLink }));
  }

  /**
   * Shell-less pages drop the page gutter — the landing page in particular needs
   * the width back, since its copy column is only md:w-2/5 with md:px-20 inside
   * it.
   */
  static stage$ShowShell(hasShell) {
    this.props.el$().toggleClass('is-full-bleed', !hasShell);
  }

  static stage$OnAppInitEvent(e) {
    this.stage$OnRouteEvent(e, true);
  }

  static stage$OnRendered() {
    this.appendView(new NavBreadcrumbView());


  }
}
