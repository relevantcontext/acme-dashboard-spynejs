import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import { DashboardInvoicesLatestRowView } from 'components/page-items/acme/dashboard-invoices-latest-row-view.js';
import DashboardInvoicesLatestTmpl from './templates/dashboard-invoices-latest-view.tmpl.html';

/**
 * Converted from app/ui/dashboard/latest-invoices.tsx (outer markup).
 *
 * The rows are DashboardInvoicesLatestRowView instances mounted into
 * [data-slot="invoice-rows"], from the latestInvoices slice of the
 * /api/bootstrap dump.
 *
 * ── Why the rows are child views and not a template section ─────────────────
 *
 * A `{{#latestInvoices}}` array section in this template does render — but only
 * what the store holds when the constructor runs, and on a cold load that is
 * nothing. The dump is requested the moment auth resolves and the page mounts
 * while it is still in flight, so a template-rendered list comes out empty and
 * stays empty.
 *
 * A DomElementTemplate renders once by design, so the rows have to be something
 * this view can throw away and rebuild. That is what child views give: on
 * DATA_LOADED they are disposed and re-appended against the data that just
 * arrived, and the same path covers DATA_UPDATED after a mutation.
 */
export class DashboardInvoicesLatestView extends ViewStream {
  constructor(props = {}) {
    const { heading = 'Latest Invoices', updatedText = 'Updated just now' } =
      props.data || {};

    props.tagName = 'div';
    props.class = 'flex w-full flex-col md:col-span-4';
    props.template = DashboardInvoicesLatestTmpl;
    props.data = {
      ...props.data,
      heading,
      updatedText,
      svgArrowPath: withClass('arrowPath', 'h-5 w-5 text-gray-500'),
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
    this.renderRows();
  }

  /**
   * The API returns rows already shaped for display — `amount` arrives
   * currency-formatted from fetchLatestInvoices, matching the Next.js query — so
   * the only work here is the image path, and resolving the source's
   * `{ 'border-t': i !== 0 }` into isFirst.
   *
   * The seed data stores `/customers/<name>.png`, which the Next.js app resolves
   * against public/. This app has no public root, so the path is prefixed with
   * `imgs/` — the convention that resolves against IMG_PATH, and therefore lands
   * on /static/imgs in dev and /assets/static/imgs in a production build.
   */
  renderRows() {
    const latestInvoices = this.props.data.acmeData?.latestInvoices || [];

    latestInvoices.forEach((invoice, i) => {
      const view = new DashboardInvoicesLatestRowView({
        data: {
          name: invoice.name,
          email: invoice.email,
          amount: invoice.amount,
          imageUrl: 'imgs' + invoice.image_url,
          isFirst: i === 0,
        },
      });

      this.appendView(view, `[data-slot='invoice-rows']`);
    });
  }
}
