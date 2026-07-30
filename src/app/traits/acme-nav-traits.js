import { SpyneTrait } from 'spyne';
import { UINavLinkView} from 'components/page-items/acme/ui-nav-link-view.js';

export class AcmeNavTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'acmeNav$';
    super(context, traitPrefix);
  }



  static acmeNav$OnInitNav(e) {
    const {navLinks} = e.payload;

    console.log("NAV LINKS ",{e, navLinks})

    this.appendView(new UINavLinkView({
      data: navLinks
    }), `[data-slot='nav-links']`);

  }
}
