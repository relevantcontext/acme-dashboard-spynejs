import { ViewStream } from 'spyne';
import DashboardRevenueYAxisTmpl from './templates/dashboard-revenue-y-axis-view.tmpl.html';

/**
 * The y-axis labels of app/ui/dashboard/revenue-chart.tsx:
 *
 *   {yAxisLabels.map((label) => <p key={label}>{label}</p>)}
 *
 * One view for the whole column rather than one per label. A label is a string
 * with no behaviour and no geometry to compute, so a module each would be four
 * ViewStreams to say what a bare-array section says in three lines. The bars are
 * their own views because each carries a computed height — that is the line
 * between the two.
 *
 * The root is `display: contents`, so this element leaves layout entirely and
 * the <p>s become direct children of the axis column, which is the flex-column
 * that spaces them with justify-between.
 *
 * props.data is a bare array of strings, iterated by the template's
 * `{{#}}...{{/}}` section. `{{.}}` is the canonical token for the item itself —
 * no object wrapping is needed to interpolate a scalar. [recognize-never-emit]
 *
 * @param {Object} props
 * @param {Array<String>} props.data
 */
export class DashboardRevenueYAxisView extends ViewStream {
  constructor(props = {}) {
    props.class = 'contents';
    props.template = DashboardRevenueYAxisTmpl;
    props.data = props.data || [];

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
