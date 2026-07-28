import { SpyneTrait } from 'spyne';

export class NavHeaderHamburgerItemTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'navHeaderHamburgerItem$';
    super(context, traitPrefix);
  }

  static navHeaderHamburgerItem$OnShowMenuDrawerEvent(e) {
    const { action } = e;
    const isActiveBurger = action === 'CHANNEL_MENU_DRAWER__SHOW_EVENT';
    this.props.el$.toggleClass('open', isActiveBurger);
  }
}
