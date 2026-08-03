import { ViewStream } from 'spyne';
import { InvoicesTableRowTraits } from 'traits/invoices-table-row-traits.js';
import InvoicesTableRowTmpl from './templates/invoices-table-row-view.tmpl.html';

/**
 * One desktop row of app/ui/invoices/table.tsx.
 *
 * ── Why a ViewStream, and why its events are declared right here ────────────
 *
 * A row carries two controls — edit and delete — so it is an element with
 * behaviour, and a view per row is the framework's DEFAULT answer for children
 * that have any. [mint-child-view-by-channel-need]
 *
 * The load-bearing part is that `broadcastEvents` lives on the row itself.
 * Binding is snapshot-direct: the framework runs each selector against the
 * view's root at ITS render and attaches a listener to every element it finds.
 * Declaring them here means each row binds its own two controls as it is born,
 * and the binding rides the row's lifecycle — no ordering to get right, and
 * `srcElement` is the anchor or the button, so its dataset is the row's
 * identity rather than some container's. [declare-broadcast-events]
 * [dataset-as-payload] [dynamic-children-ingress recipe 1]
 *
 * The alternative — inert markup plus a window-channel listener narrowed by
 * selector — is recipe 2 of the same operation, and it is the right answer at a
 * scale where a view per row is disproportionate. It is not this scale. Twelve
 * rows do not justify moving their wiring to a global tier, and the local form
 * is the one a reader can follow from the markup to the handler without leaving
 * the module.
 *
 * ── One channel, for one question ───────────────────────────────────────────
 *
 * A row does not subscribe for its visibility: whether it is on the current
 * page, and whether it is the first or last VISIBLE row, are facts about the
 * SET, and the table owns those.
 *
 * It subscribes for its own existence. "Has my invoice been deleted" is about
 * this row alone, and only this row can act on the answer — a parent never holds
 * a reference to a child ViewStream, so disposal has to originate here.
 * [invoicesTableRow$OnList]
 *
 * @param {Object} props
 * @param {Object} props.data  one entry from buildInvoiceRows
 */
export class InvoicesTableRowView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'tr';
    props.class = 'invoice-row';
    props.dataset = { invoiceId: props.data?.attrInvoiceId };
    props.template = InvoicesTableRowTmpl;
    props.channels = ['CHANNEL_ACME_INVOICES'];
    props.traits = [InvoicesTableRowTraits];

    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_ACME_INVOICES_LIST_EVENT', 'invoicesTableRow$OnList']];
  }

  broadcastEvents() {
    // Scoped to this row's own root: the edit anchor (a ROUTE dataset link) and
    // the delete button. Each carries its own invoiceId, which is what reaches
    // the channel as the payload.
    return [
      ['a', 'click'],
      ['button', 'click'],
    ];
  }

  onRendered() {}
}
