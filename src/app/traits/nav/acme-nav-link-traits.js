import { SpyneTrait } from 'spyne';

export class AcmeNavLinkTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'acmeNavLink$');
  }

  static acmeNavLink$OnRoute(e) {
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
