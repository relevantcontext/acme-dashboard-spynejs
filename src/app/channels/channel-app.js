import { Channel } from 'spyne';
import { AppStatusTraits } from 'traits/app/app-status-traits.js';
import { AppSettingsTraits } from 'traits/app/app-settings-traits.js';

export class ChannelApp extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_APP';
    props.sendCachedPayload = true;
    props.traits = [AppStatusTraits, AppSettingsTraits];
    super(name, props);
  }

  onRegistered() {
    this.appStatus$GetChannels();
    this.appSettings$InitSettingEvents();
  }

  addRegisteredActions() {
    return [
      'CHANNEL_APP_INIT_EVENT',
      'CHANNEL_APP_PAGE_DATA_EVENT',
      'CHANNEL_APP_SETTING_EVENT',
    ];
  }

  onViewStreamInfo() {}
}
