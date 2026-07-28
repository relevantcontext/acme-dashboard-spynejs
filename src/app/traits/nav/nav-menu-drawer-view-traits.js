import { SpyneTrait } from 'spyne';

export class NavMenuDrawerViewTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'navMenuDrawerView$';
    super(context, traitPrefix);
  }

  static navMenuDrawerView$SetActiveLink(e) {
    const { routeData } = e.payload;
    const { pageId, topicId = '' } = routeData;
    const activeSel = `a.nav[data-page-id='${pageId}'][data-topic-id='${topicId}']`;
    this.props.el$('a.nav').setActiveItem('selected', activeSel);
  }
}
