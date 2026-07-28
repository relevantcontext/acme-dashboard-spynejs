import { SpyneTrait } from 'spyne';
import { NavBreadcrumbView } from 'components/nav/nav-breadcrumb-view.js';
import { Page404View } from 'components/pages/page-404-view.js';
import { PageView } from 'components/pages/page-view.js';

export class StageContainerTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'stage$';
    super(context, traitPrefix);
  }

  static stage$OnRouteEvent(e, isDeepLink = false) {
    const { pageId, is404 } = e.payload;
    const pageLookupTable = {
      404: Page404View,
    };

    let PageClass = pageLookupTable[pageId] || PageView;
    if (is404) {
      PageClass = Page404View;
    }
    const data = e.payload;
    this.appendView(new PageClass({ data, isDeepLink }), '.page-container');
  }

  static stage$OnAppInitEvent(e) {
    this.stage$OnRouteEvent(e, true);
  }

  static stage$OnRendered() {
    this.appendView(new NavBreadcrumbView(), '.slot-page');
  }
}
