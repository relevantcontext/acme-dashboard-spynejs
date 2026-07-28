import { SpyneTrait } from 'spyne';
import { NavBreadcrumbItem } from 'components/nav/nav-breadcrumb-item.js';
export class NavBreadcrumbViewTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'navBreadcrumb$';

    super(context, traitPrefix);
  }

  static navBreadcrumb$OnAppInitEvent(e) {
    const payload = e.payload.initData;
    this.navBreadcrumb$initBreadcrumbs({ payload });
  }

  static navBreadcrumb$getBreadcrumbObjs(navLinks) {
    const OMIT_KEYS = new Set(['title', 'href', 'navLevel']);
    const encountered = new Set(); // track which properties we've already assigned
    const bcMap = new Map(); // maps navLevel -> { navLevel, bcProps: [] }

    // Sort by navLevel ascending
    const sortedLinks = [...navLinks].sort((a, b) => a.navLevel - b.navLevel);

    for (const link of sortedLinks) {
      const { navLevel } = link;

      // If we haven't seen this navLevel yet, create an entry
      if (!bcMap.has(navLevel)) {
        bcMap.set(navLevel, { navLevel, bcProps: [] });
      }

      // Check each property in the link object
      for (const [key, value] of Object.entries(link)) {
        // Skip if it's an omitted key or already encountered or empty string
        if (
          OMIT_KEYS.has(key) ||
          encountered.has(key) ||
          key === 'undefined' ||
          value === ''
        ) {
          continue;
        }

        // Otherwise, mark this key as encountered
        encountered.add(key);
        // Add it to the bcProps array for this navLevel
        bcMap.get(navLevel).bcProps.push(key);
      }
    }

    // Convert the map to an array sorted by navLevel
    return Array.from(bcMap.values()).sort((a, b) => a.navLevel - b.navLevel);
  }

  static navBreadcrumb$initBreadcrumbs(e) {
    const { navLinks, routeData } = e.payload;

    const breacrumbObjs = this.navBreadcrumb$getBreadcrumbObjs(navLinks);

    const addBreadcrumbs = (bcObj) => {
      const { bcProps, navLevel } = bcObj;
      this.appendView(
        new NavBreadcrumbItem({
          bcProps,
          navLevel,
          navLinks,
          initPayload: e.payload,
          routeData,
        }),
        '.breadcrumbs-list',
      );
    };

    breacrumbObjs.forEach(addBreadcrumbs);
  }
}
