import { ViewStream } from 'spyne';
import { UIContainerTraits } from 'traits/shell/ui-container-traits.js';

/**
 * The dashboard's left column, from the Next.js app's dashboard/layout.tsx:
 *
 *   <div className="w-full flex-none md:w-64">
 *     <SideNav />
 *
 * This view IS that element rather than a wrapper around it — the layout is a
 * two-child flex row, so an extra element between the stage and the column
 * would break `md:flex-row` and the `md:w-64` sizing.
 *
 * It is prepended by StageContainer so it precedes the page column, which is
 * what puts the nav on the left.
 *
 * `hide` is set at construction: the column stays hidden until a route event
 * says otherwise, so a guest landing on /login never sees a sidenav flash.
 */
export class UIContainer extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.traits = [UIContainerTraits];

    // CHANNEL_APP, not CHANNEL_ROUTE. ChannelApp applies the auth boundary and
    // emits only for routes that will actually render, so this column never
    // sees a page the user is about to be redirected away from.
    //
    // Listening to CHANNEL_ROUTE directly was wrong: a redirect is issued
    // synchronously from inside ChannelApp's own route handler, so the route
    // channel re-enters. A subscriber registered after ChannelApp receives the
    // redirected page FIRST and the original page second — last write wins, and
    // it is the stale one. Navigating to /login while signed in left the column
    // hidden on the dashboard.
    props.channels = ['CHANNEL_APP'];
    props.class = 'slot slot-ui w-full flex-none md:w-64 hide';

    super(props);
  }

  addActionListeners() {
    // Both run the same rule. INIT is the boot page and PAGE_DATA is every
    // navigation after it; the column's visibility does not depend on which.
    return [
      ['CHANNEL_APP_INIT_EVENT', 'uiContainer$OnRouteEvent'],
      ['CHANNEL_APP_PAGE_DATA_EVENT', 'uiContainer$OnRouteEvent'],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    this.uiContainer$OnRendered();
  }
}
