// Credential check and session handling for the SpyneJS side.
//
// Mirrors the Next.js app's auth.ts as closely as the two stacks allow:
//
//   - same credential schema (email(), password.min(6))
//   - same user lookup, SELECT * FROM users WHERE email = $1
//   - same bcrypt.compare against the stored hash
//   - same single failure message for every rejection path
//
// What necessarily differs is the session mechanism. NextAuth issues an
// encrypted JWT in an httpOnly cookie; this tier issues a SIGNED httpOnly
// cookie carrying the same claims. Both are stateless, both are unreadable and
// untamperable from JavaScript, and both are keyed off AUTH_SECRET — so the two
// apps have equivalent session security and only the implementation differs.
//
// Ratified approach — see the tranche 2 report.

import bcrypt from 'bcrypt';
import { z } from 'zod';

import { sql } from './db.js';

export const SESSION_COOKIE = 'acme_session';

// Matches NextAuth's default 30-day session.
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// auth.ts: z.object({ email: z.string().email(), password: z.string().min(6) })
const Credentials = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// auth.ts getUser()
async function getUser(email) {
  const user = await sql`SELECT * FROM users WHERE email=${email}`;
  return user[0];
}

/**
 * Returns the user on success, or null on any failure.
 *
 * Deliberately does NOT distinguish "no such user" from "wrong password" —
 * auth.ts returns null for both, and leaking the difference would let an
 * attacker enumerate valid email addresses.
 */
export async function verifyCredentials(credentials) {
  const parsed = Credentials.safeParse(credentials);
  if (!parsed.success) return null;

  const { email, password } = parsed.data;

  const user = await getUser(email);
  if (!user) return null;

  const passwordsMatch = await bcrypt.compare(password, user.password);
  if (!passwordsMatch) return null;

  return user;
}

export function issueSession(res, user) {
  const session = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    exp: Date.now() + SESSION_MAX_AGE_MS,
  });

  res.cookie(SESSION_COOKIE, session, {
    signed: true, // HMAC-SHA256 over AUTH_SECRET — tampering invalidates it
    httpOnly: true, // unreadable from page JavaScript, so XSS cannot exfiltrate it
    sameSite: 'lax', // blocks cross-site submission (CSRF) while keeping normal nav
    // Correct for a deployed origin. In dev the app is served over plain
    // http://localhost, which browsers treat as trustworthy, so the cookie is
    // still set. It would NOT be set over http:// on a LAN address.
    secure: true,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
}

export function clearSession(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/**
 * Reads the signed cookie. Returns null if absent, tampered with, unparseable
 * or expired. cookie-parser drops a cookie whose signature does not verify, so
 * a forged session never reaches this code as a value.
 */
export function readSession(req) {
  const raw = req.signedCookies?.[SESSION_COOKIE];
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    if (!session?.id || typeof session.exp !== 'number') return null;
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Route guard, equivalent to the authorized() callback in auth.config.ts that
 * gates /dashboard. The Next.js app protects pages and reaches its data
 * functions only through them; here the data IS the surface, so the guard sits
 * on the endpoints.
 *
 * Returns 401 rather than redirecting — the caller is a fetch, not a browser
 * navigation, so the SpyneJS side decides what to do about it.
 */
export function requireAuth(req, res, next) {
  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }
  req.session = session;
  next();
}
