import { ViewStream } from 'spyne';
import { AppContainerTraits } from 'traits/app/app-container-traits.js';

export class AppContainer extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'main';
    props.id = 'app';
    props.channels = ['CHANNEL_LOCAL_STORAGE', 'CHANNEL_APP'];
    props.traits = [AppContainerTraits];
    props.dataset = {};

    super(props);
  }

  addActionListeners() {
    return [
      [
        'CHANNEL_LOCAL_STORAGE_APP_SETTINGS_INITIALIZED_EVENT',
        'app$OnLocalStorageEvent',
      ],
      ['CHANNEL_APP_SETTING_EVENT', 'app$OnSettingsEvent'],
    ];
  }

  onRendered() {
    this.app$OnAppViewRendered();
  }
}
