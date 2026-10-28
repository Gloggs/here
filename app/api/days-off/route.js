import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { DAYS_OFF } from "@/utils/schema";
import { getOwnerId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { cleanText, cleanId, readJson } from "@/lib/validate";
import { loadDaysOff } from "@/lib/data";
import { parseIso, addDays } from "@/lib/register";

export const dynamic = 'force-dynamic';

export async function GET() {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  try { return NextResponse.json(await loadDaysOff(ownerId)); }
  catch (error) { return serverError("days-off GET", error); }
}

// POST /api/days-off { from, to?, label }: adds one day or a run of days (up to 31).
export async function POST(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const body = await readJson(req);
  const from = parseIso(body?.from);
  const to = body?.to ? parseIso(body.to) : from;
  const label = cleanText(body?.label, { max: 40, required: true });
  if (!from || !to || to.iso < from.iso) return badRequest("Dates must look like YYYY-MM-DD.");
  if (label.error) return badRequest(`Label ${label.error}.`);
  const days = [];
  for (let d = from.iso; d <= to.iso && days.length < 32; d = addDays(d, 1)) days.push(d);
  if (days.length > 31) return badRequest("Add up to 31 days at a time.");
  try {
    const count = await db.select({ n: sql`count(*)::int` }).from(DAYS_OFF).where(eq(DAYS_OFF.ownerId, ownerId));
    if (count[0].n + days.length > 400) return badRequest("That is too many days off.");
    await db.insert(DAYS_OFF).values(days.map((day) => ({ ownerId, day, label: label.value }))).onConflictDoNothing();
    return NextResponse.json({ added: days.length }, { status: 201 });
  } catch (error) {
    return serverError("days-off POST", error);
  }
}

export async function DELETE(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const id = cleanId(req.nextUrl.searchParams.get("id"));
  if (id.error) return badRequest("Id is not valid.");
  try {
    await db.delete(DAYS_OFF).where(and(eq(DAYS_OFF.id, id.value), eq(DAYS_OFF.ownerId, ownerId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("days-off DELETE", error);
  }
}
