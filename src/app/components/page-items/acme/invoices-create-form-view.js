import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import InvoicesCreateFormTmpl from './templates/invoices-form-view.tmpl.html';

const USER_ICON =
  'pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500';
const DOLLAR_ICON =
  'pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900';

/**
 * Converted from app/ui/invoices/create-form.tsx.
 *
 * Shares its template with the edit form — the two differ only in prefilled
 * values, the checked radio, the submit label and the submit action, all of
 * which are data. The create form supplies none of the prefills, so the amount
 * is empty and neither radio is checked, matching the source.
 *
 * Slots left for the wiring step:
 *   [data-slot="customer-options"]  the <select> itself; customer <option>s
 *                                   (InvoicesCustomerOptionView) append here
 *                                   once fetchCustomers returns
 *   [data-slot="*-error"]           the per-field zod error <p>s
 *   [data-slot="form-message"]      the form-level error message
 *
 * The Cancel link and submit button are inlined — intrinsic, always present.
 * The submit carries `data-btn-type="create-invoice"`. Unlike delete, the
 * request needs the form's field values, which a dataset cannot carry — the
 * fields are collected from the submit event before the payload is dispatched.
 */
export class InvoicesCreateFormView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'form';
    props.template = InvoicesCreateFormTmpl;
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
      // create: neither radio checked
      pendingCheckedAttr: '',
      paidCheckedAttr: '',
      cancelLabel: 'Cancel',
      attrCancelHref: '/dashboard/invoices',
      submitLabel: 'Create Invoice',
      submitAction: 'create-invoice',
      svgUserCircle: withClass('userCircle', USER_ICON),
      svgCurrencyDollar: withClass('currencyDollar', DOLLAR_ICON),
      svgClock: withClass('clock', 'h-4 w-4'),
      svgCheck: withClass('check', 'h-4 w-4'),
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
