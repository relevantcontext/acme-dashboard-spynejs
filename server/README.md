# Acme API tier

Serves the SpyneJS side of the Next.js ↔ SpyneJS comparison.

## Why this exists

SpyneJS runs in the browser, and a browser cannot speak the Postgres wire
protocol — it is raw TCP, not HTTP. There is no npm SQL client that changes
that; `postgres.js` is Node-only for exactly this reason. Shipping the
connection string to the client would also hand the database to anyone who opens
devtools.

The Next.js app queries Postgres directly because `app/lib/data.ts` executes on
the *server* — React Server Components and server actions — never in the
browser. It keeps that direct access here: it is genuinely its architecture, and
equalising it would be unfair in the other direction.

So the two data paths are:

```
Next.js   browser → (server component) ────────────────→ Postgres
SpyneJS   browser → https://localhost:8443/api → :8090 → Postgres
```

That asymmetry is the real architectural difference the comparison exists to
show, not a handicap applied to one side.

## Ports

| Piece | Address |
| --- | --- |
| SpyneJS dev server | `https://localhost:8443` |
| API tier | `http://127.0.0.1:8090` (loopback only, never addressed by the page) |
| Postgres | `localhost:5433`, TLS required |

The dev server proxies `/api` → `127.0.0.1:8090`, so the browser only ever sees
one HTTPS origin. No mixed-content block, and no CORS layer to build or keep in
sync.

## Running

```bash
npm start
```

Starts webpack and the API together via `concurrently --kill-others`, mirroring
the pattern already used in `spynejs-ai-codegen`. Either process dying takes the
other down, so you never get a half-running stack.

Individually: `npm run start:web`, `npm run start:api`.

The dev server uses a self-signed certificate; accept the browser warning once
per session. `DEV_SERVER_PROTOCOL=http` drops to plain HTTP — that exists only
for headless browsers that cannot click through the warning, not for normal use.

Requires `.env` (gitignored) next to `package.json` with the same
`POSTGRES_URL` the Next.js app uses. Copy `.env.example`.

## Endpoints

Every handler is a thin wrapper over a function ported verbatim from the Next.js
app. No business logic lives here that the Next.js side does not also have.

| Method | Route | Source function (`app/lib/…`) |
| --- | --- | --- |
| GET | `/api/health` | — (liveness probe; runs `fetchCustomers`) |
| POST | `/api/auth/login` | `auth.ts` `Credentials.authorize` |
| POST | `/api/auth/logout` | `auth.ts` `signOut` |
| GET | `/api/auth/session` | `auth.ts` `auth()` |
| GET | `/api/revenue` | `data.ts` `fetchRevenue` |
| GET | `/api/cards` | `data.ts` `fetchCardData` |
| GET | `/api/invoices/latest` | `data.ts` `fetchLatestInvoices` |
| GET | `/api/invoices?query=&page=` | `data.ts` `fetchFilteredInvoices` |
| GET | `/api/invoices/pages?query=` | `data.ts` `fetchInvoicesPages` |
| GET | `/api/invoices/:id` | `data.ts` `fetchInvoiceById` |
| GET | `/api/customers/select` | `data.ts` `fetchCustomers` |
| GET | `/api/customers?query=` | `data.ts` `fetchFilteredCustomers` |
| POST | `/api/invoices` | `actions.ts` `createInvoice` |
| PUT | `/api/invoices/:id` | `actions.ts` `updateInvoice` |
| DELETE | `/api/invoices/:id` | `actions.ts` `deleteInvoice` |

`/invoices/latest` and `/invoices/pages` are declared before `/invoices/:id`;
reversing that order makes Express match `latest` as an id.

## Parity notes

**Queries are verbatim.** Same SQL, same `ITEMS_PER_PAGE = 6`, same result
shapes, same cents→dollars and currency formatting (`formatCurrency` is ported
from `app/lib/utils.ts`). Do not "improve" a query in `queries.js` — if one looks
wrong it almost certainly matches upstream deliberately. Raise it instead.

**Validation is verbatim**, same zod major (3.25.x) and the same schemas, so both
sides accept and reject identical input and return the same
`{ errors, message }` shape.

One thing that needed care: the Next.js actions read fields with
`formData.get()`, which returns `null` for a missing field. A JSON body gives
`undefined`. Zod treats these differently — `null` trips `invalid_type_error`
(the custom copy), `undefined` trips `required_error` and yields a bare
`"Required"`. Without normalising, the SpyneJS form would show *"Required"* and
*"Expected number, received nan"* where the Next.js form shows *"Please select a
customer."* `validation.js` maps `undefined` → `null` to reproduce FormData
semantics exactly.

**Not represented here:** `revalidatePath()` and `redirect()` from the Next.js
mutations. Those are Next-specific cache and navigation concerns with no database
effect, so the equivalent is the SpyneJS side's own responsibility.

## Auth

**Everything except `/api/health` and `/api/auth/*` requires a session.** That
mirrors the `authorized()` callback in `auth.config.ts` which gates `/dashboard`.
The Next.js app protects *pages* and reaches its data functions only through
them; here the data is the surface, so the guard sits on the endpoints. Requests
get a 401 rather than a redirect, because the caller is a fetch, not a browser
navigation.

The credential check is a direct mirror of `auth.ts`: the same zod schema
(`email()`, `password.min(6)`), the same `SELECT * FROM users WHERE email = $1`,
the same `bcrypt.compare`. Every rejection path — malformed input, unknown user,
wrong password — returns the identical `{ message: 'Invalid credentials.' }`,
matching both `auth.ts`'s uniform `null` and the string the Next.js login form
displays. Distinguishing them would let an attacker enumerate valid emails.

The session mechanism is where the two necessarily differ. NextAuth issues an
encrypted JWT in an httpOnly cookie; this tier issues a **signed** httpOnly
cookie carrying the same claims:

```
HttpOnly; Secure; SameSite=Lax; Max-Age=2592000; Path=/
```

Both are stateless, both are keyed off the same `AUTH_SECRET`, and neither is
readable from page JavaScript — so session security is equivalent and only the
implementation differs. `cookie-parser` drops any cookie whose HMAC fails, so a
forged session never reaches route code as a value.

Sign in from the command line:

```bash
curl -k -c /tmp/acme.txt -X POST https://localhost:8443/api/auth/login -H 'Content-Type: application/json' -d '{"email":"user@nextmail.com","password":"123456"}'
```

Then pass `-b /tmp/acme.txt` on subsequent requests. In the browser the cookie is
handled automatically; the SpyneJS side drives it through `CHANNEL_ACME_AUTH`.

Note `bcrypt` here is v6 while the Next.js app pins v5. Both read and write the
same `$2b$` format, and v6 verifies the v5-generated seed hashes correctly —
confirmed by a successful login against the seeded user.

## Known limitation

**`fetchRevenue` has no `ORDER BY`**, exactly as upstream, so Postgres returns
months in arbitrary order and the chart reshuffles after a reseed — on both
sides, independently. Kept verbatim: faithfulness to the reference
implementation outranks cosmetic stability, and how sorting eventually gets
solved is itself material for the comparison as both apps evolve.
