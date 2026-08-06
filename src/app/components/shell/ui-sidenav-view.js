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
    const { signOutText = 'Sign Out' } = props.data || {};

    props.tagName = 'div';
    props.class = 'flex h-full flex-col px-3 py-4 md:px-2';
    props.template = UISideNavTmpl;
    props.channels = ['CHANNEL_ROUTE'];
    props.traits = [AcmeNavTraits];
    props.data = {
      ...props.data,
      signOutText,
      svgPower: withClass('power', 'w-6'),
      // The quick-search affordance. The visible hint mirrors the shortcut the
      // WINDOW-channel listener actually answers to on this platform.
      searchText: 'Search',
      searchShortcut: /Mac|iP(hone|ad|od)/.test(navigator.platform)
        ? '⌘K'
        : 'Ctrl K',
      svgSearch: withClass('magnifyingGlass', 'w-6'),
    };

    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_ROUTE_DEEPLINK_EVENT', 'acmeNav$OnInitNav']];
  }

  broadcastEvents() {
    // Two static buttons, each carrying its own eventType/btnType dataset:
    // sign-out routes to the auth flow, quick-search-open to the quick-search
    // channel's CHANNEL_UI subscription.
    return [
      ['button#sign-out', 'click'],
      ['button#quick-search-open', 'click'],
    ];
  }

  onRendered() {
    this.appendView(new UIAcmeLogoView(), `[data-slot='acme-logo']`);
  }
}
