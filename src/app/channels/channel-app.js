import { Channel } from 'spyne';
import { AppStatusTraits } from 'traits/shell/app-status-traits.js';
import { AppSettingsTraits } from 'traits/shell/app-settings-traits.js';
import { AppRedirectTraits } from 'traits/shell/app-redirect-traits.js';

export class ChannelApp extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_APP';
    props.replay = true;
    props.traits = [AppStatusTraits, AppSettingsTraits, AppRedirectTraits];
    super(name, props);
  }

  onRegistered() {
    this.appStatus$GetChannels();
    this.appSettings$InitSettingEvents();

    // The auth boundary. Subscribed here rather than owned by a view: a redirect
    // decides whether a page is emitted at all, so it has to run before the
    // stage is told to build one.
    this.appRedirect$ListenToAuth();
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
