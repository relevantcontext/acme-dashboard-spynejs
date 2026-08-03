import { ViewStream } from 'spyne';
import InvoicesTableTmpl from './templates/invoices-table-view.tmpl.html';
import { InvoicesTableRowsTraits } from 'traits/invoices/invoices-table-rows-traits.js';

/**
 * Converted from app/ui/invoices/table.tsx (outer markup).
 *
 * The source renders the same invoices twice — a stack of cards below `md` and
 * a real table at `md` and up. Both presentations are ViewStreams because both
 * carry edit/delete behavior and invoice lifecycle.
 *
 * ── What this view owns ─────────────────────────────────────────────────────
 *
 * The table chrome, and the set. It builds a row view per invoice — every
 * invoice, once — and then answers each resolved list by showing the rows on
 * that page and hiding the rest. Rows own their own two controls and nothing
 * else; the set-level facts (on this page? first or last VISIBLE?) live here,
 * because no row can work them out alone.
 *
 * InvoicesTableRowsTraits owns visibility for both presentations. URL writes
 * live in the app-persistent AcmeQueryParamsNullView rather than in this
 * route-owned table lifecycle. [slice-traits-by-concern]
 *
 * No skip-first on CHANNEL_ACME_INVOICES: the channel replays, and the replayed
 * LIST payload is exactly what this view needs to show the right page on mount.
 * That is the opposite of the null view's case, which must ignore its birth
 * slot. [choose-replay-semantics]
 */
export class InvoicesTableView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'mt-6 flow-root';
    props.template = InvoicesTableTmpl;
    props.channels = ['CHANNEL_ACME_INVOICES'];
    props.traits = [InvoicesTableRowsTraits];

    super(props);
  }

  addActionListeners() {
    return [
      [
        'CHANNEL_ACME_INVOICES_VISIBLE_IDS_EVENT',
        'invoicesTableRows$OnVisibleIds',
      ],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    this.invoicesTableRows$RenderRows();
  }
}
