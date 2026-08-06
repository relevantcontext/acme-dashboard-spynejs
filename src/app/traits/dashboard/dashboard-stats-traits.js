import { SpyneTrait } from 'spyne';
import { getDashboardCardValue } from 'utils/acme-utils.js';

/**
 * Freshness for the dashboard's summary-stat row.
 *
 * The cards render from birth data — the page hands the dump down at
 * construction — and that stays the primary path. What this trait adds is the
 * post-birth case: a dump that lands AFTER the cards rendered (the
 * authoritative refetch behind a mutation, or a rollback after a failed
 * toggle) repaints the four values in place. The chrome, titles and icons
 * never change, so the repaint addresses only the  elements
 * the template declared for exactly this purpose — an el$ mutation driven by
 * the channel event, no re-render, no state held here. [live-mirror-via-el$]
 */
export class DashboardStatsTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'dashboardStats$';
    super(context, traitPrefix);
  }

  static dashboardStats$OnAcmeData(e) {
    const values = e?.payload?.data?.cards;

    // The subscription replays the birth payload before onRendered has
    // produced an element; the constructor-rendered values already show it.
    if (values == null || this.props.el == null) return;

    // The [data-card-value] elements the template declares for exactly this
    // repaint. The empty-string selector this previously used resolves to the
    // view ROOT (cxt + ' ' + '' trims back to the root selector), so the
    // "repaint" replaced the entire grid's innerText with the value for an
    // undefined card type — i.e. wiped all four cards on the first
    // post-mutation dump (and on mount, whenever the replayed payload was an
    // UPDATED rather than the first LOADED).
    this.props.el$('[data-card-value]').els.forEach((el) => {
      el.innerText = getDashboardCardValue(values, el.dataset.cardValue);
    });
  }
}
