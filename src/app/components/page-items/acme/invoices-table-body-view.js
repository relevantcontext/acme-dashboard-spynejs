import { ViewStream } from 'spyne';
import { InvoicesTableBodyTraits } from 'traits/page-items/invoices-table-body-traits.js';

/**
 * The rows of the invoices table.
 *
 * ── Adopted, not rendered ───────────────────────────────────────────────────
 *
 * The <tbody> already exists — it is part of InvoicesTableView's template,
 * carrying the classes the design needs — so this view is handed that element
 * as props.el rather than creating one. Adoption bypasses only the
 * element-rendering step; the parent-child chain, listeners and disposal are
 * identical to any other view, and disposing this one removes the tbody,
 * because adoption is ownership transfer. [adopt-existing-element]
 *
 * The pairing matters for what comes next: the body owns a region whose CONTENT
 * is replaceable independently of the table's chrome. Swapping a page of rows
 * is then disposing one view, not reaching into another view's DOM.
 *
 * ── Data arrives at construction ────────────────────────────────────────────
 *
 * props.data.acmeData comes down from the page — birth data for this instance,
 * not something this view subscribes for. It holds no channel and no listener;
 * it renders what it was given. [author-in-correct-register]
 *
 * @param {Object} props
 * @param {HTMLElement} props.el          the tbody to adopt
 * @param {Object} props.data.acmeData    the bootstrap dump, whose `invoices`
 *                                        array is what renders
 */
export class InvoicesTableBodyView extends ViewStream {
  constructor(props = {}) {
    props.traits = [InvoicesTableBodyTraits];

    super(props);
  }

  addActionListeners() {
    return [];
  }

  broadcastEvents() {
    return [];
  }

  // Adoption fires onRendered on its own — there is no element to wait for.
  onRendered() {
    this.invoicesTableBody$RenderRows();
  }
}
