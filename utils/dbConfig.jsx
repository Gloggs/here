import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// The connection string lives only in the environment (Vercel project settings,
// or .env.local for local development). It must never be written into the code.
let client = null;

function getClient() {
  if (!client) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set. Add it in Vercel (Settings > Environment Variables) or in .env.local.');
    }
    // Local development and end-to-end tests can point the driver at a local stand-in for Neon's SQL endpoint
    // (see docs/TESTING.md). Never set in production.
    if (process.env.NEON_LOCAL_SQL_URL) neonConfig.fetchEndpoint = process.env.NEON_LOCAL_SQL_URL;
    client = drizzle(neon(databaseUrl), { schema });
  }
  return client;
}

// Connects on first use, so a missing variable fails the request with a clear
// server log instead of failing the build.
export const db = new Proxy({}, {
  get(_target, prop) {
    const c = getClient();
    const value = c[prop];
    return typeof value === 'function' ? value.bind(c) : value;
  },
});
