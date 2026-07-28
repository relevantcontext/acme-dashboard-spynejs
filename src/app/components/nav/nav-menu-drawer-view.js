import { ViewStream } from 'spyne';
import MenuDrawerNavTmpl from 'components/nav/templates/nav-menu-drawer-content.tmpl.html';
import { NavMenuDrawerViewTraits } from 'traits/nav/nav-menu-drawer-view-traits.js';

export class NavMenuDrawerView extends ViewStream {
  constructor(props = {}) {
    props.id = 'menu-drawer-content';
    props.tagName = 'nav';
    props.channels = ['CHANNEL_ROUTE'];
    props.traits = [NavMenuDrawerViewTraits];
    props.template = MenuDrawerNavTmpl;

    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_ROUTE_CHANGE_EVENT', 'navMenuDrawerView$SetActiveLink']];
  }

  broadcastEvents() {
    return [['a', 'click']];
  }

  onRendered() {}
}
