import { ViewStream, safeClone, SpyneAppProperties } from 'spyne';
import { PageItemCoreTraits } from 'traits/page/page-item-core-traits.js';
import pageTemplateLookup from 'traits/utils/page-template-lookup.js';
import PageTmpl from './templates/page.tmpl.html';

export class PageView extends ViewStream {
  constructor(props = {}) {
    props.class = `page-view page-view-${props?.data?.pageId}`;
    props.channels = [['CHANNEL_ROUTE', true]];
    props.traits = [PageItemCoreTraits];
    props.data = safeClone(props.data);
    props.data.href = SpyneAppProperties.getHrefFromData(props.data);

    // A page names its own layout in app.model.json via `template`, e.g.
    // "dashboard.page.tmpl.html". Unknown or absent falls back to the shared
    // page.tmpl.html, so existing pages are unaffected.
    props.template = PageView.getPageTemplate(props.data.template);

    super(props);
  }

  static getPageTemplate(templateName) {
    if (typeof templateName !== 'string' || !templateName.trim()) {
      return PageTmpl;
    }

    const template = pageTemplateLookup[templateName];

    if (template === undefined) {
      console.warn(
        `Spyne Warning: unknown page template "${templateName}" — falling back to page.tmpl.html`,
      );
      return PageTmpl;
    }

    return template;
  }
  addActionListeners() {
    return [['CHANNEL_ROUTE_CHANGE_EVENT', 'disposeViewStream']];
  }

  broadcastEvents() {
    return [['a', 'click']];
  }

  onRendered() {
    this.pageItemCore$onRendered();
  }
}
