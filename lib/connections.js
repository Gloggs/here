// Connected apps, one per account per provider. Every function takes the owner id from
// the signed-in session, never from the request, so one account can never reach
// another's connection. Tokens are encrypted at rest and never leave the server.
import { and, eq } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { CONNECTIONS } from "@/utils/schema";
import { decrypt, encrypt } from "@/lib/crypto";
import { isSandbox } from "@/lib/guest";
import * as zoho from "@/lib/providers/zoho";

export const PROVIDERS = { zoho };

/** Apps belong to real registers only, never the sandbox or the demo. */
export function canConnect(ownerId) {
  return typeof ownerId === "string" && ownerId.length > 0 && !isSandbox(ownerId);
}

const where = (ownerId, provider) => and(eq(CONNECTIONS.ownerId, ownerId), eq(CONNECTIONS.provider, provider));

function parse(text) { try { return JSON.parse(text || "{}"); } catch { return {}; } }

export async function listConnections(ownerId) {
  if (!canConnect(ownerId)) return [];
  const rows = await db.select({ provider: CONNECTIONS.provider, label: CONNECTIONS.accountLabel, createdAt: CONNECTIONS.createdAt, settings: CONNECTIONS.settings })
    .from(CONNECTIONS).where(eq(CONNECTIONS.ownerId, ownerId));
  // Only what the page needs. Tokens and the student-to-contact links never leave the server here.
  return rows.map(({ settings, ...r }) => ({ ...r, scopeVersion: parse(settings).scopeVersion || 1 }));
}

/** The stored settings only (links, scope version), without touching tokens. */
export async function readSettings(ownerId, provider) {
  if (!canConnect(ownerId)) return {};
  const [row] = await db.select({ settings: CONNECTIONS.settings }).from(CONNECTIONS).where(where(ownerId, provider)).limit(1);
  return row ? parse(row.settings) : {};
}

export async function saveConnection(ownerId, provider, t, label, settings = {}) {
  if (!canConnect(ownerId)) throw new Error("Apps can only be connected to your own register.");
  const values = {
    accessToken: encrypt(t.accessToken), refreshToken: encrypt(t.refreshToken), apiDomain: t.apiDomain ?? null,
    expiresAt: t.expiresAt ?? null, accountLabel: label?.slice(0, 120) ?? null, scope: t.scope ?? null,
    settings: JSON.stringify(settings), updatedAt: new Date(),
  };
  await db.insert(CONNECTIONS).values({ ownerId, provider, ...values })
    .onConflictDoUpdate({ target: [CONNECTIONS.ownerId, CONNECTIONS.provider], set: values });
}

/** The live connection with a working access token, refreshed when it is about to expire. */
export async function getConnection(ownerId, provider) {
  if (!canConnect(ownerId)) return null;
  const [row] = await db.select().from(CONNECTIONS).where(where(ownerId, provider)).limit(1);
  if (!row) return null;
  const settings = parse(row.settings);
  const conn = { provider, apiDomain: row.apiDomain, accessToken: decrypt(row.accessToken), settings };
  if (row.expiresAt && new Date(row.expiresAt).getTime() - 60_000 < Date.now() && row.refreshToken) {
    const fresh = await PROVIDERS[provider].refresh(decrypt(row.refreshToken), settings.accounts);
    await db.update(CONNECTIONS).set({ accessToken: encrypt(fresh.accessToken), expiresAt: fresh.expiresAt, updatedAt: new Date() })
      .where(where(ownerId, provider));
    conn.accessToken = fresh.accessToken;
  }
  return conn;
}

export async function updateSettings(ownerId, provider, change) {
  const [row] = await db.select({ settings: CONNECTIONS.settings }).from(CONNECTIONS).where(where(ownerId, provider)).limit(1);
  if (!row) return null;
  const next = change(parse(row.settings));
  await db.update(CONNECTIONS).set({ settings: JSON.stringify(next), updatedAt: new Date() }).where(where(ownerId, provider));
  return next;
}

/** Cancels access with the provider, then deletes the stored keys. */
export async function removeConnection(ownerId, provider) {
  const [row] = await db.select().from(CONNECTIONS).where(where(ownerId, provider)).limit(1);
  if (!row) return false;
  try {
    const token = row.refreshToken ? decrypt(row.refreshToken) : decrypt(row.accessToken);
    await PROVIDERS[provider]?.revoke(token, parse(row.settings).accounts);
  } catch (error) { console.error("[revoke]", provider, error.message); }
  await db.delete(CONNECTIONS).where(where(ownerId, provider));
  return true;
}

export async function removeAllConnections(ownerId) {
  try {
    const rows = await db.select({ provider: CONNECTIONS.provider }).from(CONNECTIONS).where(eq(CONNECTIONS.ownerId, ownerId));
    for (const r of rows) await removeConnection(ownerId, r.provider);
  } catch (error) { console.error("[removeAllConnections]", error.message); }
}
