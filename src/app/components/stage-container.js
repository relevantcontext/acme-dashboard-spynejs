import { ViewStream } from 'spyne';
import { StageContainerTraits } from 'traits/app/stage-container-traits.js';

export class StageContainer extends ViewStream {
  constructor(props = {}) {
    props.id = 'stage-view';
    props.traits = [StageContainerTraits];
    // CHANNEL_ACME_API is here for AUTH_CHANGED: signing out fires no route
    // event, so the stage has to re-evaluate the redirect rule itself.
    props.channels = ['CHANNEL_APP', 'CHANNEL_ROUTE', 'CHANNEL_ACME_API'];

    // Layout ported from the Next.js app's dashboard/layout.tsx:
    //
    //   <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
    //     <div className="w-full flex-none md:w-64">      <SideNav />
    //     <div className="grow p-6 md:overflow-y-auto md:p-12">{children}
    //
    // The sidenav column is fixed at w-64 from md up and the page column takes
    // the remaining width and scrolls independently. Below md both stack, which
    // is why the nav is a row on narrow viewports.
    props.class = 'flex h-screen flex-col md:flex-row md:overflow-hidden';
    props.template = `<div class="slot slot-ui w-full flex-none md:w-64"></div>
                      <div class="slot slot-page page-container grow p-6 md:overflow-y-auto md:p-12"></div>`;
    super(props);
  }

  addActionListeners() {
    return [
      ['CHANNEL_APP_INIT_EVENT', 'stage$OnAppInitEvent'],
      ['CHANNEL_APP_PAGE_DATA_EVENT', 'stage$OnRouteEvent'],
      ['CHANNEL_ACME_API_AUTH_CHANGED_EVENT', 'stage$OnAuthChanged'],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    this.stage$OnRendered();
  }
}
