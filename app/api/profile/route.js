import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { PROFILES } from "@/utils/schema";
import { getUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { readJson } from "@/lib/validate";

export const dynamic = 'force-dynamic';

// PUT /api/profile { name }: sets the name shown in the app. An empty name goes back
// to the one from sign-in. Demo guests have no profile.
export async function PUT(req) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const body = await readJson(req);
  const name = typeof body?.name === "string" ? body.name.replace(/\s+/g, " ").trim() : null;
  if (name === null) return badRequest("Name must be text.");
  if (name.length > 60) return badRequest("Keep your name to 60 characters or fewer.");
  try {
    if (!name) {
      await db.delete(PROFILES).where(eq(PROFILES.ownerId, userId));
      return NextResponse.json({ name: null });
    }
    await db.insert(PROFILES).values({ ownerId: userId, displayName: name })
      .onConflictDoUpdate({ target: PROFILES.ownerId, set: { displayName: name, updatedAt: new Date() } });
    return NextResponse.json({ name });
  } catch (error) {
    return serverError("profile PUT", error);
  }
}
