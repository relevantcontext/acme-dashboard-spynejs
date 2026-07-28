// Node API tier for the SpyneJS side of the Acme comparison.
//
// Launched alongside webpack by `npm start` (concurrently --kill-others), and
// reached by the browser through the dev server's /api proxy — so the page sees
// a single HTTPS origin. That means no mixed-content block and no CORS layer to
// build or maintain, unlike a second directly-addressed origin.
//
// Binds 127.0.0.1 only — never 0.0.0.0.

import express from 'express';

import { HOST, PORT } from './config.js';
import { buildRouter } from './routes.js';

const app = express();

app.use(express.json({ limit: '1mb' }));

app.use('/api', buildRouter());

// Centralized error handler. Database errors are logged in full server-side but
// never returned to the browser — an error body could otherwise leak schema
// details or the connection string.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(`[api] ${err.stack || err.message}`);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(PORT, HOST, () => {
  console.info(`[api] acme api tier on http://${HOST}:${PORT}/api`);
});
