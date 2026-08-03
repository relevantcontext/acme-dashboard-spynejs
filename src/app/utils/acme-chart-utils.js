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
