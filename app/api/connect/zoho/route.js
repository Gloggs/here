import { NextResponse } from "next/server";
import { getOwnerId } from "@/lib/auth";
import { canConnect } from "@/lib/connections";
import { newState, STATE_COOKIE, STATE_TTL_S } from "@/lib/oauth-state";
import { authorizeUrl } from "@/lib/providers/zoho";
import { tooMany } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// GET /api/connect/zoho: sends the signed-in user to Zoho to approve access.
export async function GET(request) {
  const back = (q) => NextResponse.redirect(new URL(`/dashboard/apps?${q}`, request.url));
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.redirect(new URL("/api/auth/login", request.url));
  if (!canConnect(ownerId)) return back("error=sandbox");
  if (tooMany(`connect:${ownerId}`, 10)) return back("error=failed");
  try {
    const { state, cookie } = newState(ownerId, "zoho");
    const res = NextResponse.redirect(authorizeUrl(state));
    res.cookies.set(STATE_COOKIE, cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/connect", maxAge: STATE_TTL_S });
    return res;
  } catch (error) {
    console.error("[connect zoho]", error.message);
    return back("error=setup");
  }
}
