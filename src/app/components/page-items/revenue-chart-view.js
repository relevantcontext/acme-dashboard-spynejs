import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import RevenueChartTmpl from './templates/revenue-chart.tmpl.html';

/**
 * Converted from app/ui/dashboard/revenue-chart.tsx (outer markup).
 *
 * Bars are RevenueBarView instances mounted into [data-slot="bars"], and the
 * y-axis labels into [data-slot="y-axis"].
 *
 * The source's `if (!revenue.length) return <p>No data available.</p>` early
 * return is a rendering decision, not markup — it belongs to whatever mounts
 * this, so it is not represented here.
 *
 * @param {Object} props
 * @param {Number} [props.chartHeight]  defaults to the source's 350
 */
export class RevenueChartView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'w-full md:col-span-4';
    props.template = RevenueChartTmpl;
    props.data = {
      heading: 'Recent Revenue',
      footerText: 'Last 12 months',
      chartHeight: String(props.chartHeight || 350),
      svgCalendar: withClass('calendar', 'h-5 w-5 text-gray-500'),
    };

    super(props);
  }

  addActionListeners() {
    return [];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
