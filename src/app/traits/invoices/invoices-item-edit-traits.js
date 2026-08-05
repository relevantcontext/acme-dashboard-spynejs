import { SpyneTrait } from 'spyne';
import { InvoicesCellEditorView } from 'components/elements/invoices-cell-editor-view.js';

/**
 * The bulk-edit surface of ONE invoice row: painting its cell cursor and
 * selection state, repainting its cells when its unsaved-edit overlay moves,
 * and hosting the in-place editor when the session tells it to.
 *
 * Everything here is the row acting on facts a channel resolved elsewhere —
 * the table computes cursor/selection, CHANNEL_ACME_DATA owns the drafts,
 * CHANNEL_ACME_INVOICES conforms them into per-row CELLS payloads. The row
 * only ever paints its own region. [live-mirror-via-el$]
 *
 * ── props.cellValues ────────────────────────────────────────────────────────
 *
 * The raw editable values this row is currently SHOWING (dollars, YYYY-MM-DD,
 * status literal) — seeded from birth data, updated by every CELLS repaint.
 * It exists so an editor opens on exactly what the cell displays, without
 * parsing formatted text back apart.
 */
export class InvoicesItemEditTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'invoicesItemEdit$';
    super(context, traitPrefix);
  }

  /**
   * This row's displayed cell values changed — a commit, an undo/redo, a
   * discard, or a save settling. Paint text, pill and the edited marker from
   * the payload's already-formatted values; remember the raws for the next
   * editor.
   */
  static invoicesItemEdit$OnCells(e, props = this.props) {
    const p = e?.payload ?? {};

    const amountEl = props.el$('.ii-amount [data-slot="cell-text"]').el;
    const dateEl = props.el$('.ii-date [data-slot="cell-text"]').el;

    if (amountEl != null) amountEl.innerText = p.amountText;
    if (dateEl != null) dateEl.innerText = p.dateText;

    // Same repaint the STATUS_EVENT path uses, so a drafted pill and a
    // toggled pill are indistinguishable.
    this.invoicesItemStatus$OnStatus({
      payload: { invoiceStatus: p.invoiceStatus },
    });

    props.el$().toggleClass('is-edited', p.isEdited === true);

    props.cellValues = {
      rawAmount: p.rawAmount,
      rawDate: p.rawDate,
      status: p.invoiceStatus,
    };
  }

  /**
   * The cursor moved somewhere. Every row hears this; the named one paints
   * the named cell, everyone else clears — which is exactly what makes the
   * cursor SINGLE without any row knowing another exists.
   */
  static invoicesItemEdit$OnCursor(e, props = this.props) {
    const { invoiceId, field } = e?.payload ?? {};
    const mine = String(invoiceId) === String(props.data?.attrInvoiceId);

    props.el$('.ii-cell').els.forEach((el) => {
      el.classList.toggle(
        'cell-cursor',
        mine === true && el.dataset.field === field,
      );
    });
  }

  static invoicesItemEdit$OnSelection(e, props = this.props) {
    const invoiceIds = e?.payload?.invoiceIds ?? [];

    props
      .el$()
      .toggleClass(
        'is-selected',
        invoiceIds.includes(String(props.data?.attrInvoiceId)),
      );
  }

  /**
   * The session opened an editor on one of THIS row's cells (own-id filter).
   * The cell hides its display content by class and hosts the editor as a
   * nested ViewStream — a dynamic child carrying its own declared events,
   * disposed by itself on commit/cancel and by this row's cascade if the row
   * goes first. [dynamic-children-ingress]
   */
  static invoicesItemEdit$OnEditStart(e, props = this.props) {
    const field = e?.payload?.field;
    const values = props.cellValues || {};
    const valueByField = {
      amount: values.rawAmount,
      date: values.rawDate,
      status: values.status,
    };

    if (valueByField[field] === undefined) return;

    const cellSelector = `.ii-cell[data-field="${field}"]`;

    props.el$(cellSelector).addClass('is-editing');

    this.appendView(
      new InvoicesCellEditorView({
        data: {
          invoiceId: String(props.data?.attrInvoiceId),
          field,
          value: valueByField[field],
        },
      }),
      cellSelector,
    );
  }

  /** The editor closed (own-id filter): un-hide the cell content. */
  static invoicesItemEdit$OnEditEnd(e, props = this.props) {
    props.el$('.ii-cell').removeClass('is-editing');
  }
}
