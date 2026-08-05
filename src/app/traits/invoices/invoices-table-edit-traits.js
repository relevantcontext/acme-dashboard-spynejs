import { SpyneTrait } from 'spyne';

// The editable columns, in cursor order. Left/Right walk this list; the other
// two columns (customer, email) are identity, not data, and take no cursor.
const CURSOR_FIELDS = ['amount', 'date', 'status'];

const clampIndex = (index, length) => Math.max(0, Math.min(length - 1, index));

/**
 * The bulk-edit session state of the invoices table: WHERE the cell cursor
 * is, WHICH rows are range-selected, and WHETHER an editor is open. These are
 * ephemeral display facts of this one region — they die with the table on
 * navigation, so they live on the view's props rather than in a channel;
 * durable edit state (drafts, history) is CHANNEL_ACME_DATA's.
 * [spyneappproperties-vs-channel-state]
 *
 * The table never touches a row's DOM. Every fact it resolves is broadcast on
 * CHANNEL_ACME_EDIT_SESSION and each row paints itself — the same birth-here /
 * act-there split as the visible-ids handshake. [record:cross-view-selection-sync]
 *
 * ── Ingress ─────────────────────────────────────────────────────────────────
 *
 * Cell clicks are declared on each ROW (dynamic children carry their own
 * broadcastEvents) and arrive here through CHANNEL_UI, narrowed by the
 * eventType their datasets carry — the table listens because the cursor and
 * the selection are SET-level facts no row can compute alone.
 * [dynamic-children-ingress] [dataset-as-payload]
 * Arrow/Enter/Escape arrive as CHANNEL_WINDOW keydown payloads — global
 * browser events are channel payloads, and this view narrows them like any
 * other behavior. [window-event-via-channel]
 */
export class InvoicesTableEditTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'invoicesTableEdit$');
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  static invoicesTableEdit$VisibleIds(props = this.props) {
    return (props.listPayload?.visibleIds || []).map(String);
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  static invoicesTableEdit$OnKeydown(e, props = this.props) {
    const ev = e?.event ?? e?.payload ?? {};
    const key = ev.key;

    // An open editor owns the keyboard — its own declared keydown commits or
    // cancels. And any form control (the search box, an editor input) owns
    // its own keys. The guard reads the EVENT's target, not activeElement:
    // this same physical keystroke may already have committed and disposed
    // the editor through CHANNEL_UI before the window channel delivers it
    // here, and by then activeElement has fallen back to <body> — the target
    // is the one record of where the key was actually pressed.
    if (props.editingCell != null) return;

    const tag = ev.target?.tagName ?? document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      const delta = key === 'ArrowDown' ? 1 : -1;
      this.invoicesTableEdit$MoveCursor(delta, 0, ev.shiftKey === true);
      return;
    }

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const delta = key === 'ArrowRight' ? 1 : -1;
      this.invoicesTableEdit$MoveCursor(0, delta, false);
      return;
    }

    if (key === 'Enter' && props.editCursor != null) {
      this.invoicesTableEdit$StartEdit(props.editCursor);
      return;
    }

    if (key === 'Escape') {
      this.invoicesTableEdit$SetSelection([], null);
    }
  }

  /**
   * One cursor transition. Vertical moves walk the VISIBLE page in payload
   * order; horizontal moves walk the editable columns. A shift-extended
   * vertical move grows the row range from the anchor (set on first extend);
   * a plain move collapses any selection — the same contract as every
   * spreadsheet the user has already learned.
   */
  static invoicesTableEdit$MoveCursor(
    rowDelta,
    fieldDelta,
    extend,
    props = this.props,
  ) {
    const ids = this.invoicesTableEdit$VisibleIds();

    if (ids.length === 0) return;

    const cursor = props.editCursor;

    if (cursor == null) {
      this.invoicesTableEdit$SetCursor({ invoiceId: ids[0], field: 'amount' });
      if (extend === false) this.invoicesTableEdit$SetSelection([], null);
      return;
    }

    const rowIndex = clampIndex(
      Math.max(0, ids.indexOf(cursor.invoiceId)) + rowDelta,
      ids.length,
    );
    const fieldIndex = clampIndex(
      CURSOR_FIELDS.indexOf(cursor.field) + fieldDelta,
      CURSOR_FIELDS.length,
    );

    const next = { invoiceId: ids[rowIndex], field: CURSOR_FIELDS[fieldIndex] };

    this.invoicesTableEdit$SetCursor(next);

    if (rowDelta === 0) return;

    if (extend === true) {
      const anchorId = props.editAnchorId ?? cursor.invoiceId;
      this.invoicesTableEdit$SetSelection(
        this.invoicesTableEdit$RangeBetween(anchorId, next.invoiceId),
        anchorId,
      );
      return;
    }

    if ((props.editSelectionIds || []).length > 0) {
      this.invoicesTableEdit$SetSelection([], null);
    }
  }

  /** The contiguous slice of visible ids between two rows, inclusive. */
  static invoicesTableEdit$RangeBetween(fromId, toId) {
    const ids = this.invoicesTableEdit$VisibleIds();
    const a = ids.indexOf(String(fromId));
    const b = ids.indexOf(String(toId));

    if (a === -1 || b === -1) return [];

    return ids.slice(Math.min(a, b), Math.max(a, b) + 1);
  }

  // ── Clicks (rows' cells and the save bar's bulk buttons) ──────────────────

  static invoicesTableEdit$OnUiClick(e) {
    const eventType = e?.payload?.eventType;

    if (eventType === 'invoiceCell') {
      this.invoicesTableEdit$OnCellClick(e);
      return;
    }

    if (eventType === 'invoiceBulk') {
      this.invoicesTableEdit$OnBulkStatus(e);
    }
  }

  static invoicesTableEdit$OnCellClick(e, props = this.props) {
    const { invoiceId, field } = e?.payload ?? {};

    if (invoiceId == null || CURSOR_FIELDS.includes(field) === false) return;

    // The status pill inside the status cell is the B2 optimistic toggle and
    // keeps that job; a click that lands ON it must not also open an editor.
    // The conformed event's target says where the click really landed.
    const target = e?.event?.target;
    if (
      field === 'status' &&
      typeof target?.closest === 'function' &&
      target.closest('button') != null
    ) {
      return;
    }

    const cell = { invoiceId: String(invoiceId), field };

    if (e?.event?.shiftKey === true) {
      const anchorId =
        props.editAnchorId ?? props.editCursor?.invoiceId ?? cell.invoiceId;

      this.invoicesTableEdit$SetCursor(cell);
      this.invoicesTableEdit$SetSelection(
        this.invoicesTableEdit$RangeBetween(anchorId, cell.invoiceId),
        anchorId,
      );
      return;
    }

    this.invoicesTableEdit$SetCursor(cell);
    this.invoicesTableEdit$SetSelection([], null);
    this.invoicesTableEdit$StartEdit(cell);
  }

  /**
   * The save bar's "mark paid / mark pending" over the selected range. The
   * bar raised the click but holds no selection — the table does, so it is
   * the one that can turn the gesture into a concrete edit list. One transmit,
   * one history entry, N changes. [record:undo-redo]
   */
  static invoicesTableEdit$OnBulkStatus(e, props = this.props) {
    const status = e?.payload?.bulkStatus;
    const ids = props.editSelectionIds || [];

    if ((status !== 'paid' && status !== 'pending') || ids.length === 0) return;

    this.sendInfoToChannel(
      'CHANNEL_ACME_DATA',
      {
        edits: ids.map((invoiceId) => ({
          invoiceId,
          field: 'status',
          value: status,
        })),
      },
      'CHANNEL_ACME_DATA_EDIT_COMMIT_EVENT',
    );
  }

  // ── Editing lifecycle ─────────────────────────────────────────────────────

  static invoicesTableEdit$StartEdit(cell, props = this.props) {
    if (
      props.editingCell?.invoiceId === cell.invoiceId &&
      props.editingCell?.field === cell.field
    ) {
      return;
    }

    props.editingCell = { ...cell };

    this.sendInfoToChannel(
      'CHANNEL_ACME_EDIT_SESSION',
      { ...cell },
      'CHANNEL_ACME_EDIT_SESSION_EDIT_START_EVENT',
    );
  }

  /** The editor announced it closed (commit or cancel) — drop the latch. */
  static invoicesTableEdit$OnEditEnd(e, props = this.props) {
    props.editingCell = null;
  }

  // ── Broadcast + page-sync reconciliation ──────────────────────────────────

  static invoicesTableEdit$SetCursor(cursor, props = this.props) {
    props.editCursor = cursor;

    this.sendInfoToChannel(
      'CHANNEL_ACME_EDIT_SESSION',
      cursor ?? { invoiceId: null, field: null },
      'CHANNEL_ACME_EDIT_SESSION_CURSOR_EVENT',
    );
  }

  static invoicesTableEdit$SetSelection(
    invoiceIds,
    anchorId,
    props = this.props,
  ) {
    props.editSelectionIds = invoiceIds;
    props.editAnchorId = anchorId;

    this.sendInfoToChannel(
      'CHANNEL_ACME_EDIT_SESSION',
      { invoiceIds },
      'CHANNEL_ACME_EDIT_SESSION_SELECTION_EVENT',
    );
  }

  /**
   * Called after every row sync (page turn, search, sort, data refresh). The
   * session channel deliberately replays nothing, so freshly minted rows have
   * never heard the cursor or selection — pruning to the new page and
   * re-broadcasting is what paints them, and what retires a cursor whose row
   * left the page.
   */
  static invoicesTableEdit$SyncToVisible(props = this.props) {
    const ids = this.invoicesTableEdit$VisibleIds();

    if (
      props.editCursor != null &&
      ids.includes(props.editCursor.invoiceId) === false
    ) {
      props.editCursor = null;
    }

    // An editing row that left the page took its editor down with it via the
    // row's disposal cascade — no EDIT_END arrives from a disposed editor,
    // so the one-editor latch is released here, at the fact that retired it.
    if (
      props.editingCell != null &&
      ids.includes(props.editingCell.invoiceId) === false
    ) {
      props.editingCell = null;
    }

    const selection = (props.editSelectionIds || []).filter((id) =>
      ids.includes(id),
    );

    // Re-broadcast the (possibly pruned) facts so new rows paint themselves.
    this.invoicesTableEdit$SetCursor(props.editCursor ?? null);
    this.invoicesTableEdit$SetSelection(
      selection,
      selection.length > 0 ? props.editAnchorId : null,
    );
  }
}
