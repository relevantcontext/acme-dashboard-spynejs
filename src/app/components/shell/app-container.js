import { ViewStream } from 'spyne';
import { AppContainerTraits } from 'traits/shell/app-container-traits.js';

export class AppContainer extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'main';
    props.id = 'app';

    // The outer div of the Next.js app's dashboard/layout.tsx. Its two children
    // are the sidenav column (UIContainer) and the page column (StageContainer),
    // which is why the flex row lives here: they have to be siblings for
    // md:flex-row to place them side by side.
    props.class = 'flex h-screen flex-col md:flex-row md:overflow-hidden';
    // CHANNEL_ACME_AUTH is here for sign-out. Replacing the document is an
    // app-level act, not a page-level one, so it belongs to the view that owns
    // the app root rather than to the stage or the sidenav.
    props.channels = [
      'CHANNEL_LOCAL_STORAGE',
      'CHANNEL_APP',
      'CHANNEL_ACME_AUTH',
    ];
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
      ['CHANNEL_ACME_AUTH_SIGNOUT_COMPLETED_EVENT', 'app$OnSignOutCompleted'],
    ];
  }

  onRendered() {
    this.app$OnAppViewRendered();
  }
}
