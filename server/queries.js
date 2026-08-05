// Ported VERBATIM from the Next.js app's app/lib/data.ts.
//
// The SQL, the pagination constant, the result shapes and the cents->dollars /
// currency-formatting conversions are all identical by design. If the two sides
// diverged here, any difference the comparison surfaced could be blamed on a
// better or worse data layer rather than on architecture — which would make the
// whole exercise meaningless.
//
// Rule for this file: do not "improve" a query. If something looks wrong, it
// almost certainly matches upstream on purpose. Raise it instead of fixing it.

import { sql, formatCurrency } from './db.js';

// data.ts line 90 — same constant, same value.
const ITEMS_PER_PAGE = 6;

export async function fetchRevenue() {
  // NOTE: no ORDER BY, exactly as upstream. Postgres therefore returns rows in
  // arbitrary physical order, and the chart's month order changes after a
  // truncate+reseed — on both sides, independently.
  //
  // Ratified as a known limitation rather than fixed: faithfulness to the
  // reference implementation outranks cosmetic stability, and how sorting gets
  // solved is itself material for the comparison as both apps evolve.
  return sql`SELECT * FROM revenue`;
}

export async function fetchLatestInvoices() {
  const data = await sql`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC, invoices.id DESC
      LIMIT 5`;

  return data.map((invoice) => ({
    ...invoice,
    amount: formatCurrency(invoice.amount),
  }));
}

export async function fetchCardData() {
  // Upstream splits these deliberately to demonstrate parallel queries; kept
  // split so the two sides issue the same three statements.
  const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
  const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
  const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

  const data = await Promise.all([
    invoiceCountPromise,
    customerCountPromise,
    invoiceStatusPromise,
  ]);

  // Matches the corrected Next.js side (commit f6d51e2): the COUNT column lives
  // on the first row, so it is data[n][0].count. Upstream read data[n].count,
  // which is the postgres.js Result's own row count and always 1.
  const numberOfInvoices = Number(data[0][0].count ?? '0');
  const numberOfCustomers = Number(data[1][0].count ?? '0');
  const totalPaidInvoices = formatCurrency(data[2][0].paid ?? '0');
  const totalPendingInvoices = formatCurrency(data[2][0].pending ?? '0');

  return {
    numberOfCustomers,
    numberOfInvoices,
    totalPaidInvoices,
    totalPendingInvoices,
  };
}

/**
 * Every invoice, unfiltered and unpaginated, ordered exactly as
 * fetchFilteredInvoices orders its page.
 *
 * The SpyneJS client holds the whole set and filters and pages it in the
 * browser, so /api/bootstrap ships this rather than page one. The Next.js app
 * keeps using fetchFilteredInvoices below — it re-queries per keystroke and per
 * page click, which is the behaviour the two apps are being compared on.
 *
 * ORDER BY is duplicated deliberately rather than sorted client-side: it is what
 * makes "page 1" mean the same rows on both sides.
 */
export async function fetchAllInvoices() {
  return sql`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC, invoices.id DESC
    `;
}

export async function fetchFilteredInvoices(query, currentPage) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  return sql`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC, invoices.id DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;
}

export async function fetchInvoicesPages(query) {
  const data = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

  // data[0] is the first ROW here (not a Result, as in fetchCardData), so
  // data[0].count is the COUNT column and is correct as written upstream.
  return Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE);
}

export async function fetchInvoiceById(id) {
  const data = await sql`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

  const invoice = data.map((invoice) => ({
    ...invoice,
    // Convert amount from cents to dollars
    amount: invoice.amount / 100,
  }));

  return invoice[0];
}

export async function fetchCustomers() {
  return sql`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;
}

export async function fetchFilteredCustomers(query) {
  const data = await sql`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

  return data.map((customer) => ({
    ...customer,
    total_pending: formatCurrency(customer.total_pending),
    total_paid: formatCurrency(customer.total_paid),
  }));
}

// ── Mutations — ported verbatim from app/lib/actions.ts ──────────────────────
// The Next.js versions additionally call revalidatePath() and redirect(); those
// are Next-specific cache/navigation concerns with no database effect, so they
// are the SpyneJS side's own responsibility and are not represented here.

export async function createInvoice({ customerId, amount, status }) {
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
}

export async function updateInvoice(id, { customerId, amount, status }) {
  const amountInCents = amount * 100;

  await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
}

export async function deleteInvoice(id) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
}

// ── SpyneJS-side addition (no Next.js counterpart) ───────────────────────────
// The inline status toggle updates ONE column. Reusing updateInvoice would
// force the client to resend amount and customer_id it has no business
// restating, so the toggle gets its own single-column write.

export async function updateInvoiceStatus(id, status) {
  await sql`
      UPDATE invoices
      SET status = ${status}
      WHERE id = ${id}
    `;
}

// ── SpyneJS-side addition (no Next.js counterpart) ───────────────────────────
// The bulk-edit table's Save All. One transaction, one UPDATE per edited
// invoice, writing ONLY the fields that invoice's edit named — COALESCE keeps
// an untouched column at its current value, so a concurrent external change to
// a column the user did not edit is never overwritten by a stale restatement.

export async function updateInvoicesBatch(updates) {
  await sql.begin(async (tx) => {
    for (const { id, amountInCents, date, status } of updates) {
      await tx`
          UPDATE invoices
          SET amount = COALESCE(${amountInCents ?? null}, amount),
              date   = COALESCE(${date ?? null}, date),
              status = COALESCE(${status ?? null}, status)
          WHERE id = ${id}
        `;
    }
  });
}
