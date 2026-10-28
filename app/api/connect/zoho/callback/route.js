import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOwnerId } from "@/lib/auth";
import { canConnect, readSettings, saveConnection } from "@/lib/connections";
import { checkState, STATE_COOKIE } from "@/lib/oauth-state";
import { exchangeCode, orgName, SCOPE_VERSION, validAccountsServer } from "@/lib/providers/zoho";

export const dynamic = "force-dynamic";

// GET /api/connect/zoho/callback: Zoho sends the user back here after they approve.
export async function GET(request) {
  const url = new URL(request.url);
  const back = (q) => {
    const res = NextResponse.redirect(new URL(`/dashboard/apps?${q}`, request.url));
    res.cookies.set(STATE_COOKIE, "", { path: "/api/connect", maxAge: 0 });
    return res;
  };
  const ownerId = await getOwnerId();
  if (!ownerId || !canConnect(ownerId)) return back("error=sandbox");
  if (url.searchParams.get("error")) return back("error=declined");
  if (!checkState(cookies().get(STATE_COOKIE)?.value, url.searchParams.get("state"), ownerId, "zoho")) return back("error=state");
  const code = url.searchParams.get("code");
  const accounts = url.searchParams.get("accounts-server") || "https://accounts.zoho.eu";
  if (!code || !validAccountsServer(accounts)) return back("error=failed");
  try {
    const t = await exchangeCode(code, accounts);
    // Reconnecting to approve new permissions must not lose which students are linked to which Contacts.
    const before = await readSettings(ownerId, "zoho");
    await saveConnection(ownerId, "zoho", t, await orgName(t), { accounts, links: before.links || {}, tasked: before.tasked || {}, scopeVersion: SCOPE_VERSION });
    return back("connected=zoho");
  } catch (error) {
    console.error("[zoho callback]", error.message);
    return back("error=failed");
  }
}
