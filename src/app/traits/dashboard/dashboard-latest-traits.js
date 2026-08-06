import { SpyneTrait, DomElement } from 'spyne';
import { buildLatestInvoiceRows } from 'utils/acme-utils.js';
import LatestRowsTmpl from 'components/page-items/templates/dashboard-invoices-latest-rows.tmpl.html';

/**
 * Freshness for the dashboard's latest-invoices list.
 *
 * The rows live in their own partial template and render into the
 * [data-slot="latest-rows"] region — once at onRendered from birth data, and
 * again whenever a later dump lands (the authoritative refetch behind a
 * mutation). One template is the single source of the row markup for both
 * passes.
 *
 * The rows carry no behavior — no broadcast, no listener, no lifecycle — so
 * they are a DomElement render, not ViewStreams; content enters via native DOM
 * from this trait. 
 */
export class DashboardLatestTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'dashboardLatest$';
    super(context, traitPrefix);
  }

  static dashboardLatest$OnRendered() {
    this.dashboardLatest$RenderRows(this.props.data?.rows || []);
  }

  static dashboardLatest$OnAcmeData(e) {
    const acmeData = e?.payload?.data;

    // Pre-render replays are covered by onRendered, which paints from the
    // same held data the replayed payload carries.
    if (acmeData == null || this.props.el == null) return;

    this.dashboardLatest$RenderRows(buildLatestInvoiceRows(acmeData));
  }

  static dashboardLatest$RenderRows(rows) {
    const slot = this.props.el$('[data-slot="latest-rows"]').el;

    if (slot == null) return;

    slot.replaceChildren(
      new DomElement({
        tagName: 'div',
        template: LatestRowsTmpl,
        data: { rows },
      }).render(),
    );
  }
}
