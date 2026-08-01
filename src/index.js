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
import { ChannelAcmeAuth } from 'channels/channel-acme-auth.js';
import { ChannelAcmeData } from 'channels/channel-acme-data.js';
import { ChannelAcmeInvoices } from 'channels/channel-acme-invoices.js';
//plugins

// views
import { AcmeRequester } from 'components/acme-requester.js';

// traits
import { AcmeDbConnectionsTraits } from 'traits/channel/acme-db-connections-traits.js';

//data fetch
import AppModelURL from 'data/app.model.json';

// initial view
import { AppContainer } from './app/app-container.js';

import pageItemTemplateLookup from 'traits/utils/page-item-template-lookup.js';
import { INVOICE_PARAMS_EVENT } from 'traits/utils/acme-invoice-utils.js';

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
        // Back/forward between two query strings on the SAME path — page=2 to
        // page=3 — does not move routeData, so CHANNEL_ROUTE sees no change and
        // the history step would be invisible. CHANNEL_WINDOW binds with
        // addEventListener, so this coexists with the route channel's own
        // `window.onpopstate` property assignment rather than replacing it.
        'popstate',
      ],
      customEvents: [
        {
          name: 'spyne_cms_item_connected',
          buffer: 400,
        },
        // history.replaceState and pushState fire NOTHING — verified: zero
        // popstate events for either. So InvoicesTableParamsNullView announces
        // its own write, and ChannelAcmeInvoices hears it here. Without this the
        // loop is open and only back/forward would ever reach the channel.
        //
        // Read as CHANNEL_WINDOW_ACME_INVOICES_PARAMS_CHANGED_EVENT.
        { name: INVOICE_PARAMS_EVENT },
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
//SpyneApp.registerChannel(new ChannelMenuDrawer());

// Acme SQL connection. The ChannelFetch instances are registered from a trait
// rather than inline, so every channel the app owns is still discoverable here
// without this file carrying six instantiations. See
// traits/channel/acme-db-connections-traits.js.
AcmeDbConnectionsTraits.acmeDbConnections$RegisterChannels();

// The two semantic channels between those fetch channels and the app. Auth is
// registered first: it is the only writer of auth state, and ChannelAcmeData
// subscribes to it to know when to load.
SpyneApp.registerChannel(new ChannelAcmeAuth());
SpyneApp.registerChannel(new ChannelAcmeData());

// Search and pagination for the invoices table. Registered after the data
// channel it resolves against.
SpyneApp.registerChannel(new ChannelAcmeInvoices());

// A ChannelFetch request can only be sent from a ViewStream, so this null-
// appended view listens to both channels and performs them. It renders nothing
// and exists solely to hold that boundary.
new AcmeRequester().appendToNull();

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
