import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { CLASSES } from "@/utils/schema";
import { getOwnerId, getUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { readJson } from "@/lib/validate";
import { SANDBOX_SUFFIX, SPACE_COOKIE, isGuest } from "@/lib/guest";
import { addSample } from "@/lib/sample";

export const dynamic = 'force-dynamic';

// GET /api/space: which space this request is in.
export async function GET() {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  if (isGuest(ownerId)) return NextResponse.json({ space: "sandbox", guest: true });
  return NextResponse.json({ space: ownerId.endsWith(SANDBOX_SUFFIX) ? "sandbox" : "main", guest: false });
}

// POST /api/space { space: "main" | "sandbox" }: switches space. The first visit to the
// sandbox fills it with the sample class so there is something to play with.
export async function POST(req) {
  const userId = await getUserId();
  if (!userId) {
    if (await getOwnerId()) return badRequest("The demo always uses the sandbox.");
    return unauthorized();
  }
  const body = await readJson(req);
  if (!["main", "sandbox"].includes(body?.space)) return badRequest("Space must be main or sandbox.");
  try {
    if (body.space === "sandbox") {
      const sandboxId = `${userId}${SANDBOX_SUFFIX}`;
      const any = await db.select({ id: CLASSES.id }).from(CLASSES).where(eq(CLASSES.ownerId, sandboxId)).limit(1);
      if (!any.length) await addSample(sandboxId);
    }
    const res = NextResponse.json({ space: body.space });
    res.cookies.set(SPACE_COOKIE, body.space, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  } catch (error) {
    return serverError("space POST", error);
  }
}
