import { ViewStream } from 'spyne';
import { DashboardStatsTraits } from 'traits/page-items/dashboard-stats-traits.js';
import { contentSwapFilter } from 'traits/utils/acme-data-filters.js';

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
    props.traits = [DashboardStatsTraits];
    props.channels = [['CHANNEL_ACME_DATA', true]];
    props.data = {
      ...props.data,
      cards: props.data?.cards || [],
    };

    super(props);
  }

  addActionListeners() {
    // This item carries its own exit. On the next content swap it disposes
    // itself and PageAcmeView adds a replacement — the parent only ever adds,
    // and never holds a reference to what it added.
    // [active-child-on-custom-channel] [single-active-child]
    //
    // props.channels declares [CHANNEL, true] — skip-first — so the payload
    // that built this item does not immediately destroy it.
    // [skip-replayed-birth-event]
    return [
      ['CHANNEL_ACME_DATA_.*_EVENT', 'disposeViewStream', contentSwapFilter()],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    this.dashboardStats$RenderCards();
  }
}
