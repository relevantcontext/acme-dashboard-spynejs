import { buildAcmeSearch } from 'utils/acme-query-utils.js';

/**
 * The client-side equivalent of fetchFilteredInvoices / fetchInvoicesPages.
 *
 * The SpyneJS app holds every invoice and filters the collection in the browser;
 * the Next.js app re-queries Postgres on every keystroke. These functions keep
 * the matching semantics aligned with the SQL rather than doing something
 * merely reasonable.
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
 * Reads the invoice search term off a query string.
 *
 * The channel never holds it. window.location is the state, so this runs on
 * every params event and the answer is always current — there is no cached copy
 * to fall out of step, and a deeplink is indistinguishable from an edit, which
 * is the point of the loop.
 */
export const readInvoiceParams = (search = '') => {
  const params = new URLSearchParams(search);

  return {
    query: params.get('query') || '',
  };
};

/**
 * The inverse of readInvoiceParams: merges an update into the current query
 * string and returns the new one.
 *
 * Merging rather than replacing leaves unrelated URL parameters intact. An
 * empty value DELETES its key, matching search.tsx, which
 * does `if (term) params.set('query', term) else params.delete('query')` so a
 * cleared search box leaves no `?query=` behind.
 *
 * Returns the search string without its leading `?` — URLSearchParams.toString
 * form — because an empty result must produce a bare path rather than a
 * trailing `?`.
 */
export const buildInvoiceSearch = buildAcmeSearch;

/**
 * The custom window event that closes the params loop.
 *
 * history.replaceState and pushState fire nothing — verified, zero popstate
 * events for either — so the view that writes the URL announces the write
 * itself. Every consumer derives from this one string: index.js registers it in
 * config.channels.WINDOW.customEvents, the null view dispatches it, and the
 * channel derives its action label from it the way the framework does
 * (`CHANNEL_WINDOW_${name.toUpperCase()}_EVENT`). Three copies of the literal
 * would be three chances for the loop to open silently.
 */
export const INVOICE_PARAMS_EVENT = 'acme_invoices_params_changed';

/**
 * formatCurrency and formatDateToLocal from the Next.js app's lib/utils.ts.
 *
 * The source builds a new Intl formatter on every call — `toLocaleString` does
 * so internally, and formatDateToLocal constructs an Intl.DateTimeFormat per
 * invoice. Constructing an Intl formatter is the expensive part; formatting
 * with one is cheap. Both are hoisted to module scope here and reused across
 * every row, which is the whole difference at list scale. Output is identical.
 */
const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// Amounts are stored in CENTS — see filterInvoices.
export const formatInvoiceAmount = (amount) =>
  CURRENCY_FORMATTER.format(Number(amount) / 100);

export const formatInvoiceDate = (dateStr) =>
  DATE_FORMATTER.format(new Date(dateStr));

const STATUS_PILL_BASE =
  'inline-flex items-center rounded-full px-2 py-1 text-xs';

const STATUS_PILL_VARIANT = {
  pending: 'bg-gray-100 text-gray-500',
  paid: 'bg-green-500 text-white',
};

/**
 * The status pill's classes, resolved from the status.
 *
 * Exported because the pill now has two renderers — InvoicesStatusView for a
 * single pill, and the bulk row template for a whole table — and a table whose
 * pills drift from the component's pills would read as a bug in one of them.
 */
export const getInvoiceStatusClass = (status) =>
  `${STATUS_PILL_BASE} ${STATUS_PILL_VARIANT[status] ?? STATUS_PILL_VARIANT.pending}`;

/**
 * Shapes raw invoice records into what the bulk row template renders.
 *
 * Every decision is made here and the template iterates a finished array: the
 * image path, the alt text, both formatted values, the pill classes, and the
 * status branch as an object section — exactly one of `isPaid` / `isPending` is
 * present, so the template needs no conditional syntax it does not have.
 * [shape-data-for-logicless-template] [conditional-via-object-section]
 *
 * Keys landing in attributes carry the `attr` prefix.
 * [attr-prefix-for-attribute-placeholders]
 *
 * The seed stores `/customers/<name>.png`, which Next.js resolves against
 * public/. This app has no public root, so the path is prefixed with `imgs` —
 * the convention that resolves against IMG_PATH.
 *
 * ── Why the icons ride every row ────────────────────────────────────────────
 *
 * They were first passed once at the ROOT of the template data, on the reading
 * that outer-scope properties stay reachable inside a section. Measured here:
 * they do not — every `{{svg*}}` inside `{{#invoices}}` rendered EMPTY while
 * every per-row key rendered correctly, and the status icons nested one level
 * deeper failed the same way. So each row carries its own reference.
 *
 * That costs nothing that matters: `icons` holds four strings built once by the
 * caller, and a row copies POINTERS to them, not the strings. The status icon
 * sits inside the isPaid/isPending object because that object is the scope the
 * section renders in — the shape InvoicesStatusView already uses.
 */
export const buildInvoiceRows = (invoices = [], icons = {}) =>
  invoices.map((invoice) => {
    const isPaid = invoice.status === 'paid';

    return {
      name: invoice.name,
      email: invoice.email,
      amount: formatInvoiceAmount(invoice.amount),
      date: formatInvoiceDate(invoice.date),
      attrImageSrc: 'imgs' + invoice.image_url,
      attrImageAlt: `${invoice.name}'s profile picture`,
      attrInvoiceId: invoice.id,
      attrEditHref: `/dashboard/invoices/${invoice.id}/edit`,
      attrStatusClass: getInvoiceStatusClass(isPaid ? 'paid' : 'pending'),
      svgPencil: icons.svgPencil,
      svgTrash: icons.svgTrash,
      ...(isPaid
        ? { isPaid: { label: 'Paid', svgCheck: icons.svgCheck } }
        : { isPending: { label: 'Pending', svgClock: icons.svgClock } }),
    };
  });
