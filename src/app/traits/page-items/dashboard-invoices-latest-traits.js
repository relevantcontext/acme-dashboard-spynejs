import { SpyneTrait } from 'spyne';
import { DashboardInvoicesLatestRowView } from 'components/page-items/acme/dashboard-invoices-latest-row-view.js';

/**
 * Logic for DashboardInvoicesLatestView.
 */
export class DashboardInvoicesLatestTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'dashboardInvoicesLatest$';
    super(context, traitPrefix);
  }

  /**
   * The API returns rows already shaped for display — `amount` arrives
   * currency-formatted from fetchLatestInvoices, matching the Next.js query — so
   * the only work here is the image path, and resolving the source's
   * `{ 'border-t': i !== 0 }` into isFirst.
   *
   * The seed data stores `/customers/<name>.png`, which the Next.js app resolves
   * against public/. This app has no public root, so the path is prefixed with
   * `imgs` — the convention that resolves against IMG_PATH, and therefore lands
   * on /static/imgs in dev and /assets/static/imgs in a production build.
   */
  static dashboardInvoicesLatest$RenderRows(props = this.props) {
    const latestInvoices = props.data.acmeData?.latestInvoices || [];

    latestInvoices.forEach((invoice, i) => {
      this.appendView(
        new DashboardInvoicesLatestRowView({
          data: {
            name: invoice.name,
            email: invoice.email,
            amount: invoice.amount,
            imageUrl: 'imgs' + invoice.image_url,
            isFirst: i === 0,
          },
        }),
        `[data-slot='invoice-rows']`,
      );
    });
  }
}
