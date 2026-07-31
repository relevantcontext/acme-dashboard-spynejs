import { ViewStream } from 'spyne';
import CustomersTableTmpl from './templates/customers-table-view.tmpl.html';

/**
 * Converted from app/ui/customers/table.tsx (outer markup).
 *
 * Three slots for nested ViewStreams:
 *   [data-slot="search"]         a UISearchView (the source renders <Search>
 *                                inside the table, so it stays a child here)
 *   [data-slot="customer-cards"] CustomersCardView per customer, below md
 *   [data-slot="customer-rows"]  CustomersTableRowView per customer, md and up
 *
 * Like the invoices table, the source renders every customer twice — a card
 * stack for narrow viewports and a real table for wide — and both are kept.
 */
export class CustomersTableView extends ViewStream {
  constructor(props = {}) {
    const { heading = 'Customers' } = props.data || {};

    props.tagName = 'div';
    props.class = 'w-full';
    props.template = CustomersTableTmpl;
    props.data = { ...props.data, heading };

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
