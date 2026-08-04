// Lambda entry point for the API tier.
//
// The counterpart to app.js: that file adds a listen, this one adds a handler.
// Both wrap the same createApp(), which binds no port and reads no platform
// global — so the routes, queries, validation and auth below are byte-identical
// on a container and on Lambda. That was the design in create-app.js from the
// start; this is it being cashed in.
//
// ── Why the app is built at module load ─────────────────────────────────────
//
// Everything above the handler runs once per container, not once per request:
// the Express app, the route table, and the postgres pool in db.js. A warm
// invocation therefore does no setup at all. A cold one pays for all of it once.
//
// It also means config.js throws during INIT rather than during a request when
// POSTGRES_URL or AUTH_SECRET is missing. That surfaces as
// Runtime.ImportModuleError in CloudWatch — less obvious than a 500 with a
// message, but it fails the whole container rather than serving a broken one,
// which is the correct trade for a missing secret.
//
// ── Binary responses ────────────────────────────────────────────────────────
//
// binary: false is deliberate. This tier returns JSON and nothing else — the
// static bundle is served by CloudFront from S3 and never reaches here — so
// base64-encoding every response body would be work done for no payload that
// needs it.

import serverlessExpress from 'serverless-http';

import { createApp } from './create-app.js';

export const handler = serverlessExpress(createApp(), { binary: false });
