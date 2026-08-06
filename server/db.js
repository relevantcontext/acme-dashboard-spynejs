import postgres from 'postgres';

import { POSTGRES_URL, PG_POOL_MAX, PG_IDLE_TIMEOUT } from './config.js';

// Identical to every connection the Next.js app opens:
//   postgres(process.env.POSTGRES_URL!, { ssl: 'require' })
// `'require'` mandates TLS but does not verify the certificate, which is what
// lets the same line work against the self-signed local container and against
// Neon with no environment conditional on either side.
// ── Why the pool is sized from the environment ──────────────────────────────
// This module runs in two shapes. As a long-running server it wants a pool: one
// process serving many requests, reusing connections. As a Lambda it wants the
// opposite — each container serves ONE request at a time, so a pool of more than
// one connection is a connection held open for nothing, and concurrent cold
// starts multiply that until Neon refuses new connections.
// The values are read rather than branched on, so there is still no `if
// (isLambda)` anywhere in the connection code — the host states its own shape
// and this file stays the same file. template.yaml sets PG_POOL_MAX=1.
export const sql = postgres(POSTGRES_URL, {
  ssl: 'require',
  max: PG_POOL_MAX,
  idle_timeout: PG_IDLE_TIMEOUT,
});

// Ported verbatim from app/lib/utils.ts so currency strings are byte-identical
// on both sides. Any drift here would show up as a formatting difference and be
// misread as a rendering difference.
export const formatCurrency = (amount) =>
  (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
