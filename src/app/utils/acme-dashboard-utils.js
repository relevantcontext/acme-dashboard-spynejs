import { withClass } from 'utils/svg-icons.js';
import { generateYAxis, getBarHeight } from 'utils/acme-chart-utils.js';

/**
 * Template shaping for the three dashboard panels.
 *
 * ── Why these are functions and not traits ──────────────────────────────────
 *
 * They were three SpyneTraits, and each one's only job was constructing a
 * ViewStream per leaf — a stat card, a bar, a row. Those leaves are template
 * sections now, so what remains is a pure map from the bootstrap dump to
 * template-ready data: input to output, no framework, no `this`.
 *
 * A trait composed into a view but never invoked through `this` asserts nothing
 * about the view. These run at construction, before `super()`, because that is
 * when a template renders — so they could not be instance methods even if the
 * composition were wanted. [author-in-correct-register]
 * [mint-module-by-declared-connection]
 *
 * Every shaper resolves the whole panel, so the templates iterate finished
 * arrays and decide nothing. [shape-data-for-logicless-template]
 */

// Card type -> icon, from the iconMap in app/ui/dashboard/cards.tsx.
const ICON_BY_TYPE = {
  collected: 'banknotes',
  customers: 'userGroup',
  pending: 'clock',
  invoices: 'inbox',
};

// Card type -> the field it reads out of the cards payload. The shape comes
// straight from fetchCardData in queries.js, which is the verbatim port of the
// Next.js query, so both apps read the same four numbers.
const VALUE_BY_TYPE = {
  collected: 'totalPaidInvoices',
  pending: 'totalPendingInvoices',
  invoices: 'numberOfInvoices',
  customers: 'numberOfCustomers',
};

const ICON_CLASS = 'h-5 w-5 text-gray-700';

const LATEST_ROW_BASE = 'flex flex-row items-center justify-between py-4';

/**
 * The summary-stat row.
 *
 * Two sources meet here and the split is the point: `cards` says which cards
 * exist and what they are called (static, from app.model.json), `acmeData.cards`
 * says what the numbers are (from /api/bootstrap).
 *
 * A missing value renders as an empty string rather than a zero — before the
 * dump lands a blank card is honestly "not known yet", where a 0 would assert
 * something false.
 */
export const buildDashboardCards = (cards = [], acmeData) => {
  const values = acmeData?.cards;

  return cards.map((card) => {
    const value = values ? values[VALUE_BY_TYPE[card.type]] : undefined;
    const iconName = ICON_BY_TYPE[card.type];

    return {
      ...card,
      value: value === undefined || value === null ? '' : String(value),
      svgIcon: iconName ? withClass(iconName, ICON_CLASS) : '',
    };
  });
};

/**
 * The revenue chart: the y-axis labels and every bar, from one call.
 *
 * `topLabel` is the top of the scale every bar is measured against, so the axis
 * and the bars have to come from a single generateYAxis — computing them
 * separately would let the tallest bar disagree with the top label.
 *
 * The source's `if (!revenue.length) return <p>No data available.</p>` is not an
 * early return here: the frame renders from the template either way, and simply
 * gets no bars.
 */
export const buildRevenueChart = (acmeData, chartHeight) => {
  const revenue = acmeData?.revenue || [];

  if (revenue.length === 0) return { yAxisLabels: [], bars: [] };

  const { yAxisLabels, topLabel } = generateYAxis(revenue);

  return {
    yAxisLabels,
    bars: revenue.map((month) => ({
      month: month.month,
      // The source computes this inline as (chartHeight / topLabel) * revenue.
      // Templates have no arithmetic, so a bar receives finished pixels.
      attrBarHeight: String(getBarHeight(month.revenue, topLabel, chartHeight)),
    })),
  };
};

/**
 * The latest-invoices list.
 *
 * `amount` arrives currency-formatted from fetchLatestInvoices, matching the
 * Next.js query, so the only work is the image path, the alt text, and
 * resolving the source's `{ 'border-t': i !== 0 }` into a finished class.
 *
 * The seed stores `/customers/<name>.png`, which Next.js resolves against
 * public/. This app has no public root, so the path is prefixed with `imgs` —
 * the convention that resolves against IMG_PATH.
 */
export const buildLatestInvoiceRows = (acmeData) =>
  (acmeData?.latestInvoices || []).map((invoice, i) => ({
    name: invoice.name,
    email: invoice.email,
    amount: invoice.amount,
    attrRowClass: i === 0 ? LATEST_ROW_BASE : `${LATEST_ROW_BASE} border-t`,
    attrImageSrc: 'imgs' + invoice.image_url,
    attrImageAlt: `${invoice.name}'s profile picture`,
  }));
