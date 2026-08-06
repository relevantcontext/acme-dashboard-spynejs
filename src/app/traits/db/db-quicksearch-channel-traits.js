import { SpyneTrait, ChannelPayloadFilter } from 'spyne';
import { filterInvoices } from 'utils/acme-invoice-utils.js';
import { filterCustomers } from 'utils/acme-utils.js';

/**
 * Matching for ChannelAcmeQuickSearch.
 *
 * Holds the two collections from the bootstrap dump and the overlay's current
 * query, and answers one question: which customers AND which invoices match
 * it right now. Matching runs through the same filterInvoices /
 * filterCustomers every other search in the app uses, so the overlay can never
 * disagree with the list pages about what a query matches — including the SQL
 * parity rules (amount in cents, date sliced to 10 chars, ILIKE semantics,
 * empty query matches everything).
 *
 * The channel publishes IDS in display order, not shaped rows: the overlay
 * renders its rows from the dump it already holds, exactly as the invoices
 * table does from VISIBLE_IDS. Ids keep the payload small enough to replay
 * and keep row shaping (a view concern) out of the behavior tier.
 *
 * Two inbound paths set the query:
 *
 *   CHANNEL_UI keyup      the overlay input's broadcast — the same
 *                         eventType `acmeSearch` convention as the list-page
 *                         searches, narrowed by btnType `quick-search`.
 *   QUERY_EVENT intake    sendInfoToChannel from the overlay when it opens
 *                         with a cleared input, so the replayed results can
 *                         never describe a stale query.
 *
 * A landed dump recomputes against the held query, which is what keeps an
 * OPEN overlay's list truthful after a mutation refresh.
 */
export class AcmeQuickSearchChannelTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'acmeQuickSearch$');
  }

  static acmeQuickSearch$OnRegistered() {
    this.props.query = '';
    this.props.invoices = [];
    this.props.customers = [];
    this.props.isLoaded = false;

    this.acmeQuickSearch$ListenToData();
    this.acmeQuickSearch$ListenToUi();
  }

  static acmeQuickSearch$ListenToData() {
    const loadedFilter = new ChannelPayloadFilter({
      payload: (payload) => payload?.status?.isLoaded === true,
    });

    this.getChannel('CHANNEL_ACME_DATA', loadedFilter).subscribe(
      this.acmeQuickSearch$OnData.bind(this),
    );
  }

  static acmeQuickSearch$ListenToUi() {
    const searchFilter = new ChannelPayloadFilter({
      eventType: 'acmeSearch',
      btnType: 'quick-search',
    });

    this.getChannel('CHANNEL_UI', searchFilter).subscribe(
      this.acmeQuickSearch$OnSearchEvent.bind(this),
    );
  }

  static acmeQuickSearch$OnData(e) {
    this.props.invoices = e?.payload?.data?.invoices || [];
    this.props.customers = e?.payload?.data?.customers || [];
    this.props.isLoaded = true;

    this.acmeQuickSearch$PublishResults();
  }

  /**
   * A keystroke in the overlay input. Same read as the domain channels'
   * search handlers: the value lives on the originating element.
   */
  static acmeQuickSearch$OnSearchEvent(e) {
    const query = e?.srcElement?.el?.value ?? '';

    // Arrow/Enter/Escape keyups on the input arrive here too, value
    // unchanged; republishing would only sweep the overlay for nothing.
    if (query === this.props.query) return;

    this.acmeQuickSearch$SetQuery(query);
  }

  // Intake: the overlay opened (or cleared). Always republishes, even for an
  // unchanged query — the point of the write is a fresh payload to render from.
  static acmeQuickSearch$OnQueryInfo(e) {
    this.props.query = String(e?.payload?.query ?? '');
    this.acmeQuickSearch$PublishResults();
  }

  static acmeQuickSearch$SetQuery(query) {
    this.props.query = String(query);
    this.acmeQuickSearch$PublishResults();
  }

  /**
   * Complete state on every emission, like every replay channel here: query,
   * both id lists, both totals and isLoaded ride every payload, so a consumer
   * born after the last keystroke renders the current truth from whatever it
   * replays.
   */
  static acmeQuickSearch$PublishResults() {
    const { query } = this.props;
    const customers = filterCustomers(this.props.customers, query);
    const invoices = filterInvoices(this.props.invoices, query);

    this.sendChannelPayload('CHANNEL_ACME_QUICKSEARCH_RESULTS_EVENT', {
      query,
      customerIds: customers.map(({ id }) => String(id)),
      invoiceIds: invoices.map(({ id }) => String(id)),
      totalCustomers: customers.length,
      totalInvoices: invoices.length,
      isLoaded: this.props.isLoaded === true,
    });
  }
}
