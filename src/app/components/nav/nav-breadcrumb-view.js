import { ViewStream } from 'spyne';
import { NavBreadcrumbViewTraits } from 'traits/nav/nav-breadcrumb-view-traits.js';
import BCTmpl from './templates/nav-breadcrumb-view.tmpl.html';

export class NavBreadcrumbView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'nav';
    props.class = 'breadcrumbs';
    props.template = BCTmpl;
    props.traits = [NavBreadcrumbViewTraits];

    props.channels = ['CHANNEL_APP', 'CHANNEL_ROUTE'];
    props['aria-label'] = 'breadcrumb';
    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_APP_INIT_EVENT', 'navBreadcrumb$OnAppInitEvent']];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
