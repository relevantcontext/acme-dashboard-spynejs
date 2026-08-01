import { ViewStream } from 'spyne';
import { InvoicesTableTraits } from 'traits/page-items/invoices-table-traits.js';

/**
 * The only writer of the invoices query string.
 *
 * ChannelAcmeInvoices emits CHANNEL_ACME_INVOICES_UPDATE_PARAMS_EVENT as an
 * instruction; this view applies it to window.location and dispatches the custom
 * window event that tells the channel the URL moved. It renders nothing — its
 * whole existence is to be the ViewStream end of that loop, in a module named
 * for the job so the answer to "where does the URL get written" is a file rather
 * than a listener buried in a rendering view. [null-appended-behavior-view]
 *
 * ── Lifecycle ───────────────────────────────────────────────────────────────
 *
 * appendToNull attaches to the app-wide #spyne-null-views host, NOT to whatever
 * created it — so this is not part of InvoicesTableView's disposal cascade even
 * though the table is what constructs it. Left alone it would outlive the page
 * and a second visit to /dashboard/invoices would leave two instances writing
 * the same URL twice and announcing it twice.
 *
 * So it disposes itself on the route event, the same way the page above it does
 * — the parent adds, the child removes itself, and no reference is held either
 * way. skip-first is required because CHANNEL_ROUTE replays: without it the
 * dispose listener fires on the route event that is current at birth.
 * [single-active-child] [skip-replayed-birth-event] [no-leaked-subscription]
 *
 * Paging does not trip this: ?page=2 and ?page=3 are the same path, so
 * routeData does not move and no route event fires.
 *
 * No skip-first on CHANNEL_ACME_INVOICES, deliberately. That channel replays,
 * but its slot holds a LIST payload whenever this view is born — the instruction
 * is always followed synchronously by the list it produces — and this view's
 * listener does not match LIST anyway. skip-replayed-birth-event states its
 * condition precisely; adding it here would be machinery for a case that cannot
 * occur.
 */
export class InvoicesTableParamsNullView extends ViewStream {
  constructor(props = {}) {
    props.channels = ['CHANNEL_ACME_INVOICES', ['CHANNEL_ROUTE', true]];
    props.traits = [InvoicesTableTraits];

    super(props);
  }

  addActionListeners() {
    return [
      ['CHANNEL_ROUTE_CHANGE_EVENT', 'disposeViewStream'],
      [
        'CHANNEL_ACME_INVOICES_UPDATE_PARAMS_EVENT',
        'invoicesTable$OnUpdateParams',
      ],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
