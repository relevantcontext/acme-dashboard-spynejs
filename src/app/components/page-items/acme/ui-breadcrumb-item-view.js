import { ViewStream } from 'spyne';
import UIBreadcrumbItemTmpl from './templates/ui-breadcrumb-item-view.tmpl.html';

/**
 * One crumb of app/ui/invoices/breadcrumbs.tsx.
 *
 * Two decisions are resolved by the caller because the template has no
 * conditionals or index arithmetic:
 *
 *   - `active` selects the text colour.
 *   - the source renders `/` for every crumb except the last
 *     (`index < breadcrumbs.length - 1`). Here `isLast` controls a `separator`
 *     object section, which renders the span only when present.
 *
 * @param {Object} props
 * @param {String} props.label
 * @param {String} props.href
 * @param {Boolean} [props.active]
 * @param {Boolean} [props.isLast]
 */
export class UIBreadcrumbItemView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'li';
    props.class = props.active ? 'text-gray-900' : 'text-gray-500';
    props.template = UIBreadcrumbItemTmpl;
    props.data = {
      label: props.label || '',
      attrHref: props.href || '',
      separator: props.isLast ? undefined : {},
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
