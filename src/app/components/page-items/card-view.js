import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import CardTmpl from './templates/card.tmpl.html';

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
 * The CardWrapper export is not converted — it is a container that fetches and
 * renders four Cards, which is composition rather than markup.
 *
 * @param {Object} props
 * @param {String} props.title
 * @param {String|Number} props.value
 * @param {'invoices'|'customers'|'pending'|'collected'} props.type
 */
export class CardView extends ViewStream {
  constructor(props = {}) {
    const iconName = ICON_BY_TYPE[props.type];

    props.tagName = 'div';
    props.class = 'rounded-xl bg-gray-50 p-2 shadow-sm';
    props.template = CardTmpl;
    props.data = {
      title: props.title || '',
      value: props.value === undefined ? '' : String(props.value),
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
