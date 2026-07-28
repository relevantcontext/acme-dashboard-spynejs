import { ViewStream } from 'spyne';
import { StageContainerTraits } from 'traits/app/stage-container-traits.js';

export class StageContainer extends ViewStream {
  constructor(props = {}) {
    props.id = 'stage-view';
    props.traits = [StageContainerTraits];
    props.channels = ['CHANNEL_APP', 'CHANNEL_ROUTE'];
    props.template = `<div class="slot slot-ui"></div>
                      <div class="slot slot-page  page-container "></div>`;
    super(props);
  }

  addActionListeners() {
    return [
      ['CHANNEL_APP_INIT_EVENT', 'stage$OnAppInitEvent'],
      ['CHANNEL_APP_PAGE_DATA_EVENT', 'stage$OnRouteEvent'],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    this.stage$OnRendered();
  }
}
