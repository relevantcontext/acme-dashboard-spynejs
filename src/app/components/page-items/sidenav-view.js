import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import SideNavTmpl from './templates/sidenav.tmpl.html';

/**
 * Converted from app/ui/dashboard/sidenav.tsx.
 *
 * Two slots are left empty for nested ViewStreams — `[data-slot="acme-logo"]`
 * takes AcmeLogoView and `[data-slot="nav-links"]` takes the NavLinkView
 * instances. Composition happens at the ViewStream level, so the template
 * describes the shape and the mounting comes later.
 *
 * The source wraps the sign-out button in a <form> whose action is the
 * `signOut` server action. There is no server action here, so the form is
 * dropped and the button stands on its own; the click is wired later.
 */
export class SideNavView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'flex h-full flex-col px-3 py-4 md:px-2';
    props.template = SideNavTmpl;
    props.data = {
      signOutText: 'Sign Out',
      svgPower: withClass('power', 'w-6'),
    };

    super(props);
  }

  addActionListeners() {
    return [];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
