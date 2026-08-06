import { expect } from 'chai';
import {
  buildQuickSearchCustomerRows,
  buildQuickSearchInvoiceRows,
  quickSearchDataSignature,
} from '/src/app/utils/acme-quicksearch-utils.js';

const customers = [
  {
    id: 'c1',
    name: 'Alice Walker',
    email: 'alice@example.com',
    total_invoices: 4,
    image_url: '/customers/alice.png',
  },
];

const invoices = [
  {
    id: 'i1',
    name: 'Alice Walker',
    email: 'alice@example.com',
    amount: 44800,
    date: '2023-09-10T00:00:00.000Z',
    status: 'paid',
    image_url: '/customers/alice.png',
  },
  {
    id: 'i2',
    name: 'Bob Stone',
    email: 'bob@stone.test',
    amount: 100,
    date: '2024-01-02T00:00:00.000Z',
    status: 'pending',
    image_url: '/customers/bob.png',
  },
];

describe('Acme quick-search utilities', () => {
  it('shapes a customer row with an encoded invoices deeplink', () => {
    const [row] = buildQuickSearchCustomerRows(customers);

    expect(row.attrCustomerId).to.equal('c1');
    expect(row.invoicesLabel).to.equal('4 invoices');
    expect(row.attrHref).to.equal('/dashboard/invoices?query=Alice+Walker');
    expect(row.attrImageSrc).to.equal('imgs/customers/alice.png');
  });

  it('shapes invoice rows with formatted values and one status section', () => {
    const icons = { svgCheck: '<c/>', svgClock: '<k/>', svgPencil: '<p/>' };
    const [paid, pending] = buildQuickSearchInvoiceRows(invoices, icons);

    expect(paid.amount).to.equal('$448.00');
    expect(paid.attrEditHref).to.equal('/dashboard/invoices/i1/edit');
    expect(paid.isPaid).to.deep.equal({ label: 'Paid', svgCheck: '<c/>' });
    expect(paid.isPending).to.equal(undefined);

    expect(pending.isPending).to.deep.equal({
      label: 'Pending',
      svgClock: '<k/>',
    });
    expect(pending.isPaid).to.equal(undefined);
  });

  it('signature ignores status changes (toggle must not rebuild rows)', () => {
    const toggled = invoices.map((invoice) =>
      invoice.id === 'i1' ? { ...invoice, status: 'pending' } : invoice,
    );

    expect(quickSearchDataSignature(toggled, customers)).to.equal(
      quickSearchDataSignature(invoices, customers),
    );
  });

  it('signature changes when a record is added, edited or removed', () => {
    const edited = invoices.map((invoice) =>
      invoice.id === 'i2' ? { ...invoice, amount: 200 } : invoice,
    );
    const removed = invoices.slice(0, 1);
    const base = quickSearchDataSignature(invoices, customers);

    expect(quickSearchDataSignature(edited, customers)).to.not.equal(base);
    expect(quickSearchDataSignature(removed, customers)).to.not.equal(base);
    expect(quickSearchDataSignature(invoices, [])).to.not.equal(base);
  });
});
