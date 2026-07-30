import { SpyneTrait } from 'spyne';
import { UINavLinkView} from 'components/page-items/acme/ui-nav-link-view.js';

export class AcmeNavTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'acmeNav$';
    super(context, traitPrefix);
  }



  static acmeNav$OnInitNav(e) {
    const {navLinks} = e.payload;

    const data = Array.from(navLinks).filter(o => o.pageId==='dashboard')



    console.log("NAV LINKS ",{e, data, navLinks})

    this.appendView(new UINavLinkView({
      data
    }), `[data-slot='nav-links']`);

  }
}
