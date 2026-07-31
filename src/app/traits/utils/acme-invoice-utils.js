/**
 * The client-side equivalent of fetchFilteredInvoices / fetchInvoicesPages.
 *
 * The SpyneJS app holds every invoice and resolves a page in the browser; the
 * Next.js app re-queries Postgres on every keystroke and every page click. These
 * functions are what make the two agree on what a search matches and what "page
 * 2" contains — so they reproduce the SQL rather than doing something merely
 * reasonable.
 *
 * Pure register: input to output, no framework, independently testable.
 * [author-in-correct-register]
 */

// Matches ITEMS_PER_PAGE in server/queries.js and the Next.js app's data.ts.
export const ITEMS_PER_PAGE = 6;

/**
 * Reproduces the WHERE clause:
 *
 *   customers.name    ILIKE %query%  OR
 *   customers.email   ILIKE %query%  OR
 *   invoices.amount::text ILIKE %query%  OR
 *   invoices.date::text   ILIKE %query%  OR
 *   invoices.status   ILIKE %query%
 *
 * Two casts had to be checked against the database rather than guessed, because
 * the JSON shape differs from the SQL cast:
 *
 *   amount::text -> "44800"      amount is stored in CENTS, so a search for
 *                                "448" matches $448.00 and a search for "4.48"
 *                                matches nothing. Same on both sides.
 *   date::text   -> "2023-09-10" no time part, whereas the JSON carries
 *                                "2023-09-10T00:00:00.000Z". Slicing to 10
 *                                chars is what keeps a "2023-09" search
 *                                matching the same rows in both apps.
 *
 * ILIKE is case-insensitive substring; an empty query matches everything, since
 * `%%` matches any non-null value.
 */
export const filterInvoices = (invoices = [], query = '') => {
  const q = String(query).trim().toLowerCase();

  if (q === '') return invoices;

  return invoices.filter((invoice) =>
    [
      invoice.name,
      invoice.email,
      String(invoice.amount),
      String(invoice.date).slice(0, 10),
      invoice.status,
    ].some((field) => String(field).toLowerCase().includes(q)),
  );
};

/**
 * LIMIT/OFFSET. The set is already ordered by date DESC — the server sorts it
 * once in SQL rather than the client re-sorting, so "page 1" means the same rows
 * on both sides without duplicating a comparator.
 */
export const paginateInvoices = (invoices = [], page = 1) => {
  const offset = (Math.max(1, page) - 1) * ITEMS_PER_PAGE;
  return invoices.slice(offset, offset + ITEMS_PER_PAGE);
};

/**
 * Matches fetchInvoicesPages: the count is of the FILTERED set, so the page
 * count shrinks as a search narrows.
 */
export const getTotalPages = (filteredCount = 0) =>
  Math.ceil(filteredCount / ITEMS_PER_PAGE);

/**
 * Verbatim port of generatePagination from the Next.js app's lib/utils.ts.
 *
 * Kept identical rather than improved: the two apps render the same control, so
 * a different ellipsis rule would show as a different pager and read as a bug in
 * one of them. If this changes, change both.
 */
export const generatePagination = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages - 1, totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 2, '...', totalPages - 2, totalPages - 1, totalPages];
  }

  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    totalPages,
  ];
};

/**
 * Reads the two params off a query string.
 *
 * The channel never holds these. window.location is the state, so this runs on
 * every params event and the answer is always current — there is no cached copy
 * to fall out of step, and a deeplink is indistinguishable from an edit, which
 * is the point of the loop.
 */
export const readInvoiceParams = (search = '') => {
  const params = new URLSearchParams(search);
  const page = Number(params.get('page'));

  return {
    query: params.get('query') || '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
};
