import { ViewStream } from 'spyne';
import { UIHeaderViewTraits } from 'traits/ui/ui-header-view-traits.js';
import UIHeaderTmpl from './templates/ui-header-view.tmpl.html';

export class UIHeaderView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'header';
    props.id = 'site-header';
    props.traits = [UIHeaderViewTraits];
    props.channels = ['CHANNEL_APP'];
    props.template = UIHeaderTmpl;
    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_APP_INIT_EVENT', 'uiHeader$UIHeaderViewOnAppInitEvent']];
  }

  broadcastEvents() {
    return [['a.logo-link', 'click']];
  }

  onRendered() {
    this.uiHeader$UIHeaderViewOnRendered();
  }
}
