import { expect } from 'chai';
import {
  buildQuickSearchResults,
  clampHighlightIndex,
} from '/src/app/utils/acme-quick-search-utils.js';

const customers = [
  {
    id: 'c1',
    name: 'Alice Walker',
    email: 'alice@example.com',
    image_url: '/customers/alice.png',
    total_invoices: 4,
  },
  {
    id: 'c2',
    name: 'Bob Stone',
    email: 'finance@stone.test',
    image_url: '/customers/bob.png',
    total_invoices: 2,
  },
];

const invoices = [
  {
    id: 'i1',
    name: 'Alice Walker',
    email: 'alice@example.com',
    image_url: '/customers/alice.png',
    amount: 44800,
    date: '2023-09-10T00:00:00.000Z',
    status: 'pending',
  },
  {
    id: 'i2',
    name: 'Bob Stone',
    email: 'finance@stone.test',
    image_url: '/customers/bob.png',
    amount: 500,
    date: '2023-06-05T00:00:00.000Z',
    status: 'paid',
  },
];

describe('Quick-search utilities', () => {
  it('returns the empty prompt (not everything) for an empty query', () => {
    const results = buildQuickSearchResults(customers, invoices, '  ');

    expect(results.totalMatched).to.equal(0);
    expect(results.flatRows).to.deep.equal([]);
    expect(results.emptyPrompt).to.not.equal(null);
    expect(results.customersHeader).to.equal(null);
    expect(results.invoicesHeader).to.equal(null);
  });

  it('matches customers and invoices with the domain predicates', () => {
    const results = buildQuickSearchResults(customers, invoices, 'alice');

    expect(results.customerRows.map((r) => r.attrCustomerId)).to.deep.equal([
      'c1',
    ]);
    expect(results.invoiceRows.map((r) => r.attrInvoiceId)).to.deep.equal([
      'i1',
    ]);
    expect(results.totalMatched).to.equal(2);
  });

  it('numbers rows sequentially across both groups, aligned with flatRows', () => {
    const results = buildQuickSearchResults(customers, invoices, 'stone');

    expect(results.customerRows[0].qsIndex).to.equal(0);
    expect(results.invoiceRows[0].qsIndex).to.equal(1);
    expect(results.flatRows).to.deep.equal([
      { kind: 'customer', customerId: 'c2', customerName: 'Bob Stone' },
      { kind: 'invoice', invoiceId: 'i2' },
    ]);
  });

  it('matches invoices by status, amount-in-cents and date slice', () => {
    const byStatus = buildQuickSearchResults([], invoices, 'pending');
    const byAmount = buildQuickSearchResults([], invoices, '448');
    const byDate = buildQuickSearchResults([], invoices, '2023-06');

    expect(byStatus.invoiceRows.map((r) => r.attrInvoiceId)).to.deep.equal([
      'i1',
    ]);
    expect(byAmount.invoiceRows.map((r) => r.attrInvoiceId)).to.deep.equal([
      'i1',
    ]);
    expect(byDate.invoiceRows.map((r) => r.attrInvoiceId)).to.deep.equal([
      'i2',
    ]);
  });

  it('shapes invoice rows with display-ready values and edit hrefs', () => {
    const results = buildQuickSearchResults([], invoices, 'bob');
    const row = results.invoiceRows[0];

    expect(row.amount).to.equal('$5.00');
    expect(row.statusLabel).to.equal('Paid');
    expect(row.attrEditHref).to.equal('/dashboard/invoices/i2/edit');
    expect(row.attrImageSrc).to.equal('imgs/customers/bob.png');
  });

  it('reports no results without an empty prompt for a miss', () => {
    const results = buildQuickSearchResults(customers, invoices, 'zzz');

    expect(results.noResults).to.not.equal(null);
    expect(results.emptyPrompt).to.equal(null);
    expect(results.totalMatched).to.equal(0);
  });

  it('clamps the highlight index onto the list', () => {
    expect(clampHighlightIndex(5, 3)).to.equal(2);
    expect(clampHighlightIndex(-2, 3)).to.equal(0);
    expect(clampHighlightIndex(1, 3)).to.equal(1);
    expect(clampHighlightIndex(0, 0)).to.equal(-1);
  });
});
