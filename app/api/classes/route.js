import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { CLASSES, STUDENTS } from "@/utils/schema";
import { removeStudents, removeTasksOfClass } from "@/lib/cleanup";
import { getOwnerId, unauthorized, badRequest, notFound, serverError } from "@/lib/auth";
import { cleanText, cleanId, readJson } from "@/lib/validate";
import { containsProfanity } from "@/lib/utils";
import { limitsFor } from "@/lib/guest";

export const dynamic = 'force-dynamic';

// GET /api/classes: the account's classes with how many students each has.
export async function GET() {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  try {
    const [classes, counts] = await Promise.all([
      db.select({ id: CLASSES.id, name: CLASSES.name, isSample: CLASSES.isSample, kind: CLASSES.kind, goalPct: CLASSES.goalPct, goalReward: CLASSES.goalReward })
        .from(CLASSES).where(eq(CLASSES.ownerId, ownerId)).orderBy(CLASSES.name),
      db.select({ name: STUDENTS.grade, n: sql`count(*)::int` })
        .from(STUDENTS).where(eq(STUDENTS.ownerId, ownerId)).groupBy(STUDENTS.grade),
    ]);
    const byName = new Map(counts.map((c) => [c.name, c.n]));
    const rows = classes.map((c) => ({ ...c, students: byName.get(c.name) ?? 0 }));
    return NextResponse.json(rows);
  } catch (error) {
    return serverError("classes GET", error);
  }
}

// POST /api/classes { name }
export async function POST(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const body = await readJson(req);
  const name = cleanText(body?.name, { max: 30, required: true });
  if (name.error) return badRequest(`Class name ${name.error}.`);
  if (containsProfanity(name.value)) return badRequest("Please remove inappropriate words.");
  try {
    const count = await db.select({ n: sql`count(*)::int` }).from(CLASSES).where(eq(CLASSES.ownerId, ownerId));
    const max = limitsFor(ownerId).classes;
    if (count[0].n >= max) return badRequest(`You can have up to ${max} classes${max < 50 ? " in the demo. Create a free account for more" : ""}.`);
    const created = await db.insert(CLASSES).values({ ownerId, name: name.value })
      .onConflictDoNothing().returning({ id: CLASSES.id, name: CLASSES.name });
    if (!created.length) return badRequest("You already have a class with that name.");
    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    return serverError("classes POST", error);
  }
}

// PUT /api/classes { id, name?, kind?, goalPct?, goalReward? }: rename a group (its
// students move with it), switch class or team, or set the weekly attendance goal.
export async function PUT(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const body = await readJson(req);
  const id = cleanId(body?.id);
  if (id.error) return badRequest("Class id is not valid.");
  const set = {};
  if (body.kind !== undefined) {
    if (!["class", "team"].includes(body.kind)) return badRequest("Type must be class or team.");
    set.kind = body.kind;
  }
  if (body.goalPct !== undefined) {
    if (body.goalPct !== null && (!Number.isInteger(body.goalPct) || body.goalPct < 50 || body.goalPct > 100)) return badRequest("Goal must be a whole number from 50 to 100.");
    set.goalPct = body.goalPct;
  }
  if (body.goalReward !== undefined) {
    const r = cleanText(body.goalReward, { max: 60 });
    if (r.error) return badRequest(`Reward ${r.error}.`);
    if (r.value && containsProfanity(r.value)) return badRequest("Please remove inappropriate words.");
    set.goalReward = r.value;
  }
  let name = null;
  if (body.name !== undefined) {
    const n = cleanText(body.name, { max: 30, required: true });
    if (n.error) return badRequest(`Name ${n.error}.`);
    if (containsProfanity(n.value)) return badRequest("Please remove inappropriate words.");
    name = n.value;
  }
  try {
    const cls = await db.select({ name: CLASSES.name }).from(CLASSES)
      .where(and(eq(CLASSES.id, id.value), eq(CLASSES.ownerId, ownerId))).limit(1);
    if (!cls.length) return notFound("Class not found.");
    if (name && name !== cls[0].name) {
      const clash = await db.select({ id: CLASSES.id }).from(CLASSES)
        .where(and(eq(CLASSES.ownerId, ownerId), eq(CLASSES.name, name))).limit(1);
      if (clash.length) return badRequest("You already have a group with that name.");
      set.name = name;
    }
    if (Object.keys(set).length) {
      await db.update(CLASSES).set(set).where(and(eq(CLASSES.id, id.value), eq(CLASSES.ownerId, ownerId)));
      if (set.name) await db.update(STUDENTS).set({ grade: set.name }).where(and(eq(STUDENTS.ownerId, ownerId), eq(STUDENTS.grade, cls[0].name)));
    }
    return NextResponse.json({ id: id.value, ...set });
  } catch (error) {
    return serverError("classes PUT", error);
  }
}

// DELETE /api/classes?id=N[&withStudents=1]: removes a class. With withStudents=1 it
// also removes the students in it and their marks; otherwise the class must be empty.
export async function DELETE(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const id = cleanId(req.nextUrl.searchParams.get("id"));
  if (id.error) return badRequest("Class id is not valid.");
  const cascade = req.nextUrl.searchParams.get("withStudents") === "1";
  try {
    const cls = await db.select({ name: CLASSES.name }).from(CLASSES)
      .where(and(eq(CLASSES.id, id.value), eq(CLASSES.ownerId, ownerId))).limit(1);
    if (!cls.length) return notFound("Class not found.");
    const ids = (await db.select({ id: STUDENTS.id }).from(STUDENTS)
      .where(and(eq(STUDENTS.ownerId, ownerId), eq(STUDENTS.grade, cls[0].name)))).map((s) => s.id);
    if (ids.length && !cascade) return badRequest("Move or remove the students in this class first.");
    await removeStudents(ownerId, ids);
    await removeTasksOfClass(ownerId, id.value);
    await db.delete(CLASSES).where(and(eq(CLASSES.id, id.value), eq(CLASSES.ownerId, ownerId)));
    return NextResponse.json({ success: true, removedStudents: ids.length });
  } catch (error) {
    return serverError("classes DELETE", error);
  }
}
