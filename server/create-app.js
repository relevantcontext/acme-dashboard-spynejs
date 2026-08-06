// Builds the Express app. Host-agnostic on purpose — nothing here binds a port,
// reads a platform global, or assumes a long-running process.
//
// Every host gets the same app and supplies its own entry point:
//
//   server/app.js      createApp().listen()        container, local dev
//   api/[...all].js    export default createApp()  Vercel Functions
//   (Firebase)         onRequest(createApp())      Cloud Functions
//   (AWS)              serverless-http wrapper     Lambda behind API Gateway
//
// That is the whole per-host delta. The routes, queries, validation and auth
// below it are identical everywhere, which is the point: the SpyneJS side is not
// tethered to a platform, and the API tier needs only a thin adapter rather than
// a fork.

import express from 'express';
import cookieParser from 'cookie-parser';

import { AUTH_SECRET } from './config.js';
import { buildRouter } from './routes.js';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  // Signs and verifies the session cookie. A cookie whose HMAC does not verify
  // is dropped by cookie-parser rather than surfaced, so a forged session never
  // reaches route code as a value.
  app.use(cookieParser(AUTH_SECRET));

  app.use('/api', buildRouter());

  // Centralized error handler. Database errors are logged in full server-side
  // but never returned to the browser — an error body could otherwise leak
  // schema details or the connection string.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(`[api] ${err.stack || err.message}`);
    res.status(500).json({ message: 'Internal server error.' });
  });

  return app;
}
