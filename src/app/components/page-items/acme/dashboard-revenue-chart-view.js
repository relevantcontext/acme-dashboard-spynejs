import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import { DashboardRevenueBarView } from 'components/page-items/acme/dashboard-revenue-bar-view.js';
import { DashboardRevenueYAxisView } from 'components/page-items/acme/dashboard-revenue-y-axis-view.js';
import { generateYAxis, getBarHeight } from 'traits/utils/acme-chart-utils.js';
import DashboardRevenueChartTmpl from './templates/dashboard-revenue-chart-view.tmpl.html';

/**
 * Converted from app/ui/dashboard/revenue-chart.tsx.
 *
 * The bars are DashboardRevenueBarView instances in [data-slot="bars"] and the
 * axis labels a single DashboardRevenueYAxisView in [data-slot="y-axis"], both
 * built from the revenue slice of the /api/bootstrap dump.
 *
 * Same reason as the latest-invoices list for building these as child views
 * rather than a template section: on a cold load the page mounts before the dump
 * lands, and a DomElementTemplate renders once.
 *
 * ── What is computed here ───────────────────────────────────────────────────
 *
 * The source does two calculations inline that a template cannot express:
 *
 *   generateYAxis(revenue)                      -> labels, and the top of scale
 *   (chartHeight / topLabel) * month.revenue    -> each bar's pixel height
 *
 * Both are ported verbatim in acme-chart-utils.js and resolved before the
 * children are constructed, so a bar receives a finished height and the template
 * stays free of arithmetic.
 *
 * The source's `if (!revenue.length) return <p>No data available.</p>` cannot be
 * an early return here, since this view exists before its data does. It renders
 * as an empty chart frame that fills in when the dump lands.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {String} [props.data.heading]
 * @param {String} [props.data.footerText]
 * @param {Number} [props.data.chartHeight]  defaults to the source's 350
 */
export class DashboardRevenueChartView extends ViewStream {
  constructor(props = {}) {
    const {
      heading = 'Recent Revenue',
      footerText = 'Last 12 months',
      chartHeight = 350,
    } = props.data || {};

    props.tagName = 'div';
    props.class = 'w-full md:col-span-4';
    props.template = DashboardRevenueChartTmpl;
    props.data = {
      ...props.data,
      heading,
      footerText,
      chartHeight: String(chartHeight),
      svgCalendar: withClass('calendar', 'h-5 w-5 text-gray-500'),
    };

    super(props);

    this.chartHeight = chartHeight;
  }

  addActionListeners() {
    return [];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    this.renderChart();
  }

  renderChart() {
    const revenue = this.props.data.acmeData?.revenue || [];

    if (revenue.length === 0) return;

    // topLabel is the top of the scale every bar is measured against, so the
    // axis and the bars have to be generated from one call — computing them
    // separately would let the tallest bar disagree with the top label.
    const { yAxisLabels, topLabel } = generateYAxis(revenue);

    this.appendView(
      new DashboardRevenueYAxisView({
        data: yAxisLabels.map((label) => ({ label })),
      }),
      `[data-slot='y-axis']`,
    );

    revenue.forEach((month) => {
      this.appendView(
        new DashboardRevenueBarView({
          data: {
            month: month.month,
            barHeight: getBarHeight(month.revenue, topLabel, this.chartHeight),
          },
        }),
        `[data-slot='bars']`,
      );
    });
  }
}
