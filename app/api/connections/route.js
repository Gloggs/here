import { NextResponse } from "next/server";
import { getOwnerId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { canConnect, listConnections, PROVIDERS, removeConnection } from "@/lib/connections";

export const dynamic = "force-dynamic";

// GET /api/connections: the apps this account has connected. Never includes keys.
export async function GET() {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  try {
    return NextResponse.json({ allowed: canConnect(ownerId), connections: await listConnections(ownerId) });
  } catch (error) {
    return serverError("connections GET", error);
  }
}

// DELETE /api/connections?provider=zoho: disconnects and cancels access with the provider.
export async function DELETE(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const provider = new URL(req.url).searchParams.get("provider");
  if (!Object.hasOwn(PROVIDERS, provider || "")) return badRequest("Unknown app.");
  try {
    return NextResponse.json({ removed: await removeConnection(ownerId, provider) });
  } catch (error) {
    return serverError("connections DELETE", error);
  }
}
