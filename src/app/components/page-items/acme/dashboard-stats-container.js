import { ViewStream } from 'spyne';
import DashboardStatsContainerTmpl from './templates/dashboard-stats-container.tmpl.html';

/**
 * Owns the dashboard's summary-stat row.
 *
 * Converted from the CardWrapper export in app/ui/dashboard/cards.tsx, plus the
 * grid wrapper that lives in dashboard/(overview)/page.tsx:
 *
 *   <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
 *
 * That grid is this view's root, which is why the four cards need no wrapper of
 * their own — without a grid parent their `col-span` classes would do nothing
 * and they would stack.
 *
 * Responsibility, once data is wired: subscribe to the cards ChannelPayload and
 * append one DashboardStatCardView per figure — Collected, Pending, Total
 * Invoices, Total Customers — reading title/value/type from the payload. The
 * container loads the data and populates its children; the cards stay dumb.
 *
 * Not wired yet. Until then it renders a placeholder so its presence on the page
 * is visible, and the wiring will live in dashboard traits rather than here —
 * this class stays structure and event flow only.
 */
export class DashboardStatsContainer extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-4';
    props.template = DashboardStatsContainerTmpl;
    props.data = {
      placeholderText:
        props.placeholderText ||
        'DashboardStatsContainer — 4 stat cards render here once the cards payload is wired.',
    };

    super(props);
  }

  addActionListeners() {
    // CHANNEL_ACME_API_CARDS_EVENT lands here in the wiring step.
    return [];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
