import { Channel } from 'spyne';
import { AppLocalStorageTraits } from 'traits/app/app-local-storage-traits.js';

export class ChannelLocalStorage extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_LOCAL_STORAGE';
    props.traits = [AppLocalStorageTraits];
    props.replay = true;
    super(name, props);
  }

  onRegistered() {
    this.localStorage$ChannelOnRegistered();
  }

  addRegisteredActions() {
    return [
      'CHANNEL_LOCAL_STORAGE_APP_SETTINGS_INITIALIZED_EVENT',
      [
        'CHANNEL_LOCAL_STORAGE_UPDATE_KEY_REQUEST',
        'localStorage$onChannelUpdateKeyRequest',
      ],
    ];
  }

  onViewStreamInfo(e) {
    this.localStorage$ChannelOnViewStreamInfo(e);
  }
}
