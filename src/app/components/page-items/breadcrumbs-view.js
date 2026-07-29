import { ViewStream } from 'spyne';
import BreadcrumbsTmpl from './templates/breadcrumbs.tmpl.html';

/**
 * Converted from app/ui/invoices/breadcrumbs.tsx (outer markup).
 *
 * Crumbs are BreadcrumbItemView instances mounted into [data-slot="crumbs"],
 * matching how nav-breadcrumb-view.js already does it in this app: a container
 * with an empty list, one ViewStream per item.
 */
export class BreadcrumbsView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'nav';
    props.class = 'mb-6 block';
    props.ariaLabel = 'Breadcrumb';
    props.template = BreadcrumbsTmpl;

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
