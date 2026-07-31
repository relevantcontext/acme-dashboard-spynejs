import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import DashboardStatCardTmpl from './templates/dashboard-stat-card-view.tmpl.html';

// Card type -> icon, from the iconMap in app/ui/dashboard/cards.tsx.
const ICON_BY_TYPE = {
  collected: 'banknotes',
  customers: 'userGroup',
  pending: 'clock',
  invoices: 'inbox',
};

/**
 * Converted from the Card export in app/ui/dashboard/cards.tsx.
 *
 * Content arrives as props.data — one entry from the container's
 * props.data.cards, passed straight through. Only the icon is derived here:
 * `type` selects it, so the model never names an icon.
 *
 * `value` is the one dynamic field. `title` and `type` are static content and
 * come from app.model.json.
 *
 * The CardWrapper export is not converted — DashboardStatsContainer owns
 * composing the four, which is structure rather than markup.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {String} props.data.title
 * @param {String|Number} [props.data.value]
 * @param {'invoices'|'customers'|'pending'|'collected'} props.data.type
 */
export class DashboardStatCardView extends ViewStream {
  constructor(props = {}) {
    const { title = '', value, type } = props.data || {};
    const iconName = ICON_BY_TYPE[type];

    props.tagName = 'div';
    props.class = 'rounded-xl bg-gray-50 p-2 shadow-sm';
    props.template = DashboardStatCardTmpl;
    props.data = {
      ...props.data,
      title,
      value: value === undefined || value === null ? '' : String(value),
      svgIcon: iconName ? withClass(iconName, 'h-5 w-5 text-gray-700') : '',
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
