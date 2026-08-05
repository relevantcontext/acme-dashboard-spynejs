import { Channel } from 'spyne';
import { AcmeEditSessionChannelTraits } from 'traits/db/db-edit-session-channel-traits.js';

/**
 * The bulk-edit table's ephemeral coordination surface: where the cell cursor
 * is, which rows are range-selected, and when a cell's in-place editor opens
 * and closes. The table view owns the cursor/selection facts (they are
 * display state of one region, gone with it); this channel is how the row
 * views — which the table never references — hear about them.
 * [record:cross-view-selection-sync]
 *
 * ── Deliberately NO replay ──────────────────────────────────────────────────
 *
 * These are ephemeral events, not current values. [choose-replay-semantics]
 * The durable channels here each cache one payload and keep their replay
 * coherent by ending every turn on a complete-state emission; a cursor move
 * ends its own turn, so parking it in a replay cache would hand some future
 * subscriber a stale cursor as its birth payload. Instead, rows born later
 * are painted by the table re-broadcasting cursor and selection after each
 * page sync — the same pattern as the pagination handshake, on live events.
 *
 * All behaviour lives in AcmeEditSessionChannelTraits — this class is
 * structure and event flow only.
 */
export class ChannelAcmeEditSession extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_ACME_EDIT_SESSION';
    props.replay = false;
    props.traits = [AcmeEditSessionChannelTraits];
    super(name, props);
  }

  addRegisteredActions() {
    return [
      // The cell cursor moved: { invoiceId, field } — or { invoiceId: null }
      // when it cleared. Every row reacts: the named one paints its cell, the
      // rest clear theirs.
      'CHANNEL_ACME_EDIT_SESSION_CURSOR_EVENT',

      // The row range selection changed: { invoiceIds: [...] } in visible
      // order (empty array = cleared).
      'CHANNEL_ACME_EDIT_SESSION_SELECTION_EVENT',

      // Open an in-place editor: { invoiceId, field }. Sent only by the table
      // (clicks and Enter both route through it, so one sender owns "at most
      // one editor"); consumed by the row through its own-id filter.
      'CHANNEL_ACME_EDIT_SESSION_EDIT_START_EVENT',

      // The editor closed (commit or cancel): { invoiceId }. Sent by the
      // editor itself as it disposes; the row un-hides its cell content and
      // the table drops its editing latch.
      'CHANNEL_ACME_EDIT_SESSION_EDIT_END_EVENT',
    ];
  }

  onViewStreamInfo(e) {
    this.acmeEditSession$OnViewStreamInfo(e);
  }
}
