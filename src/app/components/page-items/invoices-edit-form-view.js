import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import InvoicesEditFormTmpl from './templates/invoices-form-view.tmpl.html';
import { InvoicesFormTraits } from 'traits/invoices/invoices-form-traits.js';

const USER_ICON =
  'pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500';
const DOLLAR_ICON =
  'pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900';

/**
 * Converted from app/ui/invoices/edit-form.tsx.
 *
 * Same template as the create form. The difference is the prefilled data: the
 * amount value, and exactly one checked radio derived from the invoice status.
 * The source uses defaultChecked={invoice.status === 'pending' | 'paid'}; here
 * one of pendingChecked / paidChecked is present as {} and the template's object
 * section emits the `checked` attribute.
 *
 * The pre-selected customer is a wiring concern: the <option>s do not exist
 * until fetchCustomers returns, so `selectedCustomerId` is carried in data for
 * that step rather than acted on in markup.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {Object} props.data.invoice   { id, customer_id, amount, status }
 */
export class InvoicesEditFormView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'form';
    props.dataset = { eventPreventDefault: 'true' };
    props.template = InvoicesEditFormTmpl;
    props.channels = [
      'CHANNEL_UI',
      'CHANNEL_ACME_INVOICES',
      ['CHANNEL_ACME_DATA', true],
    ];
    props.traits = [InvoicesFormTraits];
    props.data = {
      ...props.data,
      customerLabel: 'Choose customer',
      customerPlaceholder: 'Select a customer',
      amountLabel: 'Choose an amount',
      amountPlaceholder: 'Enter USD amount',
      attrAmount: '',
      statusLabel: 'Set the invoice status',
      pendingLabel: 'Pending',
      paidLabel: 'Paid',
      pendingCheckedAttr: '',
      paidCheckedAttr: '',
      cancelLabel: 'Cancel',
      attrCancelHref: '/dashboard/invoices',
      submitLabel: 'Edit Invoice',
      submitAction: 'update-invoice',
      svgUserCircle: withClass('userCircle', USER_ICON),
      svgCurrencyDollar: withClass('currencyDollar', DOLLAR_ICON),
      svgClock: withClass('clock', 'h-4 w-4'),
      svgCheck: withClass('check', 'h-4 w-4'),
    };

    super(props);
  }

  addActionListeners() {
    return [
      ['CHANNEL_ACME_INVOICES_EDIT_EVENT', 'invoicesForm$OnEdit'],
      ['CHANNEL_UI_SUBMIT_EVENT', 'invoicesForm$OnSubmit'],
      ['CHANNEL_ACME_DATA_UPDATED_EVENT', 'invoicesForm$OnDataUpdated'],
    ];
  }

  broadcastEvents() {
    return [
      ['form', 'submit'],
      ['a', 'click'],
    ];
  }

  onRendered() {}
}
