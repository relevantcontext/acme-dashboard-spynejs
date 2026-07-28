import { ViewStream } from 'spyne';
import { UIFooterViewTraits } from 'traits/ui/ui-footer-view-traits.js';

export class UIFooterView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'footer';
    props.id = 'site-footer';
    props.channels = ['CHANNEL_APP'];
    props.traits = [UIFooterViewTraits];
    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_APP_INIT_EVENT', 'uiFooter$OnAppDataEvent']];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
