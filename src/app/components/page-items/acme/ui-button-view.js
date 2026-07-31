import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import UIButtonTmpl from './templates/ui-button-view.tmpl.html';

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
 * @param {Object} props.data
 * @param {String} props.data.label
 * @param {String} [props.data.icon]        key from traits/utils/svg-icons.js
 * @param {String} [props.data.iconClass]
 * @param {String} [props.className]   appended, matching the source's clsx merge
 * @param {String} [props.data.btnType]  keys into ACME_ENDPOINTS
 */
export class UIButtonView extends ViewStream {
  constructor(props = {}) {
    const { label = '', icon, iconClass = '', btnType } = props.data || {};

    props.tagName = 'button';
    props.class = props.className
      ? `${BUTTON_BASE} ${props.className}`
      : BUTTON_BASE;
    props.template = UIButtonTmpl;
    props.data = {
      ...props.data,
      label,
      svgIcon: icon ? withClass(icon, iconClass) : '',
    };

    // eventType routes the click to ChannelAcmeApi; btnType selects the endpoint
    // once it gets there.
    props.dataset = btnType ? { eventType: 'acmeApi', btnType } : {};

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
