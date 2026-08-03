import { SpyneTrait } from 'spyne';
import { DashboardRevenueBarView } from 'components/elements/dashboard-revenue-bar-view.js';
import { DashboardRevenueYAxisView } from 'components/elements/dashboard-revenue-y-axis-view.js';
import { generateYAxis, getBarHeight } from 'utils/acme-chart-utils.js';

/**
 * Logic for DashboardRevenueChartView.
 *
 * The source does two calculations inline that a template cannot express:
 *
 *   generateYAxis(revenue)                      -> labels, and the top of scale
 *   (chartHeight / topLabel) * month.revenue    -> each bar's pixel height
 *
 * Both are ported verbatim in acme-chart-utils.js and resolved before the
 * children are constructed, so a bar receives a finished height and the template
 * stays free of arithmetic.
 */
export class DashboardRevenueTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'dashboardRevenue$';
    super(context, traitPrefix);
  }

  /**
   * The source's `if (!revenue.length) return <p>No data available.</p>` cannot
   * be an early return in the same sense: this view renders its frame from the
   * template either way, and simply adds no bars when there is no revenue.
   */
  static dashboardRevenue$RenderChart(props = this.props) {
    const revenue = props.data.acmeData?.revenue || [];

    if (revenue.length === 0) return;

    // topLabel is the top of the scale every bar is measured against, so the
    // axis and the bars have to come from one call — computing them separately
    // would let the tallest bar disagree with the top label.
    const { yAxisLabels, topLabel } = generateYAxis(revenue);

    this.appendView(
      new DashboardRevenueYAxisView({ data: yAxisLabels }),
      `[data-slot='y-axis']`,
    );

    revenue.forEach((month) => {
      this.appendView(
        new DashboardRevenueBarView({
          data: {
            month: month.month,
            barHeight: getBarHeight(month.revenue, topLabel, props.chartHeight),
          },
        }),
        `[data-slot='bars']`,
      );
    });
  }
}
