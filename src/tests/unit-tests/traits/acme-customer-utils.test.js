import { expect } from 'chai';
import {
  filterCustomers,
  readCustomerParams,
} from '/src/app/utils/acme-customer-utils.js';
import { buildAcmeSearch } from '/src/app/utils/acme-query-utils.js';

const customers = [
  { id: '1', name: 'Alice Walker', email: 'alice@example.com' },
  { id: '2', name: 'Bob Stone', email: 'finance@stone.test' },
];

describe('Acme customer utilities', () => {
  it('matches customer names case-insensitively', () => {
    expect(filterCustomers(customers, 'ALICE')).to.deep.equal([customers[0]]);
  });

  it('matches customer email addresses', () => {
    expect(filterCustomers(customers, 'finance@')).to.deep.equal([
      customers[1],
    ]);
  });

  it('returns all customers for an empty query', () => {
    expect(filterCustomers(customers, '')).to.deep.equal(customers);
  });

  it('reads the shared query parameter from the URL', () => {
    expect(readCustomerParams('?query=alice').query).to.equal('alice');
  });

  it('merges a domain query without discarding unrelated parameters', () => {
    expect(buildAcmeSearch('?keep=1', { query: 'alice' })).to.equal(
      'keep=1&query=alice',
    );
  });
});
