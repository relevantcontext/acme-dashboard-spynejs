import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { buildDashboardCards } from 'utils/acme-utils.js';
import DashboardStatsTmpl from './templates/dashboard-stats-container.tmpl.html';

// Card type -> icon, from the iconMap in app/ui/dashboard/cards.tsx. Built once
// at module load and handed to the shaper, the same way InvoicesTableRowsTraits
// hands ROW_ICONS to buildInvoiceRows — which is what keeps acme-utils.js free
// of imports.
const CARD_ICONS = {
  collected: withClass('banknotes', 'h-5 w-5 text-gray-700'),
  customers: withClass('userGroup', 'h-5 w-5 text-gray-700'),
  pending: withClass('clock', 'h-5 w-5 text-gray-700'),
  invoices: withClass('inbox', 'h-5 w-5 text-gray-700'),
};

/**
 * Owns the dashboard's summary-stat row.
 *
 * Converted from the CardWrapper export in app/ui/dashboard/cards.tsx, plus the
 * grid wrapper that lives in dashboard/(overview)/page.tsx:
 *
 *   <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
 *
 * That grid is this view's root, which is why the cards need no wrapper of
 * their own — without a grid parent their col-span classes would do nothing.
 *
 * ── Why the cards are markup and not modules ────────────────────────────────
 *
 * DashboardStatCardView declared no connection: no broadcastEvents, no
 * listener, no channel, no trait. A constructor that picked an icon and
 * stringified a number, wrapped around a heading and a value. That is markup,
 * and it belongs to the nearest template.
 * [mint-module-by-declared-connection]
 *
 * Safe to fold because this view's lifetime IS the content's: it is built by
 * PageAcmeView with the dump already in props, and disposed and rebuilt with
 * the page. Nothing arrives after birth, so there is no later markup for a
 * once-rendered template to miss.
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
 * @param {Object} props
 * @param {Object} props.data
 * @param {Array<{title: String, type: String}>} props.data.cards
 * @param {Object} [props.data.acmeData]
 */
export class DashboardStatsContainer extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-4';
    props.template = DashboardStatsTmpl;
    props.data = {
      ...props.data,
      cards: buildDashboardCards(
        props.data?.cards,
        props.data?.acmeData,
        CARD_ICONS,
      ),
    };

    super(props);
  }

  addActionListeners() {
    // No channel. This item is parent-governed: it is built by PageAcmeView with
    // its data already in props, and it renders and disposes with the page.
    // Nothing arrives after birth, so there is nothing to listen for.
    return [];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
