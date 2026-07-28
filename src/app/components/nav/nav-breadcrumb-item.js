import { ViewStream } from 'spyne';
import { NavBreadcrumbItemTraits } from 'traits/nav/nav-breadcrumb-item-traits.js';
import BreadcrumbTmpl from './templates/nav-breadcrumb-item.tmpl.html';
export class NavBreadcrumbItem extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'li';
    props.class = 'breadcrumb-item';
    props.traits = [NavBreadcrumbItemTraits];
    props.channels = ['CHANNEL_ROUTE'];
    props.template = BreadcrumbTmpl;
    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_ROUTE_.*_EVENT', 'navBreadcrumbItem$UpdateLink']];
  }

  broadcastEvents() {
    return [['a', 'click']];
  }

  onRendered() {
    this.navBreadcrumbItem$UIBreadcrumbOnRendered();
  }
}
