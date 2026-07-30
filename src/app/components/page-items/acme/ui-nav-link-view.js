import { ViewStream } from 'spyne';
import UINavLinkTmpl from './templates/ui-nav-link-view.tmpl.html';

/**
 * Converted from app/ui/dashboard/nav-links.tsx.
 *
 * Renders the whole nav list, not one link: `props.data` is the navLinks array
 * off the route payload, and the template iterates it into one anchor per entry
 * carrying its own ROUTE data attributes.
 *
 * The root is `display: contents`, so it disappears from layout and the anchors
 * become direct flex children of the sidenav's
 * `flex ... md:flex-col md:space-y-2` wrapper. That mirrors the source, where
 * NavLinks returns a fragment and the links are laid out by SideNav's wrapper —
 * which is what makes `md:justify-start` on each anchor left-align them in a
 * column.
 *
 * Two things this class must NOT do, both learned the hard way:
 *
 *   1. Put a single link's styles on `props.class`. The class is applied to the
 *      root as well, which turned it into a 48px flex row and collapsed all
 *      seven links into it.
 *
 *   2. Set `display` inline on the anchors. An inline style beats every class,
 *      so `flex` never applied and `md:justify-start` silently did nothing —
 *      justify-content has no effect on a block element.
 */
export class UINavLinkView extends ViewStream {
  constructor(props = {}) {
    props.class = 'contents';
    props.template = UINavLinkTmpl;
    props.data = props.data || [];

    super(props);
  }

  addActionListeners() {
    return [];
  }

  broadcastEvents() {
    return [
      ['a', 'click']
    ];
  }

  onRendered() {}
}
