import { ViewStream } from 'spyne';
import InvoicesCustomerOptionTmpl from './templates/invoices-customer-option-view.tmpl.html';

/**
 * One <option> of the customer <select> in the create/edit invoice forms.
 *
 * The source loops customers into <option value={id}>{name}</option>. A <select>
 * may only contain option/optgroup, so these mount directly into the select
 * (its data-slot="customer-options") rather than through a wrapper element.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {String} props.data.value   customer id
 * @param {String} props.data.name
 * @param {Boolean} [props.data.selected]
 */
export class InvoicesCustomerOptionView extends ViewStream {
  constructor(props = {}) {
    const { value = '', name = '', selected = false } = props.data || {};

    props.tagName = 'option';
    props.value = value;
    if (selected) props.selected = 'selected';
    props.template = InvoicesCustomerOptionTmpl;
    props.data = { ...props.data, name };

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
