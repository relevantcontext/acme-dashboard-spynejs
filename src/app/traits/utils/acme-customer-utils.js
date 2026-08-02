export const CUSTOMER_PARAMS_EVENT = 'acme_customers_params_changed';

export const filterCustomers = (customers = [], query = '') => {
  const normalizedQuery = String(query).trim().toLowerCase();

  if (normalizedQuery === '') return customers;

  return customers.filter(({ name, email }) =>
    [name, email].some((field) =>
      String(field).toLowerCase().includes(normalizedQuery),
    ),
  );
};

export const readCustomerParams = (search = '') => {
  const params = new URLSearchParams(search);

  return { query: params.get('query') || '' };
};
