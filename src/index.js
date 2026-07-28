// inject styles
import './scss/app.scss';

// load spyne
import { SpyneApp, ChannelFetch, SpyneAppProperties } from 'spyne';

// channels
import { ChannelMenuDrawer } from 'channels/channel-menu-drawer';
import { ChannelApp } from 'channels/channel-app.js';
import { ChannelLocalStorage } from 'channels/channel-local-storage.js';
import { registerAcmeApiChannels } from 'channels/channel-acme-api.js';
//plugins

//data fetch
import AppModelURL from 'data/app.model.json';

// initial view
import { AppContainer } from './app/app-container.js';

import pageItemTemplateLookup from 'traits/utils/page-item-template-lookup.js';

const config = {"channels":{"ROUTE":{"routes":{"routePath":{"routeName":"pageId","home":"","login":"login","dashboard":{"routePath":{"routeName":"topicId","invoices":"invoices","customers":"customers"}}}},"add404s":true},"WINDOW":{"mediaQueries":{"showMenuDrawer":"(min-width: 1024px)"},"events":["click","mouseover","mouseenter","message","keyup","keydown"],"customEvents":[{"name":"spyne_cms_item_connected","buffer":400}],"listenForScroll":true,"listenForOrientation":true,"debounceMSTimeForScroll":50}},"debug":true,"storageConfig":{"storageKey":"spyneAppStorage","theme":"auto","themeDefaults":{"colorScheme":"auto","enableTransitions":true}}};

SpyneApp.init(config);

SpyneAppProperties.setProp('pageItemTemplateLookup', pageItemTemplateLookup);
SpyneApp.registerChannel(new ChannelApp());
SpyneApp.registerChannel(new ChannelLocalStorage());
SpyneApp.registerChannel(new ChannelMenuDrawer());

// Acme API tier — data path for the Next.js comparison. See channel-acme-api.js.
registerAcmeApiChannels();

const registerCmsChannels = () => {
  const mapFn = SpyneApp.pluginsFn.mapCmsData || ((d) => d);

  SpyneApp.registerChannel(
    new ChannelFetch('CHANNEL_FETCH_MODEL', {
      url: AppModelURL,
      map: mapFn,
    }),
  );
};

if (process.env.NODE_ENV === 'development') {
  import('./dev-tools.js').then(({ devToolsReady }) => {
    devToolsReady.then(registerCmsChannels);
  });
} else {
  // production: no CMS, no delay
  registerCmsChannels();
}

new AppContainer().prependToDom(document.querySelector('body'));
