import {
  formatInvoiceAmount,
  formatInvoiceDate,
  getInvoiceStatusClass,
  // Relative rather than the `utils/` alias: web-test-runner resolves this
  // module for the unit tests and its alias mapping does not reach transitive
  // imports the way webpack's does.
} from './acme-invoice-utils.js';

/**
 * Row shaping for the quick-search overlay (Cmd-K / Ctrl-K).
 *
 * Pure register: input to output, no framework, independently testable —
 * same contract as buildInvoiceRows / customersTable$GetRows, which these
 * deliberately mirror rather than reuse: the overlay row is a different shape
 * (one flat option row per record, a status toggle but no delete button, the
 * whole row is the edit affordance) and bending buildInvoiceRows around both
 * consumers would couple the table's markup to the overlay's.
 *
 * MATCHING is not here. The overlay searches with the same filterInvoices /
 * filterCustomers every other search in the app uses (SQL parity — see
 * acme-invoice-utils.js), executed by CHANNEL_ACME_QUICKSEARCH. These builders
 * only shape what the rows display.
 */

/**
 * One overlay option row per customer.
 *
 * `attrQuery` is the search term the row applies when activated: navigating to
 * a customer means landing on /dashboard/invoices?query=<name>, because the
 * invoices ILIKE filter matches customers.name — the same rule a hand-typed
 * search follows, so the resulting page is indistinguishable from one the user
 * filtered themselves.
 *
 * The seed stores `/customers/<name>.png`; the `imgs` prefix resolves against
 * IMG_PATH, as everywhere else.
 */
export const buildQuickSearchCustomerRows = (customers = []) =>
  customers.map((customer) => ({
    attrCustomerId: customer.id,
    name: customer.name,
    email: customer.email,
    invoicesLabel:
      customer.total_invoices !== undefined
        ? `${customer.total_invoices} invoices`
        : '',
    attrQuery: customer.name,
    // A real, correctly-encoded deeplink; activation is SPA-routed with the
    // default prevented, but middle-click / copy-link still do the right thing.
    attrHref: `/dashboard/invoices?${new URLSearchParams({ query: customer.name })}`,
    attrImageSrc: 'imgs' + customer.image_url,
    attrImageAlt: `${customer.name}'s profile picture`,
  }));

/**
 * One overlay option row per invoice.
 *
 * Exactly one of `isPaid` / `isPending` is present as an object section, the
 * shape InvoicesItemView's template already renders — and the icons ride every
 * row for the measured reason documented on buildInvoiceRows: outer-scope keys
 * do not reach inside a template section. A row copies POINTERS to four
 * strings, not the strings.
 *
 * `attrEditHref` is a real href so the row is a genuine link to the edit page;
 * activation is broadcast through the channel (the same path as the table's
 * pencil anchor), with the default prevented at the results container.
 */
export const buildQuickSearchInvoiceRows = (invoices = [], icons = {}) =>
  invoices.map((invoice) => {
    const isPaid = invoice.status === 'paid';

    return {
      attrInvoiceId: invoice.id,
      name: invoice.name,
      email: invoice.email,
      amount: formatInvoiceAmount(invoice.amount),
      date: formatInvoiceDate(invoice.date),
      attrEditHref: `/dashboard/invoices/${invoice.id}/edit`,
      attrImageSrc: 'imgs' + invoice.image_url,
      attrImageAlt: `${invoice.name}'s profile picture`,
      attrStatusClass: getInvoiceStatusClass(isPaid ? 'paid' : 'pending'),
      svgPencil: icons.svgPencil,
      ...(isPaid
        ? { isPaid: { label: 'Paid', svgCheck: icons.svgCheck } }
        : { isPending: { label: 'Pending', svgClock: icons.svgClock } }),
    };
  });

/**
 * A status-INSENSITIVE identity signature over the dump's two collections.
 *
 * The overlay pre-renders every row once per dump and repaints status pills in
 * place from STATUS_EVENT — so a refresh whose only difference is statuses
 * (the optimistic apply and the authoritative confirm of a toggle) must not
 * tear the rendered list down mid-interaction. A create, edit or delete
 * changes this string and forces a rebuild.
 *
 * date is sliced to 10 chars for the same reason filterInvoices slices it:
 * the JSON carries a time part the comparison should not depend on.
 */
export const quickSearchDataSignature = (invoices = [], customers = []) => {
  const invoicePart = invoices
    .map(
      (i) =>
        `${i.id}|${i.name}|${i.email}|${i.amount}|${String(i.date).slice(0, 10)}`,
    )
    .join('~');
  const customerPart = customers
    .map((c) => `${c.id}|${c.name}|${c.email}`)
    .join('~');

  return `${invoicePart}::${customerPart}`;
};
