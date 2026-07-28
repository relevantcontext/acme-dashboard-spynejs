import postgres from 'postgres';

import { POSTGRES_URL } from './config.js';

// Identical to every connection the Next.js app opens:
//   postgres(process.env.POSTGRES_URL!, { ssl: 'require' })
//
// `'require'` mandates TLS but does not verify the certificate, which is what
// lets the same line work against the self-signed local container and against
// Neon with no environment conditional on either side.
export const sql = postgres(POSTGRES_URL, { ssl: 'require' });

// Ported verbatim from app/lib/utils.ts so currency strings are byte-identical
// on both sides. Any drift here would show up as a formatting difference and be
// misread as a rendering difference.
export const formatCurrency = (amount) =>
  (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
