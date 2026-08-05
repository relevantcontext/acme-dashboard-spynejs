import { SpyneTrait } from 'spyne';

/**
 * Logic for InvoicesCellEditorView — read the control, decide commit or
 * cancel, transmit, self-dispose. The editor never writes into the cell: the
 * repaint returns through the channels.
 */
export class InvoicesCellEditorTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'invoicesCellEditor$';
    super(context, traitPrefix);
  }

  /** Focus and pre-select so typing replaces — called from onRendered. */
  static invoicesCellEditor$Init(props = this.props) {
    const el = props.el$('input, select').el;

    if (el == null) return;

    if (el.tagName === 'SELECT') {
      // The select's current value is set here rather than via a `selected`
      // attribute — the template stays logic-less and the data stays one
      // value rather than two flags.
      el.value = props.data?.value;
    }

    el.focus();
    if (typeof el.select === 'function') el.select();
  }

  /**
   * A row sync just ran. If this editor's control lost focus WITHOUT focus
   * going anywhere (a DOM move orphans it onto <body>, firing nothing), take
   * it back — but never steal from a control the user actually moved to.
   */
  static invoicesCellEditor$Refocus(e, props = this.props) {
    if (props.editorClosed === true) return;

    const el = props.el$('input, select').el;
    const active = document.activeElement;

    if (el == null || active === el) return;

    if (active == null || active === document.body) el.focus();
  }

  /** Another cell opened its editor — this one cancels itself. */
  static invoicesCellEditor$OnOtherEditStart(e, props = this.props) {
    const { invoiceId, field } = e?.payload ?? {};
    const isSelf =
      String(invoiceId) === String(props.data?.invoiceId) &&
      field === props.data?.field;

    if (isSelf === false) this.invoicesCellEditor$End();
  }

  static invoicesCellEditor$OnKeydown(e) {
    const key = e?.event?.key;

    if (key === 'Enter') {
      this.invoicesCellEditor$Commit();
      return;
    }

    if (key === 'Escape') {
      this.invoicesCellEditor$End();
    }
  }

  static invoicesCellEditor$OnChange() {
    this.invoicesCellEditor$Commit();
  }

  /** Focus left an UNCHANGED control (a changed one fired change first). */
  static invoicesCellEditor$OnBlur() {
    this.invoicesCellEditor$End();
  }

  /**
   * Read the control, transmit the gesture, close. Obviously-invalid input
   * (empty, non-positive amount) commits nothing — the channel's normalizer
   * is the real gate; this just avoids transmitting noise — and the editor
   * still closes, leaving the cell as it was.
   */
  static invoicesCellEditor$Commit(props = this.props) {
    if (props.editorClosed === true) return;

    const el = props.el$('input, select').el;
    const value = el?.value;
    const { invoiceId, field } = props.data ?? {};

    const isCommittable =
      value != null &&
      String(value).trim() !== '' &&
      (field !== 'amount' || Number(value) > 0);

    if (isCommittable === true) {
      this.sendInfoToChannel(
        'CHANNEL_ACME_DATA',
        { edits: [{ invoiceId, field, value }] },
        'CHANNEL_ACME_DATA_EDIT_COMMIT_EVENT',
      );
    }

    this.invoicesCellEditor$End();
  }

  /**
   * Announce the close, then remove this view — its own disposal, the same
   * self-termination contract as a toast. The guard makes the three ways in
   * (Enter's keydown, the change it may cause, the blur after) idempotent.
   */
  static invoicesCellEditor$End(props = this.props) {
    if (props.editorClosed === true) return;

    props.editorClosed = true;
    this.sendInfoToChannel(
      'CHANNEL_ACME_EDIT_SESSION',
      { invoiceId: props.data?.invoiceId },
      'CHANNEL_ACME_EDIT_SESSION_EDIT_END_EVENT',
    );
    this.disposeViewStream();
  }
}
