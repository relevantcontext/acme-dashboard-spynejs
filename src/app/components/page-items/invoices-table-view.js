import { ViewStream } from 'spyne';
import InvoicesTableTmpl from './templates/invoices-table.tmpl.html';

/**
 * Converted from app/ui/invoices/table.tsx (outer markup).
 *
 * The source renders the same invoices twice — a stack of cards below `md` and
 * a real table at `md` and up. Both are preserved: mount InvoiceCardView into
 * [data-slot="invoice-cards"] and InvoiceTableRowView into
 * [data-slot="invoice-rows"].
 */
export class InvoicesTableView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'mt-6 flow-root';
    props.template = InvoicesTableTmpl;

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
