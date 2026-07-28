import { SpyneTrait } from 'spyne';
import { pick } from 'ramda';
export class NavBreadcrumbItemTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'navBreadcrumbItem$';

    super(context, traitPrefix);
  }

  static navBreadcrumbItem$GetRouteState(payload, props = this.props) {
    const { bcProps, navLevel, navLinks } = props;
    const { paths = [], pathInnermost } = payload;
    const { pageId, topicId, optionId } = payload?.routeData || {};

    const isHome = pageId === 'home';

    // Check if ANY bcProp is present in `paths`
    const isCurrentPath = bcProps.some((prop) => paths.includes(prop));

    // The "selected" prop is whichever bcProp matches pathInnermost
    const isSelectedProp = isCurrentPath && bcProps.includes(pathInnermost);

    // isActiveLevel could mean we're on the correct path and there is a deeper path level available
    const isActiveLevel = isCurrentPath && paths.length > navLevel;

    return {
      isHome,
      isCurrentPath,
      isSelectedProp,
      isActiveLevel,
      bcProps,
      navLevel,
      navLinks,
      pageId,
      topicId,
      optionId,
    };
  }

  static navBreadcrumbItem$GetState(payload, props = this.props) {
    const {
      isHome,
      isCurrentPath,
      isActiveLevel,
      bcProps,
      navLevel,
      navLinks,
    } = this.navBreadcrumbItem$GetRouteState(payload, props);

    // Visible if not home and the route includes any of our bcProps
    const isVisible = !isHome && isCurrentPath;
    // Active if it's visible AND the nav level suggests we're not at the deepest route
    const isActive = isVisible && isActiveLevel;

    // If it's not visible, no need to find a navLink
    if (!isVisible) {
      return { isVisible, isActive };
    }

    // Gather all values for the bcProps from the route data
    const bcValues = bcProps.map((prop) => payload?.routeData?.[prop]);

    // Look up the corresponding nav link in navLinks
    const navLink = this.navBreadcrumbItem$FindNavLink(
      { bcProps, bcValues, navLevel },
      navLinks,
    );

    return { isVisible, isActive, bcProps, bcValues, navLevel, navLink };
  }

  static navBreadcrumbItem$FindNavLink(
    filterData,
    navLinks = this.props.navLinks,
  ) {
    const { bcProps, bcValues, navLevel } = filterData;
    return navLinks.find((link) => {
      if (link.navLevel !== navLevel) return false;
      // All bcProps must match the corresponding bcValues for this link
      return bcProps.every((prop, i) => link[prop] === bcValues[i]);
    });
  }

  static navBreadcrumbItem$getBreadcrumbLinkClass({
    isVisible = true,
    isActive = true,
  } = {}) {
    return [
      'breadcrumb-item', // Base class
      !isVisible && 'breadcrumb-item--hidden', // Hides the link if false
      isActive ? 'breadcrumb-item--active' : 'breadcrumb-item--inactive',
    ]
      .filter(Boolean)
      .join(' ');
  }

  static navBreadcrumbItem$UpdateLink(e) {
    const { payload } = e;
    const { paths } = payload;
    const bcState = this.navBreadcrumbItem$GetState(payload);
    const { isVisible, isActive, navLink, bcProps } = bcState;
    const breadcrumbClass = this.navBreadcrumbItem$getBreadcrumbLinkClass({
      isVisible,
      isActive,
    });

    this.props.el$.setClass(breadcrumbClass);

    const updateLink = () => {
      if (navLink === undefined) {
        return;
      }
      this.props.link$.el.innerText = navLink.title;
      this.props.link$.el.href = navLink.href;

      bcProps.forEach((prop) => {
        const value = payload.routeData?.[prop] || '';
        this.props.linkData[prop] = value;

        const datasetObjProps = pick(paths, navLink);

        for (const [k, v] of Object.entries(datasetObjProps)) {
          this.props.link$.el.dataset[k] = v;
        }

        // Optionally, also update the DOM dataset:
        //this.props.link$.el.dataset[prop] = value;
      });
    };

    if (isActive === false) {
      this.props.el.setAttribute('aria-current', 'page');
      this.props.el.tabIndex = -1;
    } else {
      this.props.el.removeAttribute('aria-current');
      this.props.el.tabIndex = 0;
    }

    if (isVisible) {
      updateLink();
    } else {
      this.props.link$.el.innerText = '';
    }
  }

  navBreadcrumbItem$UIBreadcrumbOnRendered() {
    this.props.link$ = this.props.el$('a');
    this.props.linkData = this.props.link$.el.dataset;

    if (this.props.initPayload) {
      this.navBreadcrumbItem$UpdateLink({ payload: this.props.initPayload });
    }
  }
}
