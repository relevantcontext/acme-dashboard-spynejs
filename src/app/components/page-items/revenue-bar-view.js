import { ViewStream } from 'spyne';
import RevenueBarTmpl from './templates/revenue-bar.tmpl.html';

/**
 * One bar of app/ui/dashboard/revenue-chart.tsx.
 *
 * The source computes the height inline as
 * `(chartHeight / topLabel) * month.revenue`. The template has no arithmetic,
 * so the caller passes the resolved pixel height.
 *
 * @param {Object} props
 * @param {String} props.month
 * @param {Number} props.barHeight  already resolved to pixels
 */
export class RevenueBarView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'flex flex-col items-center gap-2';
    props.template = RevenueBarTmpl;
    props.data = {
      month: props.month || '',
      barHeight: String(props.barHeight || 0),
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
