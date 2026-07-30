// inject styles
// Tailwind first — its base layer is a reset, so the design system in app.scss
// must cascade on top of it, not the other way round.
import './scss/tailwind.scss';
import './scss/app.scss';

// load spyne
import { SpyneApp, ChannelFetch, SpyneAppProperties } from 'spyne';

// channels
import { ChannelMenuDrawer } from 'channels/channel-menu-drawer';
import { ChannelApp } from 'channels/channel-app.js';
import { ChannelLocalStorage } from 'channels/channel-local-storage.js';
import { ChannelAcmeApi } from 'channels/channel-acme-api.js';
//plugins

// views
import { AcmeApiRequester } from 'components/acme-api-requester.js';

// traits
import { AcmeDbConnectionsTraits } from 'traits/channel/acme-db-connections-traits.js';

//data fetch
import AppModelURL from 'data/app.model.json';

// initial view
import { AppContainer } from './app/app-container.js';

import pageItemTemplateLookup from 'traits/utils/page-item-template-lookup.js';

const config = {
  channels: {
    ROUTE: {
      routes: {
        routePath: {
          routeName: 'pageId',
          home: '',
          login: 'login',
          dashboard: {
            routePath: {
              routeName: 'topicId',
              invoices: {
                invoices: 'invoices',
                routePath: {
                  routeName: 'optionId',
                  edit: 'edit',
                  create: 'create',
                },
              },
              customers: {
                customers: 'customers',
                routePath: {
                  routeName: 'optionId',
                  profile: 'profile',
                },
              },
              routePath: {},
            },
          },
        },
      },
      add404s: true,
    },
    WINDOW: {
      mediaQueries: {
        showMenuDrawer: '(min-width: 1024px)',
      },
      events: [
        'click',
        'mouseover',
        'mouseenter',
        'message',
        'keyup',
        'keydown',
      ],
      customEvents: [
        {
          name: 'spyne_cms_item_connected',
          buffer: 400,
        },
      ],
      listenForScroll: true,
      listenForOrientation: true,
      debounceMSTimeForScroll: 50,
    },
  },
  debug: true,
  storageConfig: {
    storageKey: 'spyneAppStorage',
    theme: 'auto',
    themeDefaults: {
      colorScheme: 'auto',
      enableTransitions: true,
    },
  },
};

SpyneApp.init(config);

SpyneAppProperties.setProp('pageItemTemplateLookup', pageItemTemplateLookup);
SpyneApp.registerChannel(new ChannelApp());
SpyneApp.registerChannel(new ChannelLocalStorage());
SpyneApp.registerChannel(new ChannelMenuDrawer());

// Acme SQL connection. The ChannelFetch instances are registered from a trait
// rather than inline, so every channel the app owns is still discoverable here
// without this file carrying six instantiations. See
// traits/channel/acme-db-connections-traits.js.
AcmeDbConnectionsTraits.acmeDbConnections$RegisterChannels();

// The intermediary between those fetch channels and UI events.
SpyneApp.registerChannel(new ChannelAcmeApi());

// A ChannelFetch request can only be sent from a ViewStream, so this null-
// appended view listens to CHANNEL_ACME_API and performs them. It renders
// nothing and exists solely to hold that boundary.
new AcmeApiRequester().appendToNull();


const registerCmsChannels = () => {
  const mapFn = SpyneApp.pluginsFn.mapCmsData || ((d) => d);

  SpyneApp.registerChannel(
    new ChannelFetch('CHANNEL_FETCH_MODEL', {
      url: AppModelURL,
      map: mapFn,
    }),
  );
};

// webpack substitutes this expression with a string literal at build time, in
// every mode — see `optimization.nodeEnv` in webpack.config.js. Do not guard it
// with `typeof process`: webpack replaces only this exact expression, leaving a
// bare `process` undefined in the browser, so such a guard is always false and
// silently disables the CMS.
if (process.env.NODE_ENV === 'development') {
  import('./dev-tools.js').then(({ devToolsReady }) => {
    devToolsReady.then(registerCmsChannels);
  });
} else {
  // production and test: no CMS, no delay
  registerCmsChannels();
}

new AppContainer().prependToDom(document.querySelector('body'));
