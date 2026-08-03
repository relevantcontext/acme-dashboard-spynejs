import { ViewStream, safeClone, SpyneAppProperties } from 'spyne';
import { PageItemCoreTraits } from 'traits/page-item-core-traits.js';
import { getPageTemplate } from 'utils/page-template-lookup.js';

export class PageGuestView extends ViewStream {
  constructor(props = {}) {
    props.class = `page-view page-view-${props?.data?.pageId}`;
    props.channels = [['CHANNEL_ROUTE', true]];
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

  /**
   * No delay and no data subscription. A guest page's items are static content
   * from app.model.json, and the template has already rendered its regions by
   * the time this runs, so there is nothing to wait for.
   */
  onRendered() {
    this.pageItemCore$onRendered();
  }
}
