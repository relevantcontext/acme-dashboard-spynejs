import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import { UIAcmeLogoView } from 'components/page-items/acme/ui-acme-logo-view.js';
import UISideNavTmpl from './templates/ui-sidenav-view.tmpl.html';
import { AcmeNavTraits } from 'traits/acme-nav-traits.js';

/**
 * Converted from app/ui/dashboard/sidenav.tsx.
 *
 * Two slots are left empty for nested ViewStreams — `[data-slot="acme-logo"]`
 * takes UIAcmeLogoView and `[data-slot="nav-links"]` takes the UINavLinkView
 * instances. Composition happens at the ViewStream level, so the template
 * describes the shape and the mounting comes later.
 *
 * The source wraps the sign-out button in a <form> whose action is the
 * `signOut` server action. There is no server action here, so the form is
 * dropped and the button stands on its own; the click is wired later.
 */
export class UISideNavView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'flex h-full flex-col px-3 py-4 md:px-2';
    props.template = UISideNavTmpl;
    props.channels = ['CHANNEL_ROUTE'];
    props.traits = [AcmeNavTraits]
    props.data = {
      signOutText: 'Sign Out',
      svgPower: withClass('power', 'w-6'),
    };

    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_ROUTE_DEEPLINK_EVENT', 'acmeNav$OnInitNav']];
  }

  broadcastEvents() {
    return [
      ['button#sign-out', 'click']
    ];
  }

  onRendered() {
    this.appendView(new UIAcmeLogoView(), `[data-slot='acme-logo']`);

  }
}
