import { SpyneTrait, DomElement } from 'spyne';
import { buildActivityFeedRows } from 'utils/acme-invoice-utils.js';
import FeedRowsTmpl from 'components/page-items/templates/dashboard-activity-feed-rows.tmpl.html';

/**
 * Rendering for the dashboard's live activity feed.
 *
 * The channel owns the feed (a rolling list of conformed entries riding every
 * CHANNEL_ACME_DATA payload as `liveFeed`); this trait only paints it. The
 * whole list re-renders from one partial template into the
 * [data-slot="feed-items"] slot — the list is capped small by the channel, so
 * a full repaint is cheaper machinery than a prepend-and-trim reconciliation,
 * and one template is the single source of the row markup.
 * [domelement-vs-viewstream]
 *
 * The replayed payload usually arrives BEFORE onRendered has produced an
 * element, so the shaped rows are held and whichever of the two runs second
 * paints — the invoices table's SyncItems handshake.
 */
export class DashboardActivityFeedTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'dashboardFeed$';
    super(context, traitPrefix);
  }

  static dashboardFeed$OnAcmeData(e) {
    const liveFeed = e?.payload?.liveFeed;

    if (Array.isArray(liveFeed) === false) return;

    this.props.feedRows = buildActivityFeedRows(liveFeed);
    this.dashboardFeed$SyncRows();
  }

  static dashboardFeed$OnRendered() {
    this.dashboardFeed$SyncRows();
  }

  static dashboardFeed$SyncRows(props = this.props) {
    const rows = props.feedRows;

    if (props.el == null || Array.isArray(rows) === false) return;

    // Nothing has happened yet: leave the template's own empty hint standing
    // rather than replacing it with an empty render.
    if (rows.length === 0) return;

    const slot = props.el$('[data-slot="feed-items"]').el;

    if (slot == null) return;

    slot.replaceChildren(
      new DomElement({
        tagName: 'div',
        template: FeedRowsTmpl,
        data: { rows },
      }).render(),
    );
  }
}
