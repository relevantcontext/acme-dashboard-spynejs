import { ViewStream, safeClone, SpyneAppProperties } from 'spyne';
import { PageItemCoreTraits } from 'traits/page/page-item-core-traits.js';
import { getPageTemplate } from 'traits/utils/page-template-lookup.js';
import PageTmpl from './templates/page.tmpl.html';

export class PageAcmeView extends ViewStream {
  constructor(props = {}) {
    props.class = `page-view page-view-${props?.data?.pageId}`;
    props.channels = [['CHANNEL_ROUTE', true], 'CHANNEL_ACME_DATA'];
    props.traits = [PageItemCoreTraits];
    props.data = safeClone(props.data);
    props.data.href = SpyneAppProperties.getHrefFromData(props.data);

    // A page names its own layout in app.model.json via `template`, e.g.
    // "dashboard.page.tmpl.html". Unknown or absent falls back to the shared
    // page.tmpl.html, so existing pages are unaffected.
    props.template = getPageTemplate(props.data.template);

    super(props);
  }


  addActionListeners() {
    return [['CHANNEL_ROUTE_CHANGE_EVENT', 'disposeViewStream']];
  }

  broadcastEvents() {
    return [['a', 'click']];
  }

  onRendered() {
    /**
     * TODO: move this rendering to capture acme data and wire to pageItemCore$AddDashboardPageItems
     *
     * */

    const onDelay = () => this.pageItemCore$onRendered();
    window.setTimeout(onDelay, 40);
  }
}
