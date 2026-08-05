import { SpyneTrait } from 'spyne';
import { QuickSearchOverlayView } from 'components/search/quick-search-overlay-view.js';

export class QuickSearchHostTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'quickSearchHost$');
  }

  static quickSearchHost$OnOpen() {
    this.appendView(new QuickSearchOverlayView());
  }
}
