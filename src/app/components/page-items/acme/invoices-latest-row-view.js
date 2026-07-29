import { ViewStream } from 'spyne';
import InvoicesLatestRowTmpl from './templates/invoices-latest-row-view.tmpl.html';

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
 * @param {String} props.name
 * @param {String} props.email
 * @param {String} props.amount     already currency-formatted
 * @param {String} props.imageUrl
 * @param {Boolean} [props.isFirst]
 */
export class InvoicesLatestRowView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = props.isFirst ? ROW_BASE : `${ROW_BASE} border-t`;
    props.template = InvoicesLatestRowTmpl;
    props.data = {
      name: props.name || '',
      email: props.email || '',
      amount: props.amount || '',
      attrImageSrc: props.imageUrl || '',
      attrImageAlt: `${props.name || ''}'s profile picture`,
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
