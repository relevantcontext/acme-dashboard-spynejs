import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { buildRevenueChart } from 'utils/acme-utils.js';
import DashboardRevenueChartTmpl from './templates/dashboard-revenue-chart-view.tmpl.html';

/**
 * Converted from app/ui/dashboard/revenue-chart.tsx.
 *
 * The bars and the axis labels are template sections, both built from the
 * revenue slice of the /api/bootstrap dump.
 *
 * ── Why they are markup and not modules ─────────────────────────────────────
 *
 * DashboardRevenueBarView and DashboardRevenueYAxisView declared no connection
 * between them: no broadcastEvents, no listener, no channel, no trait. Both
 * also needed a `display: contents` root purely because a ViewStream must have
 * a root element — so folding them removes a hack rather than adding one, and
 * the <p>s and bar divs are now the direct grid children they were faking.
 * 
 *
 * Safe to fold because this view's lifetime IS the content's: PageAcmeView
 * builds it with the dump already in props and disposes it with the page, so
 * nothing arrives after the template has rendered.
 *
 * ── What is computed here ───────────────────────────────────────────────────
 *
 * The source does two calculations inline that a template cannot express:
 *
 *   generateYAxis(revenue)                      -> labels, and the top of scale
 *   (chartHeight / topLabel) * month.revenue    -> each bar's pixel height
 *
 * Both are ported verbatim in acme-utils.js and resolved by
 * buildRevenueChart before super(), so a bar arrives with finished pixels and
 * the template stays free of arithmetic.
 *
 * The source's `if (!revenue.length) return <p>No data available.</p>` is not an
 * early return here: the frame renders from the template either way and simply
 * gets no bars.
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
      ...buildRevenueChart(props.data?.acmeData, chartHeight),
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

  onRendered() {}
}
