// Shared checks for the Zoho routes: a signed-in user, in their real register, with Zoho connected.
import { getOwnerId, unauthorized, badRequest } from "@/lib/auth";
import { canConnect, getConnection } from "@/lib/connections";
import { tooMany } from "@/lib/ratelimit";
import { SCOPE_VERSION } from "@/lib/providers/zoho";
import { NextResponse } from "next/server";

/** { write: true } is for routes that need the version 2 permissions (update Contacts, create Tasks, import). */
export async function zohoContext({ write = false } = {}) {
  const ownerId = await getOwnerId();
  if (!ownerId) return { error: unauthorized() };
  if (!canConnect(ownerId)) return { error: badRequest("Apps only work in your real register.") };
  if (tooMany(`zoho:${ownerId}`, 30)) return { error: NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 }) };
  const conn = await getConnection(ownerId, "zoho");
  if (!conn) return { error: badRequest("Connect Zoho CRM on the Apps page first.") };
  if (write && (conn.settings.scopeVersion || 1) < SCOPE_VERSION) {
    return { error: badRequest("Zoho needs updated permissions for this. Reconnect it on the Apps page.") };
  }
  return { ownerId, conn };
}
