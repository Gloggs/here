import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { BEHAVIOURS } from "@/utils/schema";
import { getOwnerId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { cleanText, readJson } from "@/lib/validate";
import { containsProfanity } from "@/lib/utils";
import { loadBehaviours } from "@/lib/owned";

export const dynamic = 'force-dynamic';

// GET /api/behaviours: this account's behaviours, or the built-in list.
export async function GET() {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  try { return NextResponse.json(await loadBehaviours(ownerId)); }
  catch (error) { return serverError("behaviours GET", error); }
}

// PUT /api/behaviours { list: [{ name, value: 1 | -1 }] }: replaces the list (up to 12).
export async function PUT(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const body = await readJson(req);
  if (!Array.isArray(body?.list) || !body.list.length || body.list.length > 12) return badRequest("Keep between 1 and 12 behaviours.");
  const list = [];
  for (const b of body.list) {
    const name = cleanText(b?.name, { max: 40, required: true });
    if (name.error) return badRequest(`Behaviour name ${name.error}.`);
    if (![1, -1].includes(b.value)) return badRequest("Each behaviour is worth +1 or -1.");
    if (containsProfanity(name.value)) return badRequest("Please remove inappropriate words.");
    if (list.some((x) => x.name.toLowerCase() === name.value.toLowerCase())) return badRequest(`"${name.value}" is listed twice.`);
    list.push({ name: name.value, value: b.value });
  }
  try {
    await db.delete(BEHAVIOURS).where(eq(BEHAVIOURS.ownerId, ownerId));
    await db.insert(BEHAVIOURS).values(list.map((b, i) => ({ ownerId, ...b, position: i })));
    return NextResponse.json(list);
  } catch (error) {
    return serverError("behaviours PUT", error);
  }
}
