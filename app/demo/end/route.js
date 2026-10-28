import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GUEST_COOKIE, verifyGuest } from "@/lib/guest";
import { removeAccount } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

// GET /demo/end: deletes the guest's data straight away and returns to the home page.
export async function GET(request) {
  const id = await verifyGuest(cookies().get(GUEST_COOKIE)?.value);
  if (id) {
    try { await removeAccount(id); } catch (error) { console.error("[demo end]", error); }
  }
  const res = NextResponse.redirect(new URL("/?demo=ended", request.url));
  res.cookies.set(GUEST_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
