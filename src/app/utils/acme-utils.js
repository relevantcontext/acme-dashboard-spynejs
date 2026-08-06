/**
 * Shared Acme helpers: query strings, customers, the revenue chart, and the
 * dashboard's template shaping.
 *
 * Pure register throughout — input to output, no framework, no `this`,
 * independently testable. 
 *
 * These were four files: acme-query-utils, acme-customer-utils,
 * acme-chart-utils and acme-dashboard-utils, of sixteen, nineteen, forty-four
 * and a hundred-odd lines. Four boundaries asserting one thing — "pure Acme
 * helpers" — which is one statement said four times, not four statements.
 *
 * acme-invoice-utils.js stays separate, and that separateness does assert
 * something: it is the SQL-parity surface. filterInvoices reproduces an ILIKE
 * clause across five columns, and two of its casts had to be checked against
 * the database rather than inferred. When the two apps disagree about what a
 * search matches, that file is where to look, and burying it in a general
 * grab-bag would cost the comparison its most load-bearing boundary.
 */

// ── Query strings ──────────────────────────────────────────────────────────
//
// Shared by both list pages: the invoices table and the customers table write
// the same kind of URL, so the merge lives here and each domain reads its own
// params out of it.

export const buildAcmeSearch = (search = '', params = {}) => {
  const next = new URLSearchParams(search);

  Object.entries(params).forEach(([key, value]) => {
    const str = value === null || value === undefined ? '' : String(value);

    if (str === '') {
      next.delete(key);
      return;
    }

    next.set(key, str);
  });

  return next.toString();
};

// ── Customers ──────────────────────────────────────────────────────────────

export const CUSTOMER_PARAMS_EVENT = 'acme_customers_params_changed';

export const filterCustomers = (customers = [], query = '') => {
  const normalizedQuery = String(query).trim().toLowerCase();

  if (normalizedQuery === '') return customers;

  return customers.filter(({ name, email }) =>
    [name, email].some((field) =>
      String(field).toLowerCase().includes(normalizedQuery),
    ),
  );
};

export const readCustomerParams = (search = '') => {
  const params = new URLSearchParams(search);

  return { query: params.get('query') || '' };
};

// ── Revenue chart ──────────────────────────────────────────────────────────

/**
 * Verbatim port of generateYAxis from the Next.js app's app/lib/utils.ts.
 *
 * Kept identical rather than improved: the two apps are compared on the same
 * data, so a different rounding rule here would show up as a different chart and
 * read as a bug in one of them. If this is ever changed, change both.
 *
 * Labels run top-down — ['$3K', '$2K', '$1K', '$0'] — because the y-axis column
 * is a flex-column, so the first child sits at the top.
 *
 * @param {Array<{month: String, revenue: Number}>} revenue
 * @returns {{yAxisLabels: Array<String>, topLabel: Number}}
 */
export const generateYAxis = (revenue = []) => {
  const yAxisLabels = [];

  if (revenue.length === 0) {
    return { yAxisLabels, topLabel: 0 };
  }

  const highestRecord = Math.max(...revenue.map((month) => month.revenue));
  const topLabel = Math.ceil(highestRecord / 1000) * 1000;

  for (let i = topLabel; i >= 0; i -= 1000) {
    yAxisLabels.push(`$${i / 1000}K`);
  }

  return { yAxisLabels, topLabel };
};

/**
 * The bar height the source computes inline as
 * `(chartHeight / topLabel) * month.revenue`.
 *
 * Guarded against topLabel of 0, which the source cannot hit because it early
 * returns on empty revenue before reaching the bars — here the guard is explicit
 * so a caller cannot produce NaN heights.
 *
 * @returns {Number} pixels
 */
export const getBarHeight = (revenueValue, topLabel, chartHeight) => {
  if (!topLabel) return 0;
  return (chartHeight / topLabel) * revenueValue;
};

// ── Dashboard template shaping ─────────────────────────────────────────────
// Card type -> the field it reads out of the cards payload. The shape comes
// straight from fetchCardData in queries.js, which is the verbatim port of the
// Next.js query, so both apps read the same four numbers.
const VALUE_BY_TYPE = {
  collected: 'totalPaidInvoices',
  pending: 'totalPendingInvoices',
  invoices: 'numberOfInvoices',
  customers: 'numberOfCustomers',
};

/**
 * One card's display value from the dump's cards object — the same read
 * buildDashboardCards performs, exported so a mounted stats view can repaint
 * its values from a later dump without re-shaping whole cards.
 */
export const getDashboardCardValue = (values, type) => {
  const value = values ? values[VALUE_BY_TYPE[type]] : undefined;

  return value === undefined || value === null ? '' : String(value);
};

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
 *
 * `icons` arrives from the caller rather than being resolved here, the same way
 * buildInvoiceRows takes ROW_ICONS. It keeps this whole module import-free and
 * therefore loadable by the test runner, which cannot follow the .svg imports
 * svg-icons.js makes.
 */
export const buildDashboardCards = (cards = [], acmeData, icons = {}) => {
  const values = acmeData?.cards;

  return cards.map((card) => ({
    ...card,
    value: getDashboardCardValue(values, card.type),
    // The value element carries its card type as a dataset role, so a later
    // dump can repaint values in place by addressing .
    attrCardType: card.type,
    svgIcon: icons[card.type] || '',
  }));
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
