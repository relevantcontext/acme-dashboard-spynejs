import { ViewStream } from 'spyne';
import { PageItemCoreTraits } from 'traits/pages/page-item-core-traits.js';
import { getPageTemplate } from 'utils/page-template-lookup.js';

export class PageGuestView extends ViewStream {
  constructor(props = {}) {
    props.class = `page-view page-view-${props?.data?.pageId}`;
    props.channels = [['CHANNEL_ROUTE', true]];
    props.traits = [PageItemCoreTraits];
    // props.data is a node of the app model, arriving through a channel
    // payload — frozen, and shared by reference with every other consumer. The
    // page reads it and hands it down; it writes NOTHING into it, which is what
    // makes holding the reference safe. (An earlier version cloned it here to
    // support writing a derived href into data — a value nothing ever read.
    // Derived per-view values belong on props or on the instance at
    // onRendered, never written into shared data.)

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
