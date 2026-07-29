import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import LatestInvoicesTmpl from './templates/latest-invoices.tmpl.html';

/**
 * Converted from app/ui/dashboard/latest-invoices.tsx (outer markup).
 *
 * The five rows are LatestInvoiceRowView instances mounted into
 * [data-slot="invoice-rows"]; composition happens at the ViewStream level.
 */
export class LatestInvoicesView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'flex w-full flex-col md:col-span-4';
    props.template = LatestInvoicesTmpl;
    props.data = {
      heading: 'Latest Invoices',
      updatedText: 'Updated just now',
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
