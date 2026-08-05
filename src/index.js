// inject styles
// Tailwind first — its base layer is a reset, so the design system in app.scss
// must cascade on top of it, not the other way round.
import './scss/tailwind.scss';
import './scss/app.scss';

// load spyne
import { SpyneApp, ChannelFetch, SpyneAppProperties } from 'spyne';

// channels
import { ChannelApp } from 'channels/channel-app.js';
import { ChannelLocalStorage } from 'channels/channel-local-storage.js';
import { ChannelAcmeAuth } from 'channels/channel-acme-auth.js';
import { ChannelAcmeData } from 'channels/channel-acme-data.js';
import { ChannelAcmeInvoices } from 'channels/channel-acme-invoices.js';
import { ChannelAcmeEditSession } from 'channels/channel-acme-edit-session.js';
import { ChannelAcmeCustomers } from 'channels/channel-acme-customers.js';
import { ChannelAcmeSearch } from 'channels/channel-acme-search.js';
//plugins

// views
import { AcmeRequesterNullView } from 'components/shell/null-views/acme-requester-null-view.js';

// traits
import { AcmeDbConnectionsTraits } from 'traits/db/db-connections-traits.js';

//data fetch
import AppModelURL from 'data/app.model.json';

// initial view
import { AppContainer } from 'components/shell/app-container.js';
import { AppLoadingView } from 'components/shell/app-loading-view.js';

import pageItemTemplateLookup from 'utils/page-item-template-lookup.js';
import {
  INVOICE_PARAMS_EVENT,
  INVOICE_MOBILE_QUERY,
} from 'utils/acme-invoice-utils.js';
import { CUSTOMER_PARAMS_EVENT } from 'utils/acme-utils.js';

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
      // Emits CHANNEL_WINDOW_MEDIA_QUERY_EVENT with {mediaQueryName: 'mobile',
      // matches} on every CROSSING of the breakpoint — never at registration,
      // so consumers seed their own initial value (the invoices channel reads
      // matchMedia once in onRegistered). [discretize-continuous-input-at-source]
      mediaQueries: {
        mobile: INVOICE_MOBILE_QUERY,
      },
      events: [
        'click',
        'mouseover',
        'mouseenter',
        'message',
        'keyup',
        'keydown',
        // Back/forward between two searches on the SAME path does not move
        // routeData, so CHANNEL_ROUTE sees no change and
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
        // popstate events for either. The persistent AcmeQueryParamsNullView
        // announces its own write, and the appropriate domain channel hears it
        // here. Without this the loop is open and only back/forward would ever
        // reach a channel.
        //
        // Read as CHANNEL_WINDOW_ACME_INVOICES_PARAMS_CHANGED_EVENT.
        { name: INVOICE_PARAMS_EVENT },
        { name: CUSTOMER_PARAMS_EVENT },
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

// Acme SQL connection. The ChannelFetch instances are registered from a trait
// rather than inline, so every channel the app owns is still discoverable here
// without this file carrying six instantiations. See
// traits/db/db-connections-traits.js.
AcmeDbConnectionsTraits.acmeDbConnections$RegisterChannels();

// The two semantic channels between those fetch channels and the app. Auth is
// registered first: it is the only writer of auth state, and ChannelAcmeData
// subscribes to it to know when to load.
SpyneApp.registerChannel(new ChannelAcmeAuth());
SpyneApp.registerChannel(new ChannelAcmeData());

// Client-side domain projections. Registered after the data channel they
// resolve against.
SpyneApp.registerChannel(new ChannelAcmeInvoices());
SpyneApp.registerChannel(new ChannelAcmeCustomers());

// The bulk-edit session's ephemeral coordination surface (cursor, selection,
// editor open/close). No replay — these are events, not current values; see
// the channel's own header for why.
SpyneApp.registerChannel(new ChannelAcmeEditSession());

// The global quick-search overlay's state machine: open/close, the live
// cross-collection match, and result activation. Registered after the data
// channel it resolves against, like the two projections above.
SpyneApp.registerChannel(new ChannelAcmeSearch());

// A ChannelFetch request can only be sent from a ViewStream, so this null-
// appended view listens to both channels and performs them. It renders nothing
// and exists solely to hold that boundary.
new AcmeRequesterNullView().appendToNull();

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

// The cold-load splash has been on screen since the document parsed — it is
// static markup in index.tmpl.html, painted before this bundle arrived. Now
// that the app is booting, a view ADOPTS it and owns it from here: the status
// line advances through the boot stages, and the view disposes itself — which
// removes the adopted markup — the moment the app is interactive.
// [adopt-existing-element] The null guard is for the test runner, whose
// document is not built from index.tmpl.html.
const appLoadingEl = document.getElementById('app-loading');
if (appLoadingEl !== null) new AppLoadingView({ el: appLoadingEl });
