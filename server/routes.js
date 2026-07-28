// Transport only. Every handler is a thin wrapper over queries.js — no business
// logic lives here that the Next.js side does not also have.

import { Router } from 'express';

import * as q from './queries.js';
import { parseCreateInvoice, parseUpdateInvoice } from './validation.js';

// Wraps an async handler so a rejection reaches the central error handler
// instead of hanging the request.
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

export function buildRouter() {
  const router = Router();

  router.get(
    '/health',
    h(async (_req, res) => {
      // Proves the whole path: browser -> https dev server -> proxy -> this
      // tier -> Postgres over TLS. Cheap enough to poll.
      const [row] = await q.fetchCustomers();
      res.json({ ok: true, db: row ? 'connected' : 'empty' });
    }),
  );

  router.get(
    '/revenue',
    h(async (_req, res) => res.json(await q.fetchRevenue())),
  );

  router.get(
    '/cards',
    h(async (_req, res) => res.json(await q.fetchCardData())),
  );

  // Static invoice sub-paths MUST be declared before '/invoices/:id', otherwise
  // Express matches 'latest' and 'pages' as an id and the query returns empty.
  router.get(
    '/invoices/latest',
    h(async (_req, res) => res.json(await q.fetchLatestInvoices())),
  );

  router.get(
    '/invoices/pages',
    h(async (req, res) => {
      const query = req.query.query ?? '';
      res.json({ totalPages: await q.fetchInvoicesPages(query) });
    }),
  );

  router.get(
    '/invoices/:id',
    h(async (req, res) => {
      const invoice = await q.fetchInvoiceById(req.params.id);
      if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
      res.json(invoice);
    }),
  );

  router.get(
    '/invoices',
    h(async (req, res) => {
      const query = req.query.query ?? '';
      const page = Number(req.query.page ?? 1) || 1;
      res.json(await q.fetchFilteredInvoices(query, page));
    }),
  );

  // id + name only, for the invoice form's customer dropdown (fetchCustomers).
  router.get(
    '/customers/select',
    h(async (_req, res) => res.json(await q.fetchCustomers())),
  );

  // The customers table (fetchFilteredCustomers).
  router.get(
    '/customers',
    h(async (req, res) => {
      const query = req.query.query ?? '';
      res.json(await q.fetchFilteredCustomers(query));
    }),
  );

  router.post(
    '/invoices',
    h(async (req, res) => {
      const parsed = parseCreateInvoice(req.body ?? {});
      if (parsed.errors) return res.status(400).json(parsed);

      try {
        await q.createInvoice(parsed.data);
      } catch {
        // Same message actions.ts returns for a failed insert.
        return res
          .status(500)
          .json({ message: 'Database Error: Failed to Create Invoice.' });
      }
      res.status(201).json({ message: 'Invoice created.' });
    }),
  );

  router.put(
    '/invoices/:id',
    h(async (req, res) => {
      const parsed = parseUpdateInvoice(req.body ?? {});
      if (parsed.errors) return res.status(400).json(parsed);

      try {
        await q.updateInvoice(req.params.id, parsed.data);
      } catch {
        return res
          .status(500)
          .json({ message: 'Database Error: Failed to Update Invoice.' });
      }
      res.json({ message: 'Invoice updated.' });
    }),
  );

  router.delete(
    '/invoices/:id',
    h(async (req, res) => {
      await q.deleteInvoice(req.params.id);
      res.json({ message: 'Invoice deleted.' });
    }),
  );

  return router;
}
