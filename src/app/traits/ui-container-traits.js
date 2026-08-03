import { SpyneTrait } from 'spyne';
import { UISideNavView } from 'components/page-items/acme/ui-sidenav-view.js';


/**
 * Logic for UIContainer, which owns the dashboard's left column.
 *
 * The column is the `.slot-ui` element in the Next.js app's
 * dashboard/layout.tsx. It exists only for the dashboard, so its visibility
 * follows the route and nothing else — no auth check, no page data, no shell
 * flag threaded down from a parent.
 *
 * ── Why this is not the stage's job ─────────────────────────────────────────
 *
 * The stage used to own the sidenav's markup, its visibility and its contents,
 * which meant every route event ran through a method that also decided
 * redirects and built pages. Showing a column is not a decision that needs any
 * of that context: it needs the pageId, which CHANNEL_ROUTE already publishes.
 *
 * This is the locality rule applied — the component that owns the element
 * listens for what it needs and acts on itself.
 */
export class UIContainerTraits extends SpyneTrait {
  // The one page with a shell. This replaces the stage's inverted test against
  // GUEST_ONLY_PAGES, which had to name every page that is NOT the dashboard
  // and still needed the 404 branch to turn the shell off separately. Naming
  // the single page that shows it covers 404 and every future guest page
  // without another list to keep in step.
  static SHELL_PAGE_ID = 'dashboard';

  constructor(context) {
    let traitPrefix = 'uiContainer$';
    super(context, traitPrefix);
  }

  /**
   * ChannelApp publishes pageId at the payload root. Both the boot page and
   * every later navigation land here, so one method covers first paint and
   * subsequent routing.
   */
  static uiContainer$OnRouteEvent(e) {
    this.uiContainer$SetVisibility(e?.payload?.pageId);
  }

  /**
   * Toggles the class on this view's OWN root. `el$()` with no selector
   * resolves to the root element — the selector is built as `cxt + ' ' + sel`
   * only when a selector is given, and is just `cxt` otherwise.
   */
  static uiContainer$SetVisibility(pageId) {
    const hasShell = pageId === UIContainerTraits.SHELL_PAGE_ID;
    this.props.el$().toggleClass('hide', !hasShell);
  }

  /**
   * Everything that belongs to the left column mounts here.
   *
   * The column starts hidden (the `hide` class is on the root at construction)
   * so a guest landing on /login never sees a sidenav flash before the page
   * resolves. CHANNEL_APP caches its last payload, so this view's listener fires
   * as soon as it subscribes and reveals the column on the dashboard without
   * waiting for a navigation.
   */
  static uiContainer$OnRendered() {
    this.appendView(new UISideNavView());
  }
}
