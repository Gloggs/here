import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { USER_FLAGS } from "@/utils/schema";
import { getOwnerId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { SANDBOX_SUFFIX } from "@/lib/guest";
import { readJson } from "@/lib/validate";

export const dynamic = "force-dynamic";

// Only these names can be stored, so the table never fills with anything else.
const ALLOWED = ["guide"];

// The person, not the space: seeing the guide in the sandbox counts for the real register too.
async function personId() {
  const owner = await getOwnerId();
  if (!owner) return null;
  return owner.endsWith(SANDBOX_SUFFIX) ? owner.slice(0, -SANDBOX_SUFFIX.length) : owner;
}

// GET /api/flags: the one-time things this account has already seen.
export async function GET() {
  const id = await personId();
  if (!id) return unauthorized();
  try {
    const rows = await db.select({ name: USER_FLAGS.name }).from(USER_FLAGS).where(eq(USER_FLAGS.ownerId, id));
    return NextResponse.json({ seen: rows.map((r) => r.name).filter((n) => ALLOWED.includes(n)) });
  } catch (error) {
    return serverError("flags GET", error);
  }
}

// POST /api/flags { name }: records that this account has seen it. Safe to send twice.
export async function POST(req) {
  const id = await personId();
  if (!id) return unauthorized();
  const body = await readJson(req);
  const name = typeof body?.name === "string" ? body.name : "";
  if (!ALLOWED.includes(name)) return badRequest("Unknown flag.");
  try {
    await db.insert(USER_FLAGS).values({ ownerId: id, name }).onConflictDoNothing();
    const rows = await db.select({ name: USER_FLAGS.name }).from(USER_FLAGS).where(and(eq(USER_FLAGS.ownerId, id), eq(USER_FLAGS.name, name)));
    return NextResponse.json({ seen: rows.length > 0 });
  } catch (error) {
    return serverError("flags POST", error);
  }
}
