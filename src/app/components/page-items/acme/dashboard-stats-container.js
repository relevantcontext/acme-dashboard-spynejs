import { ViewStream } from 'spyne';
import { DashboardStatCardView } from 'components/page-items/acme/dashboard-stat-card-view.js';
import { AcmeDataStateTraits } from 'traits/app/acme-data-state-traits.js';

// Card type -> the field it reads out of the cards payload. The shape comes
// straight from fetchCardData in queries.js, which is the verbatim port of the
// Next.js query, so both apps read the same four numbers.
const VALUE_BY_TYPE = {
  collected: 'totalPaidInvoices',
  pending: 'totalPendingInvoices',
  invoices: 'numberOfInvoices',
  customers: 'numberOfCustomers',
};

/**
 * Owns the dashboard's summary-stat row.
 *
 * Converted from the CardWrapper export in app/ui/dashboard/cards.tsx, plus the
 * grid wrapper that lives in dashboard/(overview)/page.tsx:
 *
 *   <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
 *
 * That grid is this view's root, which is why the four cards need no wrapper of
 * their own — without a grid parent their col-span classes would do nothing and
 * they would stack. It also means the cards append straight into the root, so
 * this view needs no template of its own.
 *
 * ── Where the content comes from ────────────────────────────────────────────
 *
 * Two sources, and the split is the point:
 *
 *   props.data.cards   which cards exist, their titles and types. Static, from
 *                      app.model.json.
 *   the data store     the values. From the /api/bootstrap dump, read out of
 *                      SpyneAppProperties.
 *
 * The read happens in onRendered rather than through a subscription, because by
 * then the dump has usually already landed — the request goes out the moment
 * auth resolves, well before a page mounts. Reading gives the values
 * synchronously on first paint instead of rendering blank and filling in.
 *
 * DATA_LOADED covers the case where it has not landed yet, and DATA_UPDATED
 * covers a mutation changing the numbers underneath a page already on screen.
 * Both re-render, which is why the cards are disposed and re-appended rather
 * than mutated in place — a DomElementTemplate renders once by design.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {Array<{title: String, type: String}>} props.data.cards
 */
export class DashboardStatsContainer extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-4';
    props.channels = ['CHANNEL_ACME_DATA'];
    props.data = {
      ...props.data,
      cards: props.data?.cards || [],
    };

    super(props);

    // The appended card instances, so a re-render can dispose exactly what it
    // created rather than emptying the root and hoping nothing else lived there.
    this.cardViews = [];
  }

  addActionListeners() {
    // One listener per action name — a duplicate registration for the same
    // action clobbers the first.
    return [
      ['CHANNEL_ACME_DATA_LOADED_EVENT', 'onDataChanged'],
      ['CHANNEL_ACME_DATA_UPDATED_EVENT', 'onDataChanged'],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    this.renderCards();
  }

  onDataChanged() {
    this.renderCards();
  }

  /**
   * Replaces the row. Each definition is merged with its value and handed to a
   * card as that card's own props.data, unchanged.
   */
  renderCards() {
    const cards = AcmeDataStateTraits.acmeData$GetSlice('cards');

    this.cardViews.forEach((view) => view.disposeViewStream());
    this.cardViews = [];

    this.props.data.cards.forEach((card) => {
      const view = new DashboardStatCardView({
        data: { ...card, value: this.getCardValue(card, cards) },
      });

      // No selector: appendView with no query targets this view's own element,
      // which is the grid.
      this.appendView(view);
      this.cardViews.push(view);
    });
  }

  /**
   * Undefined until the dump lands, which the card renders as an empty value
   * rather than as a zero — a blank card is honestly "not known yet", where a 0
   * would assert something false.
   */
  getCardValue(card, cards) {
    if (!cards) return undefined;
    return cards[VALUE_BY_TYPE[card.type]];
  }
}
