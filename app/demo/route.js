import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { like, sql } from "drizzle-orm";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db } from "@/utils/dbConfig";
import { CLASSES, STUDENTS } from "@/utils/schema";
import { GUEST_COOKIE, GUEST_TTL_MS, guestCookieValue, guestCreatedAt, newGuestId, verifyGuest } from "@/lib/guest";
import { addSample } from "@/lib/sample";
import { removeAccount } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

const MAX_NEW_PER_HOUR = 300;

/** Deletes guests older than 24 hours. Runs each time someone starts a demo. */
async function sweepExpired() {
  const owners = await db.selectDistinct({ id: STUDENTS.ownerId }).from(STUDENTS).where(like(STUDENTS.ownerId, "guest\\_%"))
    .union(db.selectDistinct({ id: CLASSES.ownerId }).from(CLASSES).where(like(CLASSES.ownerId, "guest\\_%")));
  const now = Date.now();
  let recent = 0;
  for (const { id } of owners) {
    const made = guestCreatedAt(id);
    if (!made || now - made >= GUEST_TTL_MS) await removeAccount(id);
    else if (now - made < 3600_000) recent++;
  }
  return recent;
}

// GET /demo: starts a private demo with the sample class, with no sign-up.
export async function GET(request) {
  const home = (path) => NextResponse.redirect(new URL(path, request.url));
  try {
    // Signed-in people already have a sandbox: switch to it through the normal route.
    if (await getKindeServerSession().isAuthenticated()) return home("/dashboard?space=sandbox");
  } catch { /* not signed in */ }
  if (await verifyGuest(cookies().get(GUEST_COOKIE)?.value)) return home("/dashboard");
  try {
    if ((await sweepExpired()) >= MAX_NEW_PER_HOUR) return home("/?demo=busy");
    const id = newGuestId();
    await addSample(id);
    const res = home("/dashboard");
    res.cookies.set(GUEST_COOKIE, await guestCookieValue(id), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: GUEST_TTL_MS / 1000,
    });
    return res;
  } catch (error) {
    console.error("[demo]", error);
    return home("/?demo=error");
  }
}
