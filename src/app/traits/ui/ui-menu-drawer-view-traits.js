import { SpyneTrait } from 'spyne';
import { NavMenuDrawerView } from 'components/nav/nav-menu-drawer-view.js';

export class UIMenuDrawerViewTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'uiMenuDrawer$';
    super(context, traitPrefix);
  }

  static uiMenuDrawer$addContent(e) {
    const data = e.payload.initData.navLinks;
    this.appendView(new NavMenuDrawerView({ data }));
    this.uiMenuDrawer$SetActiveLink(e);
  }

  static uiMenuDrawer$onShowMenuDrawerEvent(e) {
    const { action } = e;
    const showDrawer = action === 'CHANNEL_MENU_DRAWER__SHOW_EVENT';
    this.props.el$.toggleClass('open', showDrawer);
    this.uiMenuDrawer$SetActiveLink(e);
  }

  static uiMenuDrawer$SetActiveLink(e) {
    const { routeData } = e.payload;
    if (routeData === undefined) {
      return;
    }

    const { pageId, topicId = '' } = routeData;
    const activeSel = `a.nav[data-page-id='${pageId}'][data-topic-id='${topicId}']`;
    this.props.el$('a.nav').setActiveItem('selected', activeSel);
  }
}
