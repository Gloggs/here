import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GUEST_COOKIE, SANDBOX_SUFFIX, SPACE_COOKIE, verifyGuest } from "@/lib/guest";

/** The signed-in user's own id, ignoring which space they are in. */
export async function getUserId() {
  try {
    const { isAuthenticated, getUser } = getKindeServerSession();
    if (await isAuthenticated()) return (await getUser())?.id || null;
  } catch { /* not signed in */ }
  return null;
}

/**
 * Returns the owner id for this request: the signed-in user's id (with a sandbox
 * suffix when they are in their sandbox), or a demo guest's id, or null.
 * Every API route calls this before touching the database, and every query is
 * filtered by the returned id, so each account only ever sees its own records.
 */
export async function getOwnerId() {
  try {
    const { isAuthenticated, getUser } = getKindeServerSession();
    if (await isAuthenticated()) {
      const user = await getUser();
      if (typeof user?.id === "string" && user.id.length > 0) {
        // Signed-in users choose a space; demo guests are always in a sandbox of their own.
        return cookies().get(SPACE_COOKIE)?.value === "sandbox" ? `${user.id}${SANDBOX_SUFFIX}` : user.id;
      }
    }
  } catch {
    // fall through to the guest check
  }
  return verifyGuest(cookies().get(GUEST_COOKIE)?.value);
}

export function unauthorized() {
  return NextResponse.json({ error: "Please sign in." }, { status: 401 });
}

export function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found.") {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** Logs the real error on the server and sends the browser a generic message. */
export function serverError(where, error) {
  console.error(`[${where}]`, error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
