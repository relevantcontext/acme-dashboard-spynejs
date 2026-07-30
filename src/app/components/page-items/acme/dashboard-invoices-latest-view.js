import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import DashboardInvoicesLatestTmpl from './templates/dashboard-invoices-latest-view.tmpl.html';

/**
 * Converted from app/ui/dashboard/latest-invoices.tsx (outer markup).
 *
 * The five rows are DashboardInvoicesLatestRowView instances mounted into
 * [data-slot="invoice-rows"]; composition happens at the ViewStream level.
 */
export class DashboardInvoicesLatestView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'flex w-full flex-col md:col-span-4';
    props.template = DashboardInvoicesLatestTmpl;
    props.data = {
      heading: props.heading || 'Latest Invoices',
      updatedText: props.updatedText || 'Updated just now',
      svgArrowPath: withClass('arrowPath', 'h-5 w-5 text-gray-500'),
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
