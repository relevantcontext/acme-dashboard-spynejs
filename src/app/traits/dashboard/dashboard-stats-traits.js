import { SpyneTrait } from 'spyne';
import { DashboardStatCardView } from 'components/elements/dashboard-stat-card-view.js';

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
 * Logic for DashboardStatsContainer.
 *
 * Two sources meet here, and the split is the point:
 *
 *   props.data.cards            which cards exist, their titles and types.
 *                               Static, from app.model.json.
 *   props.data.acmeData.cards   the values. From the /api/bootstrap dump,
 *                               handed down by PageAcmeView at construction.
 */
export class DashboardStatsTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'dashboardStats$';
    super(context, traitPrefix);
  }

  /**
   * Each definition is merged with its value and handed to a card as that card's
   * own props.data, unchanged.
   *
   * The cards are appended and forgotten. When the data changes, this view is
   * disposed and a new one built — a parent never holds its children.
   */
  static dashboardStats$RenderCards(props = this.props) {
    const values = props.data.acmeData?.cards;

    props.data.cards.forEach((card) => {
      // No selector: appendView with no query targets this view's own element,
      // which is the grid.
      this.appendView(
        new DashboardStatCardView({
          data: {
            ...card,
            value: DashboardStatsTraits.dashboardStats$GetCardValue(
              card,
              values,
            ),
          },
        }),
      );
    });
  }

  /**
   * Undefined until the dump lands, which the card renders as an empty value
   * rather than as a zero — a blank card is honestly "not known yet", where a 0
   * would assert something false.
   */
  static dashboardStats$GetCardValue(card, values) {
    if (!values) return undefined;
    return values[VALUE_BY_TYPE[card.type]];
  }
}
