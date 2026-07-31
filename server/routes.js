// Transport only. Every handler is a thin wrapper over queries.js — no business
// logic lives here that the Next.js side does not also have.

import { Router } from 'express';

import * as q from './queries.js';
import { parseCreateInvoice, parseUpdateInvoice } from './validation.js';
import {
  verifyCredentials,
  issueSession,
  clearSession,
  readSession,
  requireAuth,
} from './auth.js';

// Wraps an async handler so a rejection reaches the central error handler
// instead of hanging the request.
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

export function buildRouter() {
  const router = Router();

  // ── Public ────────────────────────────────────────────────────────────────

  router.get(
    '/health',
    h(async (_req, res) => {
      // Proves the whole path: browser -> dev server -> proxy -> this tier ->
      // Postgres over TLS. Cheap enough to poll. Left unauthenticated so it
      // stays usable as a liveness probe.
      const [row] = await q.fetchCustomers();
      res.json({ ok: true, db: row ? 'connected' : 'empty' });
    }),
  );

  router.post(
    '/auth/login',
    h(async (req, res) => {
      const user = await verifyCredentials(req.body ?? {});

      if (!user) {
        // Single message for every rejection path — bad email format, unknown
        // user, wrong password. auth.ts behaves the same way, and the string
        // matches what actions.ts `authenticate` returns to the Next.js form.
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      issueSession(res, user);
      res.json({ user: { id: user.id, name: user.name, email: user.email } });
    }),
  );

  router.post('/auth/logout', (_req, res) => {
    clearSession(res);
    res.json({ message: 'Signed out.' });
  });

  router.get('/auth/session', (req, res) => {
    const session = readSession(req);
    if (!session) return res.json({ user: null });
    const { id, name, email } = session;
    res.json({ user: { id, name, email } });
  });

  // ── Everything below requires a session ──────────────────────────────────
  //
  // Equivalent to the authorized() callback gating /dashboard in the Next.js
  // app. There the data functions are reachable only through protected pages;
  // here the data is the surface, so the guard sits on the endpoints.
  router.use(requireAuth);

  // Every read the SpyneJS client needs, in one response.
  //
  // The Next.js app fetches per page, because each page is a server component
  // that re-runs its own queries on navigation. The SpyneJS client is a single
  // long-lived page: it loads once on authentication, is held by
  // ChannelAcmeData, and re-requested only when a mutation invalidates it.
  // That makes one round trip the honest shape rather than six.
  //
  // The individual endpoints below are all still here and still correct — this
  // composes them, it does not replace them.
  router.get(
    '/bootstrap',
    h(async (_req, res) => {
      const [
        cards,
        revenue,
        latestInvoices,
        invoices,
        totalPages,
        customers,
        customerOptions,
      ] = await Promise.all([
        q.fetchCardData(),
        q.fetchRevenue(),
        q.fetchLatestInvoices(),
        q.fetchAllInvoices(),
        q.fetchInvoicesPages(''),
        q.fetchFilteredCustomers(''),
        q.fetchCustomers(),
      ]);

      res.json({
        cards,
        revenue,
        latestInvoices,
        // Every invoice. The client pages and filters this set itself.
        invoices,
        totalPages,
        customers,
        customerOptions,
      });
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
