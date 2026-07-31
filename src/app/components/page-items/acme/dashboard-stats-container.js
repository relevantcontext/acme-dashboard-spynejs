import { ViewStream } from 'spyne';
import { DashboardStatCardView } from 'components/page-items/acme/dashboard-stat-card-view.js';

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
 * Both halves arrive as props, from two sources, and the split is the point:
 *
 *   props.data.cards            which cards exist, their titles and types.
 *                               Static, from app.model.json.
 *   props.data.acmeData.cards   the values. From the /api/bootstrap dump,
 *                               handed down by PageAcmeView at construction.
 *
 * This view has no channel and no listener. It is a pure function of its props:
 * given definitions and values, it renders a row. When the data changes,
 * PageAcmeView disposes it and builds a new one — which is also why the cards it
 * appends need no tracking of their own.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {Array<{title: String, type: String}>} props.data.cards
 * @param {Object} [props.data.acmeData]
 */
export class DashboardStatsContainer extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-4';
    props.data = {
      ...props.data,
      cards: props.data?.cards || [],
    };

    super(props);
  }

  addActionListeners() {
    return [];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    this.renderCards();
  }

  /**
   * Each definition is merged with its value and handed to a card as that card's
   * own props.data, unchanged.
   */
  renderCards() {
    const cards = this.props.data.acmeData?.cards;

    this.props.data.cards.forEach((card) => {
      // No selector: appendView with no query targets this view's own element,
      // which is the grid.
      this.appendView(
        new DashboardStatCardView({
          data: { ...card, value: this.getCardValue(card, cards) },
        }),
      );
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
