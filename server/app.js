// Long-running entry point for the API tier — local dev and any container host.
// Launched alongside webpack by `npm start` (concurrently --kill-others), and
// reached by the browser through the dev server's /api proxy, so the page sees a
// single origin. That means no CORS layer to build or maintain, unlike a second
// directly-addressed origin.
// Binds 127.0.0.1 only — never 0.0.0.0.
// The app itself is built in create-app.js and is host-agnostic; this file adds
// only the listen.

import { createApp } from './create-app.js';
import { HOST, PORT } from './config.js';

createApp().listen(PORT, HOST, () => {
  console.info(`[api] acme api tier on http://${HOST}:${PORT}/api`);
});
