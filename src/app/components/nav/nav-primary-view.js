import { ViewStream } from 'spyne';
import UIHeaderNavTmpl from './templates/nav-primary-view.tmpl.html';
import { NavPrimaryViewTraits } from 'traits/nav/nav-primary-view-traits.js';

export class NavPrimaryView extends ViewStream {
  constructor(props = {}) {
    props.class = 'site-nav';
    props.tagName = 'nav';
    props['aria-label'] = 'Main Navigation';
    props.template = UIHeaderNavTmpl;
    props.traits = [NavPrimaryViewTraits];
    props.channels = ['CHANNEL_ROUTE', 'CHANNEL_APP', 'CHANNEL_LOCAL_STORAGE'];
    super(props);
  }

  addActionListeners() {
    return [
      [
        'CHANNEL_LOCAL_STORAGE_APP_SETTINGS_INITIALIZED_EVENT',
        'nav$UIHeaderNavViewOnSettingsInit',
      ],

      [
        'CHANNEL_APP_INIT_EVENT|CHANNEL_APP_PAGE_DATA_EVENT',
        'nav$UIHeaderNavViewOnRouteChangeEvent',
      ],

      ['CHANNEL_APP_SETTING_EVENT', 'nav$UIHeaderNavViewOnSettingsEvent'],
    ];
  }

  broadcastEvents() {
    // return nested array(s)
    return [
      ['a', 'click'],
      ['button', 'click'],
    ];
  }

  onRendered() {}
}
