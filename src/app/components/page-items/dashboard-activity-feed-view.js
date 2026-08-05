import { ViewStream, ChannelPayloadFilter } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { DashboardActivityFeedTraits } from 'traits/dashboard/dashboard-activity-feed-traits.js';
import DashboardActivityFeedTmpl from './templates/dashboard-activity-feed-view.tmpl.html';

/**
 * The dashboard's live activity feed — one row per payment event the API
 * tier's simulator commits while the user is signed in, newest first.
 *
 * SpyneJS-side addition with no Next.js counterpart (yet): the comparison's
 * live-events round. Chrome and layout follow DashboardInvoicesLatestView,
 * its nearest sibling on the page.
 *
 * ── Where the feed comes from ───────────────────────────────────────────────
 *
 * The feed is DERIVED state owned by CHANNEL_ACME_DATA: the channel conforms
 * each tick's raw events into finished entries (msg composed channel-side)
 * and holds the rolling list, which rides every published payload as
 * `liveFeed`. This view only renders — no request, no timer, no state machine
 * here. A feed born after ticks have been running receives the current list
 * via the channel's replay, so navigating away and back does not blank it.
 * [record:derived-activity-log]
 *
 * Rows are markup, not modules: a feed line displays and does nothing else —
 * no click, no listener, no lifecycle of its own — so the rows render from a
 * partial template into a slot, the same shape as the latest-invoices list.
 * [domelement-vs-viewstream]
 *
 * The replayed payload usually lands before onRendered — the trait holds it
 * and whichever of the two runs second paints, the same handshake the
 * invoices table uses for its replayed VISIBLE_IDS.
 */
export class DashboardActivityFeedView extends ViewStream {
  constructor(props = {}) {
    const {
      heading = 'Live Activity',
      emptyText = 'Waiting for payment activity…',
      footerText = 'Updating live',
    } = props.data || {};

    props.tagName = 'div';
    // Full row of the panels grid: the chart and latest-invoices panels above
    // each span 4 of 8 lg columns; the feed takes the full 8 beneath them.
    props.class = 'flex w-full flex-col md:col-span-4 lg:col-span-8';
    props.template = DashboardActivityFeedTmpl;
    props.channels = ['CHANNEL_ACME_DATA'];
    props.traits = [DashboardActivityFeedTraits];
    props.data = {
      ...props.data,
      heading,
      emptyText,
      footerText,
      svgClock: withClass('clock', 'h-5 w-5 text-gray-500'),
    };

    super(props);
  }

  addActionListeners() {
    // Every live-tick merge and every mutation refresh republishes as
    // UPDATED, carrying the rolling feed. The isLoaded filter admits only
    // payloads carrying a dump — which also excludes REQUEST_EVENT, whose
    // payload is fetch config with no status at all. [admit-by-payload-filter]
    return [
      [
        'CHANNEL_ACME_DATA_UPDATED_EVENT',
        'dashboardFeed$OnAcmeData',
        new ChannelPayloadFilter({
          payload: (payload) => payload?.status?.isLoaded === true,
        }),
      ],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    this.dashboardFeed$OnRendered();
  }
}
