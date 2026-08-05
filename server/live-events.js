// SpyneJS-side addition (no Next.js counterpart) — the live payment simulator.
//
// One tick = "what just happened in the world": usually an outstanding invoice
// gets paid, occasionally a new invoice arrives. Every event is REAL — an
// UPDATE or INSERT committed to Postgres before the response is built — so a
// reload shows exactly the state the events produced.
//
// ── Why generation is lazy (per request) rather than a server-side timer ─────
//
// The deployed API is a Lambda Function URL (template.yaml): there is no
// long-running process to host a setInterval, and a container may be frozen or
// discarded between invocations. Generating events inside the poll request is
// the one shape that behaves identically on the local Express server and on
// Lambda — the client's poll cadence IS the simulation clock, and the stream
// stops the moment the client stops asking (sign-out, tab closed), with no
// server-side state to leak.
//
// The response carries the events plus the full joined row for every touched
// invoice — the same row shape fetchAllInvoices returns — so the client can
// patch its held dump without a second round trip and without restating the
// join client-side.

import { randomUUID } from 'node:crypto';

import { sql } from './db.js';

// Per-tick odds, tuned against the client's poll cadence (~2.5s): a payment
// lands every few seconds, a new invoice roughly every fourth tick.
const PAY_PROBABILITY = 0.8;
const CREATE_PROBABILITY = 0.25;

// New-invoice amounts, in CENTS — invoices.amount is stored in cents
// throughout (see queries.js).
const MIN_AMOUNT_CENTS = 5_000;
const MAX_AMOUNT_CENTS = 250_000;

/**
 * One invoice, joined exactly as fetchAllInvoices joins it, so the client can
 * splice the row into its held collection and every field a surface reads
 * (name, email, image_url for rendering; amount/date/status for filtering and
 * sorting) is already present.
 */
async function fetchInvoiceRow(id) {
  const rows = await sql`
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
      WHERE invoices.id = ${id}
    `;

  return rows[0] ?? null;
}

/**
 * Performs this tick's events against the database and reports them.
 *
 * The pay pick-and-update is a single statement, so two concurrent ticks (two
 * tabs) cannot pay the same invoice twice — the subquery and the UPDATE
 * resolve atomically and the second tick simply picks another pending row.
 *
 * @returns {Promise<{events: Array, invoices: Array}>}
 *   events    what happened: { id, type: 'invoice-paid'|'invoice-created',
 *             invoiceId, at } — id is the event's own identity, minted here so
 *             the client can dedupe across replays.
 *   invoices  the full joined row for every invoiceId named in events.
 */
export async function performLiveTick() {
  const events = [];
  const invoices = [];

  const recordEvent = async (type, invoiceId) => {
    const row = await fetchInvoiceRow(invoiceId);

    if (row === null) return;

    invoices.push(row);
    events.push({
      id: randomUUID(),
      type,
      invoiceId: row.id,
      at: new Date().toISOString(),
    });
  };

  if (Math.random() < PAY_PROBABILITY) {
    const paid = await sql`
        UPDATE invoices
        SET status = 'paid'
        WHERE id = (
          SELECT id FROM invoices WHERE status = 'pending'
          ORDER BY random() LIMIT 1
        )
        RETURNING id
      `;

    // No row means no invoice was pending — a legitimately quiet tick.
    if (paid.length > 0) await recordEvent('invoice-paid', paid[0].id);
  }

  if (Math.random() < CREATE_PROBABILITY) {
    // Same value conventions as createInvoice: cents, and a date-only string.
    const amountInCents =
      MIN_AMOUNT_CENTS +
      Math.floor(Math.random() * (MAX_AMOUNT_CENTS - MIN_AMOUNT_CENTS));
    const date = new Date().toISOString().split('T')[0];

    const created = await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (
          (SELECT id FROM customers ORDER BY random() LIMIT 1),
          ${amountInCents}, 'pending', ${date}
        )
        RETURNING id
      `;

    if (created.length > 0) await recordEvent('invoice-created', created[0].id);
  }

  return { events, invoices };
}
