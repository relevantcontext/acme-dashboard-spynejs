import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import ButtonTmpl from './templates/button.tmpl.html';

const BUTTON_BASE =
  'flex h-10 items-center rounded-lg bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:bg-blue-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

/**
 * Converted from app/ui/button.tsx.
 *
 * The source takes `children` and spreads arbitrary button attributes. There is
 * no children concept here, so the two things the Acme UI actually passes — a
 * label and an optional trailing icon — are explicit props. Anything richer
 * should nest a ViewStream rather than grow this component.
 *
 * @param {Object} props
 * @param {String} props.label
 * @param {String} [props.icon]        key from traits/utils/svg-icons.js
 * @param {String} [props.iconClass]
 * @param {String} [props.className]   appended, matching the source's clsx merge
 * @param {String} [props.acmeAction]  routes a click through ChannelAcmeApi
 */
export class ButtonView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'button';
    props.class = props.className
      ? `${BUTTON_BASE} ${props.className}`
      : BUTTON_BASE;
    props.template = ButtonTmpl;
    props.data = {
      label: props.label || '',
      svgIcon: props.icon ? withClass(props.icon, props.iconClass || '') : '',
    };

    props.dataset = props.acmeAction
      ? { eventType: 'acmeApi', acmeAction: props.acmeAction }
      : {};

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
