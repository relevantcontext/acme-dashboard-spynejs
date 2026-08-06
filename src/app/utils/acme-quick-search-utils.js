import {
  filterInvoices,
  formatInvoiceAmount,
  formatInvoiceDate,
  getInvoiceStatusClass,
} from 'utils/acme-invoice-utils.js';
import { filterCustomers } from 'utils/acme-utils.js';

/**
 * The quick-search overlay's match set, shaped for its results template.
 *
 * Pure register: input to output, no framework, independently testable — the
 * same discipline as acme-invoice-utils.js, and for the same reason. Matching
 * REUSES the two domain filters rather than approximating them: a query that
 * finds an invoice here finds the same invoice on /dashboard/invoices, because
 * it runs through the identical ILIKE-parity predicate (filterInvoices), and a
 * customer match is exactly a filterCustomers match. When the overlay and a
 * list page disagree about what a query matches, that is a bug in one of them
 * — sharing the predicate makes the disagreement impossible.
 *
 * ── Empty query is "nothing", not "everything" ──────────────────────────────
 *
 * filterInvoices treats '' as match-all (SQL `%%` parity), which is right for
 * a list page and wrong for a palette: an idle overlay should invite typing,
 * not dump 5,000 rows. The empty case is decided HERE, before the filters run.
 *
 * ── The template shape ──────────────────────────────────────────────────────
 *
 * Everything is a TOP-LEVEL section — headers, row arrays, empty states — so
 * the template never nests a section inside a section. DomElementTemplate
 * supports exactly one level of nested loops; keeping the shape flat spends
 * none of that budget, which is why the status pill arrives as a finished
 * `statusLabel` string rather than the isPaid/isPending section objects
 * buildInvoiceRows uses.
 *
 * `qsIndex` runs SEQUENTIALLY across both groups — customers first, then
 * invoices — and `flatRows` carries the activation fact for each index in the
 * same order. The index is the contract between the rendered DOM (each row's
 * data-qs-index) and the channel's highlight state; the two are built in one
 * pass so they cannot disagree.
 *
 * `icons` arrives from the caller (same convention as buildInvoiceRows /
 * buildDashboardCards): it keeps this module import-free of .svg assets and
 * therefore loadable by the test runner. Icon strings are INTERPOLATED into
 * rows, never sectioned, so they render at any depth.
 *
 * @param {Array} customers  the dump's customers slice
 * @param {Array} invoices   the dump's invoices slice
 * @param {String} query     the overlay's current search term
 * @param {Object} [icons]   {statusPaid, statusPending, pencil} svg strings
 * @returns {Object} template-ready groups plus the flat activation list
 */
export const buildQuickSearchResults = (
  customers = [],
  invoices = [],
  query = '',
  icons = {},
) => {
  const q = String(query).trim();

  if (q === '') {
    return {
      query: q,
      customersHeader: null,
      customerRows: [],
      invoicesHeader: null,
      invoiceRows: [],
      noResults: null,
      emptyPrompt: {
        message: 'Search customers and invoices by typing above.',
      },
      flatRows: [],
      totalMatched: 0,
    };
  }

  const matchedCustomers = filterCustomers(customers, q);
  const matchedInvoices = filterInvoices(invoices, q);

  let qsIndex = 0;

  const customerRows = matchedCustomers.map((customer) => ({
    qsIndex: qsIndex++,
    attrCustomerId: String(customer.id),
    name: customer.name,
    email: customer.email,
    attrImageSrc: 'imgs' + customer.image_url,
    attrImageAlt: `${customer.name}'s profile picture`,
    totalInvoices: customer.total_invoices,
    // Affordance only — activation is resolved through the channel, which
    // routes and then writes the query param. The href documents the intent.
    attrHref: `/dashboard/invoices?query=${encodeURIComponent(customer.name)}`,
  }));

  const invoiceRows = matchedInvoices.map((invoice) => {
    const isPaid = invoice.status === 'paid';

    return {
      qsIndex: qsIndex++,
      attrInvoiceId: String(invoice.id),
      name: invoice.name,
      email: invoice.email,
      amount: formatInvoiceAmount(invoice.amount),
      date: formatInvoiceDate(invoice.date),
      attrImageSrc: 'imgs' + invoice.image_url,
      attrImageAlt: `${invoice.name}'s profile picture`,
      attrEditHref: `/dashboard/invoices/${invoice.id}/edit`,
      attrStatusClass: getInvoiceStatusClass(invoice.status),
      statusLabel: isPaid ? 'Paid' : 'Pending',
      statusIcon: isPaid ? icons.statusPaid || '' : icons.statusPending || '',
      svgPencil: icons.pencil || '',
    };
  });

  // The activation list, index-aligned with the rendered rows. Only what an
  // activation needs rides here — the channel dispatches on `kind`.
  const flatRows = [
    ...matchedCustomers.map((customer) => ({
      kind: 'customer',
      customerId: String(customer.id),
      customerName: customer.name,
    })),
    ...matchedInvoices.map((invoice) => ({
      kind: 'invoice',
      invoiceId: String(invoice.id),
    })),
  ];

  return {
    query: q,
    customersHeader:
      customerRows.length > 0
        ? { label: 'Customers', count: customerRows.length }
        : null,
    customerRows,
    invoicesHeader:
      invoiceRows.length > 0
        ? { label: 'Invoices', count: invoiceRows.length }
        : null,
    invoiceRows,
    noResults:
      flatRows.length === 0
        ? { message: `No customers or invoices match “${q}”.` }
        : null,
    emptyPrompt: null,
    flatRows,
    totalMatched: flatRows.length,
  };
};

/**
 * Clamps a highlight index onto a result list of `total` rows. -1 means
 * "nothing to highlight" (an empty list); otherwise the index survives a
 * recompute by clamping rather than resetting, so a data refresh under an
 * open overlay does not yank the highlight back to the top.
 */
export const clampHighlightIndex = (index, total) => {
  if (total <= 0) return -1;
  const n = Number.isFinite(Number(index)) ? Number(index) : 0;
  return Math.max(0, Math.min(Math.floor(n), total - 1));
};
