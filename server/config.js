// API tier configuration.
//
// The SpyneJS app runs in the browser and cannot speak the Postgres wire
// protocol, so it reaches the database through this tier over HTTP. The Next.js
// app has no equivalent layer — its data functions execute on the server as part
// of the framework. That asymmetry is real architecture, not a handicap, and is
// exactly what the comparison is meant to surface.

export const HOST = '127.0.0.1';
export const PORT = Number(process.env.API_PORT || 8090);

// Same connection string as the Next.js app's .env.local, same SSL semantics.
// Read from the environment only — never constructed or defaulted here, so
// local and Neon differ by this value alone and no connection code branches.
export const POSTGRES_URL = process.env.POSTGRES_URL;

// Signs the session cookie. Same value as the Next.js app's AUTH_SECRET, so the
// comparison setup has one session secret rather than two to keep in sync.
export const AUTH_SECRET = process.env.AUTH_SECRET;

if (!POSTGRES_URL) {
  console.error(
    '[api] POSTGRES_URL is not set.\n' +
      '      The server is started with `node --env-file=.env`; create that file\n' +
      '      next to package.json with the same POSTGRES_URL the Next.js app uses.',
  );
  process.exit(1);
}

if (!AUTH_SECRET) {
  // Refuse to start rather than fall back to a default: an unset secret would
  // mean every session cookie is signed with a value an attacker can guess.
  console.error(
    '[api] AUTH_SECRET is not set.\n' +
      '      Add it to .env — use the same value as the Next.js app.',
  );
  process.exit(1);
}
