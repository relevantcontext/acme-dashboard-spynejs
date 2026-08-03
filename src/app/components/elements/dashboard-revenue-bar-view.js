import { ViewStream } from 'spyne';
import DashboardRevenueBarTmpl from './templates/dashboard-revenue-bar-view.tmpl.html';

/**
 * One bar of app/ui/dashboard/revenue-chart.tsx.
 *
 * The source computes the height inline as
 * `(chartHeight / topLabel) * month.revenue`. The template has no arithmetic,
 * so the caller passes the resolved pixel height.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {String} props.data.month
 * @param {Number} props.data.barHeight  already resolved to pixels
 */
export class DashboardRevenueBarView extends ViewStream {
  constructor(props = {}) {
    const { month = '', barHeight = 0 } = props.data || {};

    props.tagName = 'div';
    props.class = 'flex flex-col items-center gap-2';
    props.template = DashboardRevenueBarTmpl;
    props.data = {
      ...props.data,
      month,
      barHeight: String(barHeight),
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
