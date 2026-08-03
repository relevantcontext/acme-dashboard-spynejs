import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { DashboardRevenueTraits } from 'traits/dashboard-revenue-traits.js';
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
    props.traits = [DashboardRevenueTraits];

    // On props, not on the instance: props has the framework's GC cleanup, and
    // a trait method reading `props.chartHeight` has the same signature whether
    // its context is a ViewStream or a Channel.
    props.chartHeight = chartHeight;
    props.data = {
      ...props.data,
      heading,
      footerText,
      chartHeight: String(chartHeight),
      svgCalendar: withClass('calendar', 'h-5 w-5 text-gray-500'),
    };

    super(props);
  }

  addActionListeners() {
    // No channel. This item is parent-governed: it is built by PageAcmeView with
    // its data already in props, and it renders and disposes with the page.
    // Nothing arrives after birth, so there is nothing to listen for.
    return [];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    this.dashboardRevenue$RenderChart();
  }
}
