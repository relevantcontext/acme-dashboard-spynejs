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
 * @param {String} props.value   customer id
 * @param {String} props.name
 * @param {Boolean} [props.selected]
 */
export class InvoicesCustomerOptionView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'option';
    props.value = props.value || '';
    if (props.selected) props.selected = 'selected';
    props.template = InvoicesCustomerOptionTmpl;
    props.data = { name: props.name || '' };

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
