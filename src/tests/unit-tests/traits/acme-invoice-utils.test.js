import { expect } from 'chai';
import {
  sortInvoices,
  nextInvoiceSortValue,
  readInvoiceParams,
} from '/src/app/utils/acme-invoice-utils.js';

// Ordered as the server delivers: date DESC, id DESC (newest first).
const invoices = [
  {
    id: 'a',
    name: 'Delba de Oliveira',
    amount: 44800,
    date: '2023-12-06T00:00:00.000Z',
    status: 'paid',
  },
  {
    id: 'b',
    name: 'amy burns',
    amount: 500,
    date: '2023-10-04T00:00:00.000Z',
    status: 'paid',
  },
  {
    id: 'c',
    name: 'Balazs Orban',
    amount: 8945,
    date: '2023-10-04T00:00:00.000Z',
    status: 'pending',
  },
];

const idsOf = (list) => list.map(({ id }) => id);

describe('Acme invoice sorting', () => {
  it('leaves the newest-first default untouched without a sort key', () => {
    expect(sortInvoices(invoices, null, null)).to.equal(invoices);
  });

  it('sorts customers case-insensitively', () => {
    expect(idsOf(sortInvoices(invoices, 'customer', 'asc'))).to.deep.equal([
      'b',
      'c',
      'a',
    ]);
  });

  it('sorts amounts numerically, not lexically', () => {
    // Lexical would put 500 ("500") after 44800 ("44800").
    expect(idsOf(sortInvoices(invoices, 'amount', 'asc'))).to.deep.equal([
      'b',
      'c',
      'a',
    ]);
    expect(idsOf(sortInvoices(invoices, 'amount', 'desc'))).to.deep.equal([
      'a',
      'c',
      'b',
    ]);
  });

  it('sorts dates chronologically and keeps ties in incoming order', () => {
    // b and c share a date; stable sort keeps b (newer by id order) first.
    expect(idsOf(sortInvoices(invoices, 'date', 'asc'))).to.deep.equal([
      'b',
      'c',
      'a',
    ]);
  });

  it('sorts status with paid before pending ascending', () => {
    expect(idsOf(sortInvoices(invoices, 'status', 'asc'))).to.deep.equal([
      'a',
      'b',
      'c',
    ]);
  });

  it('does not mutate the input collection', () => {
    const before = idsOf(invoices);
    sortInvoices(invoices, 'amount', 'desc');
    expect(idsOf(invoices)).to.deep.equal(before);
  });
});

describe('Acme invoice sort transitions', () => {
  it('starts a new column ascending', () => {
    expect(nextInvoiceSortValue(null, null, 'amount')).to.equal('amount-asc');
    expect(nextInvoiceSortValue('date', 'desc', 'customer')).to.equal(
      'customer-asc',
    );
  });

  it('flips direction on the active column', () => {
    expect(nextInvoiceSortValue('amount', 'asc', 'amount')).to.equal(
      'amount-desc',
    );
    expect(nextInvoiceSortValue('amount', 'desc', 'amount')).to.equal(
      'amount-asc',
    );
  });

  it('returns the delete-token for an unknown column', () => {
    expect(nextInvoiceSortValue('amount', 'asc', 'email')).to.equal('');
  });
});

describe('Acme invoice params', () => {
  it('reads a valid sort param', () => {
    expect(readInvoiceParams('?query=lee&sort=amount-desc')).to.deep.equal({
      query: 'lee',
      sortKey: 'amount',
      sortDir: 'desc',
    });
  });

  it('reads a malformed sort as no sort at all', () => {
    ['?sort=amount', '?sort=email-asc', '?sort=date-up', '?sort='].forEach(
      (search) => {
        const { sortKey, sortDir } = readInvoiceParams(search);
        expect(sortKey, search).to.equal(null);
        expect(sortDir, search).to.equal(null);
      },
    );
  });
});
