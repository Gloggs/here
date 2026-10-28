// Shared checks for the Zoho routes: a signed-in user, in their real register, with Zoho connected.
import { getOwnerId, unauthorized, badRequest } from "@/lib/auth";
import { canConnect, getConnection } from "@/lib/connections";
import { tooMany } from "@/lib/ratelimit";
import { NextResponse } from "next/server";

export async function zohoContext() {
  const ownerId = await getOwnerId();
  if (!ownerId) return { error: unauthorized() };
  if (!canConnect(ownerId)) return { error: badRequest("Apps only work in your real register.") };
  if (tooMany(`zoho:${ownerId}`, 30)) return { error: NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 }) };
  const conn = await getConnection(ownerId, "zoho");
  if (!conn) return { error: badRequest("Connect Zoho CRM on the Apps page first.") };
  return { ownerId, conn };
}
