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
      svgMagnifyingGlass: withClass('magnifyingGlass', 'w-6'),
      // The visible affordance advertises the shortcut the search channel
      // listens for; the string is display-only.
      kbdHint: /Mac/.test(window.navigator.platform) ? '⌘K' : 'Ctrl K',
    };

    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_ROUTE_DEEPLINK_EVENT', 'acmeNav$OnInitNav']];
  }

  broadcastEvents() {
    return [
      ['button#sign-out', 'click'],
      // The quick-search affordance; its dataset routes the click to
      // CHANNEL_ACME_SEARCH. [dataset-as-payload]
      ['button#quick-search-open', 'click'],
    ];
  }

  onRendered() {
    this.appendView(new UIAcmeLogoView(), `[data-slot='acme-logo']`);
  }
}
