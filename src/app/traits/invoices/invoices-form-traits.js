import { SpyneTrait } from 'spyne';
import { InvoicesCustomerOptionView } from 'components/elements/invoices-customer-option-view.js';

const OPTIONS_SELECTOR = '[data-slot="customer-options"]';

export class InvoicesFormTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'invoicesForm$');
  }

  static invoicesForm$OnCreate(e) {
    this.props.invoiceFormContext = {
      btnType: 'create-invoice',
      invoiceId: null,
    };
    this.invoicesForm$PopulateCustomers(e?.payload?.customers || []);
  }

  static invoicesForm$OnEdit(e) {
    const invoice = e?.payload?.invoice;
    if (!invoice) return;

    this.props.invoiceFormContext = {
      btnType: 'update-invoice',
      invoiceId: invoice.id,
    };
    this.invoicesForm$PopulateCustomers(
      e?.payload?.customers || [],
      invoice.customer_id,
    );

    const amountEl = this.props.el$('input[name="amount"]').el;
    const statusEl = this.props.el$(
      `input[name="status"][value="${invoice.status}"]`,
    ).el;
    if (amountEl) amountEl.value = invoice.amount;
    if (statusEl) statusEl.checked = true;
  }

  static invoicesForm$PopulateCustomers(customers, selectedCustomerId) {
    customers.forEach(({ id, name }) => {
      this.appendView(
        new InvoicesCustomerOptionView({
          data: {
            value: id,
            name,
            selected: String(id) === String(selectedCustomerId),
          },
        }),
        OPTIONS_SELECTOR,
      );
    });

    if (selectedCustomerId !== undefined) {
      const selectEl = this.props.el$(OPTIONS_SELECTOR).el;
      if (selectEl) selectEl.value = String(selectedCustomerId);
    }
  }

  static invoicesForm$OnSubmit(e) {
    const form = e?.srcElement?.el;
    const context = this.props.invoiceFormContext;
    if (!form || !context) return;

    const formData = new FormData(form);
    this.props.invoiceSubmissionPending = true;
    this.sendInfoToChannel(
      'CHANNEL_ACME_DATA',
      {
        ...context,
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
      },
      'CHANNEL_ACME_DATA_INVOICE_SUBMIT_EVENT',
    );
  }

  static invoicesForm$OnDataUpdated() {
    if (this.props.invoiceSubmissionPending !== true) return;
    this.props.invoiceSubmissionPending = false;
    this.sendInfoToChannel('CHANNEL_ROUTE', {
      pageId: 'dashboard',
      topicId: 'invoices',
      optionId: '',
    });
  }
}
