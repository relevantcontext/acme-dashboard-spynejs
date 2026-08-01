import { ViewStream } from 'spyne';
import InvoicesPaginationEllipsisTmpl from './templates/invoices-pagination-ellipsis-view.tmpl.html';

export class InvoicesPaginationEllipsisView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class =
      'flex h-10 w-10 items-center justify-center border text-sm text-gray-300';
    props.template = InvoicesPaginationEllipsisTmpl;
    props['aria-hidden'] = 'true';

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
