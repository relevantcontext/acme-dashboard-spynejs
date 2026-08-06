import { SpyneTrait } from 'spyne';
import { UINavLinkView } from 'components/elements/ui-nav-link-view.js';
import { withClass } from 'utils/svg-icons.js';

const NAV_PRESENTATION = {
  home: { navTitle: 'Home', icon: 'home' },
  invoices: { navTitle: 'Invoices', icon: 'documentDuplicate' },
  customers: { navTitle: 'Customers', icon: 'userGroup' },
};

export class AcmeNavTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'acmeNav$');
  }

  static acmeNav$OnInitNav(e) {
    const { navLinks = [] } = e.payload;
    const data = Array.from(navLinks)
      .filter(({ pageId, navLevel }) => pageId === 'dashboard' && navLevel <= 2)
      .map((link) => {
        const presentation = NAV_PRESENTATION[link.topicId || 'home'];

        return {
          ...link,
          navTitle: presentation.navTitle,
          svgIcon: withClass(presentation.icon, 'w-6'),
        };
      });

    this.appendView(new UINavLinkView({ data }), `[data-slot='nav-links']`);
  }

  /**
   * Marks the link matching the current route. Composed into UINavLinkView,
   * where acmeNav$OnInitNav is composed into UISideNavView — one trait class,
   * two views, because "the acme sidenav" is one concern and stating it twice
   * in two files stated it no better. 
   */
  static acmeNav$OnLinkRoute(e) {
    const { pageId, topicId } = e?.payload?.routeData || {};
    const currentHref = topicId ? `/${pageId}/${topicId}` : `/${pageId}`;
    const links = this.props.el$('a[data-nav-href]').els || [];

    links.forEach((link) => {
      const isActive = link.dataset.navHref === currentHref;
      link.classList.toggle('bg-sky-100', isActive);
      link.classList.toggle('text-blue-600', isActive);
    });
  }
}
