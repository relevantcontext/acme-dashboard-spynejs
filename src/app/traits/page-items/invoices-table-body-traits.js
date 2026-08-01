import { SpyneTrait, DomElementTemplate } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import { buildInvoiceRows } from 'traits/utils/acme-invoice-utils.js';
import InvoicesTableBodyTmpl from 'components/page-items/acme/templates/invoices-table-body-view.tmpl.html';

/**
 * The four icons every row needs, built ONCE at module load.
 *
 * withClass() does string work, so calling it per row would repeat the same
 * four results for the length of the table. Rows reference these; they do not
 * rebuild them. (Passing them once at the ROOT of the template data does not
 * work — see buildInvoiceRows for what was measured.)
 */
const ROW_ICONS = {
  svgClock: withClass('clock', 'ml-1 w-4 text-gray-500'),
  svgCheck: withClass('check', 'ml-1 w-4 text-white'),
  svgPencil: withClass('pencil', 'w-5'),
  svgTrash: withClass('trash', 'w-5'),
};

/**
 * Logic for InvoicesTableBodyView — turning an invoices array into rows.
 *
 * ── Why this is not a ViewStream per row ────────────────────────────────────
 *
 * The obvious SpyneJS move is a child view per row, and it is the wrong one at
 * list scale: each instance costs a constructor, a template render, an
 * observable chain exchange with its parent, and a separate DOM insertion —
 * multiplied by the row count, and again by the nested status pill and two
 * buttons each row would hold.
 *
 * DomElementTemplate is the same engine a ViewStream renders through, reached
 * directly. One template, one pass over the array, one DocumentFragment, one
 * appendChild. The DOM is touched exactly once no matter how many rows there
 * are, and a fragment inserts without the parser pass an innerHTML assignment
 * would trigger. [author-template-bound-surface]
 *
 * Nothing is lost that this table needs: no row currently listens to a channel
 * its body does not already hear. When one does — the delete button is the
 * candidate — a row can be adopted individually through its element, which is
 * what makes rendering inert markup first a staging step rather than a dead
 * end. [adopt-existing-element] [mint-child-view-by-channel-need]
 */
export class InvoicesTableBodyTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'invoicesTableBody$';
    super(context, traitPrefix);
  }

  /**
   * Renders every invoice handed to this view at construction.
   *
   * The rows go into the ADOPTED tbody — the element InvoicesTableView already
   * has in its own template and passed over as props.el. Nothing is created to
   * hold them and nothing is moved.
   *
   * ── Why the template carries a throwaway <table> wrapper ────────────────
   *
   * The rows cannot be the template's top level. renderDocFrag sanitizes before
   * it does anything else, and DOMPurify parses into a body context, where the
   * HTML parser discards a `<tr>` that is not inside a table — so a bare-rows
   * template arrives already destroyed. Measured: 12 invoices produced 36 loose
   * children and zero rows, the cell CONTENTS having survived while their `<td>`
   * and `<tr>` did not.
   *
   * (renderDocFrag does test for a top-level table sub-tag and return a string
   * for that case, but the test runs AFTER sanitization, by which point the tag
   * it looks for is gone. The wrapper sidesteps the whole question rather than
   * relying on that branch.)
   *
   * A complete `<table>` survives sanitization intact, and `table` is not in
   * that test's tag list, so renderDocFrag returns an ordinary DocumentFragment.
   * The wrapper is then discarded — its rows are moved into a fragment of their
   * own and inserted in ONE appendChild, so the live DOM is still touched once
   * however many rows there are.
   */
  static invoicesTableBody$RenderRows(props = this.props) {
    const invoices = props.data?.acmeData?.invoices || [];

    const wrapper = new DomElementTemplate(InvoicesTableBodyTmpl, {
      invoices: buildInvoiceRows(invoices, ROW_ICONS),
    }).renderDocFrag();

    const renderedRows = wrapper.querySelector('[data-slot="rendered-rows"]');

    if (renderedRows === null) return;

    const docFrag = document.createDocumentFragment();
    docFrag.append(...renderedRows.childNodes);

    props.el$().el.appendChild(docFrag);
  }
}
