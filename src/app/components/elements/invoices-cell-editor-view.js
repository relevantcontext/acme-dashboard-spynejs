import { ViewStream, ChannelPayloadFilter } from 'spyne';
import InvoicesCellEditorTmpl from './templates/invoices-cell-editor-view.tmpl.html';
import { InvoicesCellEditorTraits } from 'traits/invoices/invoices-cell-editor-traits.js';

/**
 * The in-place editor for ONE cell of ONE invoice row — a transient nested
 * ViewStream the row appends on EDIT_START and that removes ITSELF on commit
 * or cancel (announcing the close as EDIT_END so the row un-hides its content
 * and the table drops its one-editor latch). Rendered dynamically, so it
 * carries its own broadcastEvents — binding rides this child's lifecycle, not
 * the row's render. [dynamic-children-ingress]
 *
 * Exactly one of the template's three sections is present in the data —
 * presence IS the field choice, so the template needs no conditional syntax.
 * [conditional-via-object-section]
 *
 * Commit contract: Enter or a change commits (an edited value losing focus
 * fires change first, so click-away commits too — spreadsheet semantics);
 * Escape cancels; an UNCHANGED editor losing focus cancels via blur. A commit
 * transmits the gesture to CHANNEL_ACME_DATA and never touches the cell
 * itself — the repaint comes back through the CELLS conform like every other
 * draft change, so a committed cell and a replayed one are indistinguishable.
 *
 * @param {Object} props.data  { invoiceId, field, value } — raw units
 *                             (dollars / YYYY-MM-DD / status literal)
 */
export class InvoicesCellEditorView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'span';
    props.class = 'cell-editor';
    props.template = InvoicesCellEditorTmpl;
    props.channels = [
      'CHANNEL_UI',
      'CHANNEL_ACME_INVOICES',
      'CHANNEL_ACME_EDIT_SESSION',
    ];
    props.traits = [InvoicesCellEditorTraits];

    const { invoiceId, field, value } = props.data ?? {};

    // Shape the bound surface: one section present, the rest absent. The id
    // rides INSIDE the section object — outer-scope keys do not reach inside
    // a section (measured on this codebase; see buildInvoiceRows' icons note),
    // so a root-level attrInvoiceId would render the dataset empty and the
    // editor's own-control filter would silently match nothing.
    const section = { value, attrInvoiceId: String(invoiceId) };

    props.data = {
      invoiceId: String(invoiceId),
      field,
      value,
      ...(field === 'amount' ? { isAmount: section } : {}),
      ...(field === 'date' ? { isDate: section } : {}),
      ...(field === 'status' ? { isStatus: section } : {}),
    };

    super(props);
  }

  addActionListeners() {
    // Its own broadcasts returning through the shared UI channel, reclaimed
    // by the editor id its dataset carries. [recognize-own-emission]
    const isMyControl = new ChannelPayloadFilter({
      editorInvoiceId: String(this.props.data?.invoiceId),
      field: this.props.data?.field,
    });

    return [
      ['CHANNEL_UI_KEYDOWN_EVENT', 'invoicesCellEditor$OnKeydown', isMyControl],
      ['CHANNEL_UI_CHANGE_EVENT', 'invoicesCellEditor$OnChange', isMyControl],
      ['CHANNEL_UI_BLUR_EVENT', 'invoicesCellEditor$OnBlur', isMyControl],
      // The tail of every row-sync chain. A live tick that reorders the page
      // MOVES this editor's row, and a DOM move drops focus silently — no
      // blur, no event, the edit just dies mid-keystroke. This listener runs
      // after the table's sync (it subscribed later) and takes focus back if
      // the move orphaned it, which is what lets typing continue across
      // arriving external events.
      ['CHANNEL_ACME_INVOICES_VISIBLE_IDS_EVENT', 'invoicesCellEditor$Refocus'],
      // Another cell began editing: at most one editor lives at a time, and
      // the newcomer's announcement is what retires this one — no view ever
      // reaches into another. (No replay on the session channel, so an
      // editor never hears its own birth event.)
      [
        'CHANNEL_ACME_EDIT_SESSION_EDIT_START_EVENT',
        'invoicesCellEditor$OnOtherEditStart',
      ],
    ];
  }

  broadcastEvents() {
    return [
      ['input', 'keydown'],
      ['input', 'change'],
      ['input', 'blur'],
      ['select', 'keydown'],
      ['select', 'change'],
      ['select', 'blur'],
    ];
  }

  onRendered() {
    this.invoicesCellEditor$Init();
  }
}
