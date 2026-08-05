import { ViewStream, ChannelPayloadFilter } from 'spyne';
import InvoicesTableTmpl from './templates/invoices-table-view.tmpl.html';
import { InvoicesTableRowsTraits } from 'traits/invoices/invoices-table-rows-traits.js';
import { InvoicesTableEditTraits } from 'traits/invoices/invoices-table-edit-traits.js';

/**
 * Converted from app/ui/invoices/table.tsx (outer markup).
 *
 * The source renders the same invoices TWICE — a card stack below `md` and a
 * table above it — and the first port copied that: a row ViewStream and a card
 * ViewStream per invoice, duplicated DOM switched by CSS. Both halves of that
 * are the smell this version removes. One InvoicesItemView per VISIBLE
 * invoice, one set of content nodes, and the desktop/mobile difference is two
 * grid layouts on the same DOM, switched by `is-card-layout` on this view's
 * container.
 *
 * ── What this view owns ─────────────────────────────────────────────────────
 *
 * The grid chrome, the set, and the layout flag. It builds an item view when
 * an id enters the visible page and keeps the DOM in payload order; each item
 * disposes ITSELF when its id leaves, through a declared filter. Set-level
 * facts live here because no item can compute them alone; existence is the
 * item's own one fact. [cap-viewstream-instance-count]
 * [dispose-by-predicate-filter]
 *
 * No skip-first on CHANNEL_ACME_INVOICES: the channel replays, and the
 * replayed VISIBLE_IDS payload is exactly what this view needs to build the
 * right page on mount. [choose-replay-semantics]
 */
export class InvoicesTableView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'mt-6 flow-root';
    props.template = InvoicesTableTmpl;
    props.channels = [
      'CHANNEL_ACME_INVOICES',
      'CHANNEL_ACME_DATA',
      // The bulk-edit session: cell clicks arrive through CHANNEL_UI, the
      // cursor keys through CHANNEL_WINDOW, and the editor's close through
      // the session channel — the cursor and selection are SET-level facts,
      // so the table is the view that resolves them.
      'CHANNEL_UI',
      'CHANNEL_WINDOW',
      'CHANNEL_ACME_EDIT_SESSION',
    ];
    props.traits = [InvoicesTableRowsTraits, InvoicesTableEditTraits];

    // Bulk-edit session state — ephemeral display facts of this region,
    // gone with the view on navigation. Durable edit state (drafts, undo
    // history) lives on CHANNEL_ACME_DATA, never here.
    props.editCursor = null;
    props.editAnchorId = null;
    props.editSelectionIds = [];
    props.editingCell = null;

    super(props);
  }

  addActionListeners() {
    return [
      [
        'CHANNEL_ACME_INVOICES_VISIBLE_IDS_EVENT',
        'invoicesTableRows$OnVisibleIds',
      ],
      // Live breakpoint crossings while mounted. The flag also rides every
      // VISIBLE_IDS payload, which is how a table born after the last crossing
      // starts in the right layout.
      [
        'CHANNEL_ACME_INVOICES_DISPLAY_EVENT',
        'invoicesTableRows$OnDisplayMode',
      ],
      // Every landed dump — first load, mutation refresh, optimistic apply,
      // rollback. The trait rebuilds the row-data map from it, so a row minted
      // AFTER a mutation (paging back to a toggled invoice, a created invoice
      // entering the page) renders current values rather than this view's
      // birth data. The isLoaded filter admits only payloads that carry a
      // dump — and thereby excludes REQUEST_EVENT, whose payload is fetch
      // config with no status at all. [admit-by-payload-filter]
      [
        'CHANNEL_ACME_DATA_.*_EVENT',
        'invoicesTableRows$OnAcmeData',
        new ChannelPayloadFilter({
          payload: (payload) => payload?.status?.isLoaded === true,
        }),
      ],
      // Cell clicks (declared per row) and the save bar's bulk-status
      // buttons. ONE listener for this action name — a duplicate would
      // clobber it — narrowed to the two eventTypes and dispatched inside.
      // [admit-by-payload-filter]
      [
        'CHANNEL_UI_CLICK_EVENT',
        'invoicesTableEdit$OnUiClick',
        new ChannelPayloadFilter({
          eventType: (t) => t === 'invoiceCell' || t === 'invoiceBulk',
        }),
      ],
      // The cursor keys, Enter and Escape — global keyboard as channel
      // payloads. The handler yields to any focused form control.
      // [window-event-via-channel]
      ['CHANNEL_WINDOW_KEYDOWN_EVENT', 'invoicesTableEdit$OnKeydown'],
      // The in-place editor announcing it closed, releasing the one-editor
      // latch the table holds as EDIT_START's only sender.
      [
        'CHANNEL_ACME_EDIT_SESSION_EDIT_END_EVENT',
        'invoicesTableEdit$OnEditEnd',
      ],
    ];
  }

  broadcastEvents() {
    // The sortable column headers, part of this view's own template. Each
    // button's dataset (eventType/btnType/sortKey) IS the payload; the
    // invoices channel narrows on it and answers with a params update.
    // [declare-broadcast-events] [dataset-as-payload]
    return [['.invoice-grid-header button', 'click']];
  }

  onRendered() {
    // The replayed payload usually lands before this does — SyncItems is
    // called from both sides and whichever runs second builds the page.
    this.invoicesTableRows$SyncItems();
  }
}
