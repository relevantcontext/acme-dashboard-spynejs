import { ViewStream } from 'spyne';
import { AppLocalStorageTraits } from 'traits/app-local-storage-traits.js';

export class LocalStorageNullView extends ViewStream {
  constructor(props = {}) {
    props.channels = ['CHANNEL_LOCAL_STORAGE'];
    props.traits = [AppLocalStorageTraits];
    super(props);
  }

  addActionListeners() {
    return [];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    this.localStorage$InitAppSettings();
  }
}
