import { ViewStream } from 'spyne';
import { UIContainerTraits } from 'traits/app/ui-container-traits.js';

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
    props.channels = ['CHANNEL_ROUTE'];
    props.class = 'slot slot-ui w-full flex-none md:w-64 hide';

    super(props);
  }

  addActionListeners() {
    // Both route actions run the same rule. DEEPLINK is the boot route and
    // CHANGE is every navigation after it; the column's visibility does not
    // depend on which one it was.
    return [
      ['CHANNEL_ROUTE_DEEPLINK_EVENT', 'uiContainer$OnRouteEvent'],
      ['CHANNEL_ROUTE_CHANGE_EVENT', 'uiContainer$OnRouteEvent'],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    this.uiContainer$OnRendered();
  }
}
