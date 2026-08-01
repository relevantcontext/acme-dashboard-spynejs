import { SpyneTrait } from 'spyne';
import {
  buildInvoiceSearch,
  INVOICE_PARAMS_EVENT,
} from 'traits/utils/acme-invoice-utils.js';

/**
 * Logic for the invoices table region — composed into both views that make it
 * up, because the region is one concern split across two lifecycles.
 *
 *   InvoicesTableView            renders whatever the current URL resolves to
 *   InvoicesTableParamsNullView  writes the URL, and announces that it did
 *
 * ── Why the write is a view's job at all ────────────────────────────────────
 *
 * ChannelAcmeInvoices holds no `query` and no `page`; window.location is the
 * state. It emits UPDATE_PARAMS as an INSTRUCTION and then learns what happened
 * by reading location.search back off a window event, exactly as a bookmark or a
 * back button would arrive.
 *
 * That only works because the write happens somewhere else. A channel that both
 * wrote and read the URL would have to tell its own edits apart from a deeplink
 * — and identity is never implicit here, so that means a correlation mechanism
 * existing solely to undo an ambiguity it created. With the write over here, a
 * keystroke, a page click, a bookmark and a Back press are indistinguishable,
 * which is correct.
 *
 * ── Why a separate null view rather than the table itself ───────────────────
 *
 * The table's job is to render a list; this is a different job with different
 * timing — it runs on the instruction, before there is any list to show. Giving
 * it its own module means "where does the URL get written" has a file-level
 * answer instead of being a second listener on a rendering view.
 * [null-appended-behavior-view] [bridge-channel-output-to-transmit]
 *
 * Both methods below are the ViewStream tier of that split; the URL string
 * itself is built by a pure function in acme-invoice-utils.js, which touches no
 * framework and is testable on its own. [author-in-correct-register]
 */
export class InvoicesTableTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'invoicesTable$';
    super(context, traitPrefix);
  }

  // ── Params (the null view) ────────────────────────────────────────────────

  /**
   * Applies an UPDATE_PARAMS instruction to the URL, then announces the write.
   *
   * The announcement is not optional bookkeeping — replaceState and pushState
   * fire no event, so without the dispatch nothing downstream ever learns the
   * URL moved and the loop stays open.
   */
  static invoicesTable$OnUpdateParams(e) {
    const { params } = e?.payload ?? {};

    if (!params) return;

    this.invoicesTable$WriteParams(params);
    this.invoicesTable$AnnounceParamsChanged();
  }

  /**
   * Merges the update into the current query string and writes it.
   *
   * ── Always replaceState ─────────────────────────────────────────────────
   *
   * Search and paging alike. A typed word must not leave one history entry per
   * keystroke, and paging is the same kind of thing: a view of the set the user
   * is already looking at, not a place they travelled to.
   *
   * This also keeps the page intact. Measured here: a popstate rebuilds
   * PageAcmeView and everything under it even when only the query string moved
   * — the route channel emits a change event on popstate whether or not
   * routeData actually differs. Pushing per page click would therefore tear
   * down and rebuild the whole invoices page on every Back press.
   *
   * Divergence from next-learn, which pages with <Link> and so pushes. Named in
   * the comparison rather than hidden.
   *
   * The path is preserved as-is and never re-derived: this must not go through
   * CHANNEL_ROUTE, which writes the path only and would strip the params it is
   * being asked to set.
   */
  static invoicesTable$WriteParams(params) {
    const { pathname, search } = window.location;
    const nextSearch = buildInvoiceSearch(search, params);
    const url = nextSearch === '' ? pathname : `${pathname}?${nextSearch}`;

    window.history.replaceState({}, '', url);
  }

  /**
   * Says "the URL moved", and nothing else. No detail rides it: the channel
   * reads location.search, so anything sent here would be a second copy of the
   * truth that could disagree with it.
   */
  static invoicesTable$AnnounceParamsChanged() {
    window.dispatchEvent(new CustomEvent(INVOICE_PARAMS_EVENT));
  }
}
