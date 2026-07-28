// dev-tools.js
import { SpyneApp } from 'spyne';
import { SpynePluginConsole } from 'spyne-plugin-console';
import { SpyneCmsPlugin } from '@spynejs/cms';

const cmsPluginConfig = {
  position: ['bottom', 'right'],
  openOnLoad: true,
  darkMode: true,
  maximize: true,
};

export const devToolsReady = new Promise((resolve) => {
  const spyneCmsPlugin = new SpyneCmsPlugin(cmsPluginConfig);
  SpyneApp.registerPlugin(spyneCmsPlugin);

  SpyneApp.registerPlugin(
    new SpynePluginConsole({
      position: ['bottom', 'left'],
      minimize: false,
    }),
  );

  /**
   * Resolve once CMS wiring is complete.
   * If the plugin exposes a lifecycle hook later,
   * this can be replaced without touching consumers.
   */
  requestAnimationFrame(() => {
    resolve();
  });
});
