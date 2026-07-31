import { ViewStream } from 'spyne';
import { StageContainerTraits } from 'traits/app/stage-container-traits.js';

export class StageContainer extends ViewStream {
  constructor(props = {}) {
    props.id = 'stage-view';
    props.traits = [StageContainerTraits];
    // CHANNEL_ACME_AUTH is here for AUTH_CHANGED: signing out fires no route
    // event, so the stage has to re-evaluate the redirect rule itself.
    props.channels = ['CHANNEL_APP', 'CHANNEL_ROUTE', 'CHANNEL_ACME_AUTH'];

    // The page column of the Next.js app's dashboard/layout.tsx:
    //
    //   <div className="grow p-6 md:overflow-y-auto md:p-12">{children}</div>
    //
    // This view IS that element. Its sibling is UIContainer, the sidenav column;
    // both are appended by AppContainer, which carries the flex row.
    //
    // No template: pages append straight into the root, so there is no wrapper
    // between the column and the page.
    // `page-container` is deliberately NOT here. It is a design-system class
    // whose `padding-inline: clamp(0.25rem, 2vw, 1rem)` tied with Tailwind's
    // md:p-12 at (0,1,0) and won on source order, giving the page column 48px
    // of vertical padding and 15.58px of horizontal — where the Next.js side has
    // 48px on all four. It also imposed a max-width and auto margins the shell
    // does not want.
    props.class = 'slot slot-page grow p-6 md:overflow-y-auto md:p-12';
    super(props);
  }

  addActionListeners() {
    return [
      ['CHANNEL_APP_INIT_EVENT', 'stage$OnAppInitEvent'],
      ['CHANNEL_APP_PAGE_DATA_EVENT', 'stage$OnRouteEvent'],
      ['CHANNEL_ACME_AUTH_CHANGED_EVENT', 'stage$OnAuthChanged'],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    this.stage$OnRendered();
  }
}
