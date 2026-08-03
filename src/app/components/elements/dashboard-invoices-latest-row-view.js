import { ViewStream } from 'spyne';
import DashboardInvoicesLatestRowTmpl from './templates/dashboard-invoices-latest-row-view.tmpl.html';

const ROW_BASE = 'flex flex-row items-center justify-between py-4';

/**
 * One row of app/ui/dashboard/latest-invoices.tsx.
 *
 * The source adds `border-t` to every row except the first via
 * `{ 'border-t': i !== 0 }`. That index test is resolved by the caller and
 * passed as `isFirst`, since the template has no arithmetic.
 *
 * next/image becomes a plain <img>; there is no image optimiser here.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {String} props.data.name
 * @param {String} props.data.email
 * @param {String} props.data.amount     already currency-formatted
 * @param {String} props.data.imageUrl
 * @param {Boolean} [props.data.isFirst]
 */
export class DashboardInvoicesLatestRowView extends ViewStream {
  constructor(props = {}) {
    const {
      name = '',
      email = '',
      amount = '',
      imageUrl = '',
      isFirst = false,
    } = props.data || {};

    props.tagName = 'div';
    props.class = isFirst ? ROW_BASE : `${ROW_BASE} border-t`;
    props.template = DashboardInvoicesLatestRowTmpl;
    props.data = {
      ...props.data,
      name,
      email,
      amount,
      attrImageSrc: imageUrl,
      attrImageAlt: `${name}'s profile picture`,
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
