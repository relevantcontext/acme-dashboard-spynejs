import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
import {
  readInvoiceField,
  applyInvoiceFieldPatches,
} from 'utils/acme-invoice-utils.js';

/**
 * The bulk-edit state machine for ChannelAcmeData: unsaved drafts, undo/redo
 * history, and the batch-save round trip. [record:undo-redo]
 * [state-machine-in-channel]
 *
 * ── Why this lives on the DATA channel ──────────────────────────────────────
 *
 * A draft's whole meaning is "differs from the held dump", its save is a
 * mutation on this channel's request path, and its lifecycle is entangled with
 * the reconciliation state this channel already owns (pending mutations, the
 * stale-bootstrap guard, the live-tick merge). A second channel would have to
 * mirror the dump to answer "is this value an edit at all?" — a second copy
 * that can be stale. So the drafts ride here, and `edits` rides every
 * published payload the way `liveFeed` does: complete state on every action,
 * or a late subscriber renders the wrong bar. [choose-replay-semantics]
 *
 * ── How drafts coexist with the live merge (B5) and reconcile (B2) ──────────
 *
 * Drafts are an OVERLAY, never written into the held dump. A live tick keeps
 * patching the dump underneath; the overlay re-composes on top of whatever
 * landed, so an external event can never clobber an unsaved edit — there is
 * nothing shared for it to clobber. Toggle intents keep owning their own
 * invoices' reconciliation exactly as before. The one write into the dump this
 * trait ever performs is on save CONFIRMATION, when the drafts stop being
 * provisional — the same moment ApplyInvoiceStatus writes for the toggle.
 *
 * ── History model ───────────────────────────────────────────────────────────
 *
 * One entry per user gesture — a cell commit is one change, a bulk status set
 * is N changes in ONE entry — and each change records the draft-layer inverse
 * at apply time, so undo is a structural application, not a re-derivation.
 * [provisional-state-with-inverse] `undefined` as a prev/next value means "no
 * draft for this field" (the cell shows the held value); a draft whose fields
 * all clear is dropped, which is how editing a value back to the original
 * unmarks the row.
 */
export class AcmeEditsChannelTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'acmeEdits$';
    super(context, traitPrefix);
  }

  // ── Wiring ────────────────────────────────────────────────────────────────

  static acmeEdits$OnRegistered() {
    this.acmeEdits$ListenToKeyboard();
  }

  /**
   * Ctrl/Cmd-Z and Shift-Ctrl/Cmd-Z, arriving as CHANNEL_WINDOW payloads —
   * the keyboard is a global browser source, so it enters as a channel payload
   * like every other window event, and the undo state's owner subscribes.
   * [window-event-via-channel]
   *
   * The one live read: an editor or the search box being focused means the
   * browser's own text-undo owns the chord, so it is left alone — the same
   * "the browser holds the state, read it at event time" precedent as
   * window.location.
   */
  static acmeEdits$ListenToKeyboard() {
    const keydownFilter = new ChannelPayloadFilter({
      action: 'CHANNEL_WINDOW_KEYDOWN_EVENT',
    });

    this.getChannel('CHANNEL_WINDOW', keydownFilter).subscribe(
      this.acmeEdits$OnKeydown.bind(this),
    );
  }

  static acmeEdits$OnKeydown(e) {
    const ev = e?.event ?? e?.payload ?? {};

    if (String(ev.key).toLowerCase() !== 'z') return;
    if (ev.metaKey !== true && ev.ctrlKey !== true) return;

    // Where the chord was actually pressed — the event's own target, which
    // stays true even when a handler earlier in this keystroke's fan-out has
    // already moved focus.
    const target = ev.target ?? document.activeElement;
    const tag = target?.tagName;

    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      target?.isContentEditable === true
    ) {
      return;
    }

    if (ev.shiftKey === true) {
      this.acmeEdits$Redo();
      return;
    }

    this.acmeEdits$Undo();
  }

  // ── State reads ───────────────────────────────────────────────────────────

  static acmeEdits$GetDrafts() {
    return this.props.acmeEditDrafts || {};
  }

  /**
   * The slice riding every published payload. Complete on every emission for
   * the same replay-cache reason as the data itself: a save bar born after the
   * last edit must find the current count in whatever payload it replays.
   */
  static acmeEdits$GetPublicState() {
    const draftsById = this.acmeEdits$GetDrafts();

    return {
      draftsById,
      editedCount: Object.keys(draftsById).length,
      canUndo: (this.props.acmeEditUndo || []).length > 0,
      canRedo: (this.props.acmeEditRedo || []).length > 0,
      isSaving: this.props.acmeEditSaving != null,
    };
  }

  // ── Commit ────────────────────────────────────────────────────────────────

  /**
   * One user gesture's worth of edits — a single cell commit or a bulk range —
   * normalized, no-op-filtered, applied as ONE history entry.
   *
   * Normalization happens here, at the state boundary, so every consumer of a
   * draft can trust its units: amount arrives in dollars (the input's units)
   * and is held in CENTS, matching the dump; a value equal to the held dump's
   * removes the field's draft rather than recording a draft that changes
   * nothing.
   */
  static acmeEdits$Commit(edits = []) {
    const drafts = this.acmeEdits$GetDrafts();
    const invoices = this.acmeData$GetData().invoices || [];
    const invoiceById = new Map(
      invoices.map((invoice) => [String(invoice.id), invoice]),
    );

    const changes = [];

    edits.forEach(({ invoiceId, field, value }) => {
      const id = String(invoiceId);
      const invoice = invoiceById.get(id);

      if (invoice == null) return;

      const nextValue = this.acmeEdits$NormalizeValue(field, value);

      if (nextValue === null) return;

      const heldValue = readInvoiceField(invoice, field);
      const prev = drafts[id]?.[field];
      const next = nextValue === heldValue ? undefined : nextValue;

      if (prev === next) return;

      changes.push({ invoiceId: id, field, prev, next });
    });

    if (changes.length === 0) return;

    this.acmeEdits$ApplyChanges(changes, 'redo');
    this.props.acmeEditUndo = [...(this.props.acmeEditUndo || []), { changes }];
    this.props.acmeEditRedo = [];

    this.acmeData$Publish('CHANNEL_ACME_DATA_EDITS_EVENT');
  }

  /** Dollars/date/status from an editor -> draft units, or null if invalid. */
  static acmeEdits$NormalizeValue(field, value) {
    if (field === 'amount') {
      const dollars = Number(value);

      if (Number.isFinite(dollars) === false || dollars <= 0) return null;

      return Math.round(dollars * 100);
    }

    if (field === 'date') {
      return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value) : null;
    }

    if (field === 'status') {
      return value === 'paid' || value === 'pending' ? value : null;
    }

    return null;
  }

  /**
   * Writes one entry's changes into the draft overlay, immutably — the drafts
   * object rides published payloads, which are frozen. `direction` picks which
   * side of each change to apply: 'redo' plays it forward, 'undo' plays the
   * recorded inverse.
   */
  static acmeEdits$ApplyChanges(changes, direction) {
    const drafts = { ...this.acmeEdits$GetDrafts() };

    changes.forEach(({ invoiceId, field, prev, next }) => {
      const value = direction === 'undo' ? prev : next;
      const draft = { ...(drafts[invoiceId] || {}) };

      if (value === undefined) {
        delete draft[field];
      } else {
        draft[field] = value;
      }

      if (Object.keys(draft).length === 0) {
        delete drafts[invoiceId];
      } else {
        drafts[invoiceId] = draft;
      }
    });

    this.props.acmeEditDrafts = drafts;
  }

  // ── Undo / redo / discard ─────────────────────────────────────────────────

  static acmeEdits$Undo() {
    const undoStack = this.props.acmeEditUndo || [];

    if (undoStack.length === 0) return;

    const entry = undoStack[undoStack.length - 1];

    this.props.acmeEditUndo = undoStack.slice(0, -1);
    this.props.acmeEditRedo = [...(this.props.acmeEditRedo || []), entry];

    this.acmeEdits$ApplyChanges(entry.changes, 'undo');
    this.acmeData$Publish('CHANNEL_ACME_DATA_EDITS_EVENT');
  }

  static acmeEdits$Redo() {
    const redoStack = this.props.acmeEditRedo || [];

    if (redoStack.length === 0) return;

    const entry = redoStack[redoStack.length - 1];

    this.props.acmeEditRedo = redoStack.slice(0, -1);
    this.props.acmeEditUndo = [...(this.props.acmeEditUndo || []), entry];

    this.acmeEdits$ApplyChanges(entry.changes, 'redo');
    this.acmeData$Publish('CHANNEL_ACME_DATA_EDITS_EVENT');
  }

  static acmeEdits$Discard() {
    if (Object.keys(this.acmeEdits$GetDrafts()).length === 0) return;

    this.acmeEdits$Reset();
    this.acmeData$Publish('CHANNEL_ACME_DATA_EDITS_EVENT');
  }

  /** Shared by Discard and ClearData (sign-out). No emission here. */
  static acmeEdits$Reset() {
    this.props.acmeEditDrafts = {};
    this.props.acmeEditUndo = [];
    this.props.acmeEditRedo = [];
    this.props.acmeEditSaving = null;
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  /**
   * Save All. One batch request through the channel's ordinary mutation path —
   * acmeData$Request counts it pending, so a bootstrap landing mid-save is
   * discarded as stale exactly like any other mutation's. The request names
   * ONLY the drafted fields of the drafted invoices; everything else is the
   * server's to keep, which is what makes a save unable to lose concurrent
   * external changes to other invoices (or other fields).
   *
   * The snapshot records what was sent, so edits made WHILE the request is in
   * flight survive confirmation as fresh drafts instead of being cleared as if
   * they had been saved. [action-reconciliation-identity]
   */
  static acmeEdits$SaveAll() {
    const draftsById = this.acmeEdits$GetDrafts();
    const ids = Object.keys(draftsById);

    if (ids.length === 0 || this.props.acmeEditSaving != null) return;

    const updates = ids.map((id) => {
      const draft = draftsById[id];

      return {
        id,
        // The endpoint takes dollars, like create/update — see routes.js.
        ...(draft.amount !== undefined ? { amount: draft.amount / 100 } : {}),
        ...(draft.date !== undefined ? { date: draft.date } : {}),
        ...(draft.status !== undefined ? { status: draft.status } : {}),
      };
    });

    this.props.acmeEditSaving = { snapshot: draftsById };

    this.acmeData$Request('batch-update-invoices', { updates });
    this.acmeData$Publish('CHANNEL_ACME_DATA_EDITS_EVENT');
  }

  /**
   * The batch returned OK. The saved drafts stop being provisional in one
   * move: the snapshot is folded into the held dump (with every derived slice
   * recomputed), then removed from the overlay — any field re-edited during
   * the flight keeps its newer draft. The dump write is what keeps every
   * mounted surface showing the saved values through the window until the
   * authoritative bootstrap (requested by the caller right after) confirms
   * them. History resets: the baseline the inverses were recorded against has
   * been committed away.
   */
  static acmeEdits$OnSaveConfirmed() {
    const snapshot = this.props.acmeEditSaving?.snapshot || {};

    const { data, changed } = applyInvoiceFieldPatches(
      this.acmeData$GetData(),
      snapshot,
    );

    if (changed === true) this.props.acmeData = data;

    const drafts = { ...this.acmeEdits$GetDrafts() };

    Object.keys(snapshot).forEach((id) => {
      const draft = { ...(drafts[id] || {}) };

      Object.keys(snapshot[id]).forEach((field) => {
        if (draft[field] === snapshot[id][field]) delete draft[field];
      });

      if (Object.keys(draft).length === 0) {
        delete drafts[id];
      } else {
        drafts[id] = draft;
      }
    });

    this.props.acmeEditDrafts = drafts;
    this.props.acmeEditUndo = [];
    this.props.acmeEditRedo = [];
    this.props.acmeEditSaving = null;
  }

  /**
   * The batch failed. Every draft and the whole history stand — nothing was
   * persisted, so nothing may be cleared; the save bar returns to its unsaved
   * state and the generic ERROR publish (in the caller) reports the failure.
   * [typed-reconciliation-outcome]
   */
  static acmeEdits$OnSaveFailed() {
    this.props.acmeEditSaving = null;
  }
}
