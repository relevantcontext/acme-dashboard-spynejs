import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { UIAcmeLogoView } from 'components/page-items/ui-acme-logo-view.js';
import UISideNavTmpl from './templates/ui-sidenav-view.tmpl.html';
import { AcmeNavTraits } from 'traits/nav/acme-nav-traits.js';

/**
 * Converted from app/ui/dashboard/sidenav.tsx.
 *
 * Two slots are left empty for nested ViewStreams — `[data-slot="acme-logo"]`
 * takes UIAcmeLogoView and `[data-slot="nav-links"]` takes the UINavLinkView
 * instances. Composition happens at the ViewStream level, so the template
 * describes the shape and the mounting comes later.
 *
 * The source wraps the sign-out button in a <form>. That wrapper is preserved
 * because it participates in the responsive flex layout; only the server
 * action is replaced by the ViewStream's declared click broadcast.
 */
export class UISideNavView extends ViewStream {
  constructor(props = {}) {
    const { signOutText = 'Sign Out', searchText = 'Search' } =
      props.data || {};

    props.tagName = 'div';
    props.class = 'flex h-full flex-col px-3 py-4 md:px-2';
    props.template = UISideNavTmpl;
    props.channels = ['CHANNEL_ROUTE'];
    props.traits = [AcmeNavTraits];
    props.data = {
      ...props.data,
      signOutText,
      searchText,
      // The hint mirrors what the overlay actually listens for: metaKey OR
      // ctrlKey plus K. Platform decides which one to advertise.
      searchShortcut: /Mac|iPhone|iPad/.test(navigator.platform)
        ? '⌘K'
        : 'Ctrl K',
      svgPower: withClass('power', 'w-6'),
      svgMagnifyingGlass: withClass('magnifyingGlass', 'w-6'),
    };

    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_ROUTE_DEEPLINK_EVENT', 'acmeNav$OnInitNav']];
  }

  broadcastEvents() {
    // The search button is the sidenav's visible route into the quick-search
    // overlay; the click rides CHANNEL_UI and the overlay narrows on its
    // eventType — this view knows nothing about what opens.
    return [
      ['button#sign-out', 'click'],
      ['button#quick-search-open', 'click'],
    ];
  }

  onRendered() {
    this.appendView(new UIAcmeLogoView(), `[data-slot='acme-logo']`);
  }
}
