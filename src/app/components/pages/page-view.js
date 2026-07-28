import { ViewStream, safeClone, SpyneAppProperties } from 'spyne';
import { PageItemCoreTraits } from 'traits/page/page-item-core-traits.js';
import PageTmpl from './templates/page.tmpl.html';

export class PageView extends ViewStream {
  constructor(props = {}) {
    props.class = `page-view page-view-${props?.data?.pageId}`;
    props.channels = [['CHANNEL_ROUTE', true]];
    props.traits = [PageItemCoreTraits];
    props.data = safeClone(props.data);
    props.data.href = SpyneAppProperties.getHrefFromData(props.data);
    props.template = PageTmpl;

    super(props);
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
