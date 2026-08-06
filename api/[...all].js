// Vercel Functions entry point for the API tier.
//
// An Express app is already a (req, res) handler, so exporting the instance is
// the whole adapter. Vercel routes everything under /api to this file, and the
// app's own `app.use('/api', ...)` mount then matches the incoming path.
//
// Inert until a vercel.json exists — it is committed alongside the other entry
// points so the per-host delta is visible in one place rather than discovered at
// deploy time.
//
// Note for when this is wired up: on a serverless host, postgres.js opens a
// connection per cold invocation. Point POSTGRES_URL at Neon's `-pooler`
// endpoint there, or connections will be exhausted under any real traffic.

import { createApp } from '../server/create-app.js';

export default createApp();
