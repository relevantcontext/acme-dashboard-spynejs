import { expect } from 'chai';
import {
  filterCustomers,
  readCustomerParams,
} from '/src/app/utils/acme-utils.js';
import { buildAcmeSearch } from '/src/app/utils/acme-utils.js';

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

  it('reads the page parameter as a positive integer', () => {
    expect(readCustomerParams('?page=3').page).to.equal(3);
  });

  it('reads page and query together', () => {
    expect(readCustomerParams('?query=alice&page=2')).to.deep.equal({
      query: 'alice',
      page: 2,
    });
  });

  it('defaults an absent page to 1', () => {
    expect(readCustomerParams('?query=alice').page).to.equal(1);
  });

  it('defaults a malformed or non-positive page to 1', () => {
    expect(readCustomerParams('?page=abc').page).to.equal(1);
    expect(readCustomerParams('?page=2.5').page).to.equal(1);
    expect(readCustomerParams('?page=0').page).to.equal(1);
    expect(readCustomerParams('?page=-4').page).to.equal(1);
  });

  it('merges a domain query without discarding unrelated parameters', () => {
    expect(buildAcmeSearch('?keep=1', { query: 'alice' })).to.equal(
      'keep=1&query=alice',
    );
  });
});
