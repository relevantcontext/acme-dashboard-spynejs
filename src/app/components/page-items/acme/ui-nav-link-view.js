import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import UINavLinkTmpl from './templates/ui-nav-link-view.tmpl.html';

const LINK_BASE =
  'flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3';

/**
 * Converted from app/ui/dashboard/nav-links.tsx.
 *
 * The source maps over a hard-coded `links` array and renders one Link each.
 * Here each link is its own module; the list that renders three of them is
 * composition and belongs to whatever mounts them.
 *
 * The active state is applied from `props.isActive` rather than compared
 * against a pathname — route awareness is wiring, not markup.
 *
 * @param {Object} props
 * @param {String} props.name
 * @param {String} props.href
 * @param {String} props.icon      key from traits/utils/svg-icons.js
 * @param {Boolean} [props.isActive]
 */
export class UINavLinkView extends ViewStream {
  constructor(props = {}) {
    props.class = props.isActive
      ? `${LINK_BASE} bg-sky-100 text-blue-600`
      : LINK_BASE;
    props.href = props.href || '';
    props.template = UINavLinkTmpl;
    console.log("PROPS DATA IS ",props.data);
    props.data1 = {
      name: props.name || '',
      svgIcon: props.icon ? withClass(props.icon, 'w-6') : '',
    };

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
