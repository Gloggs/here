import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { POINTS } from "@/utils/schema";
import { getOwnerId, unauthorized, badRequest, notFound, serverError } from "@/lib/auth";
import { cleanId, readJson } from "@/lib/validate";
import { parseIso } from "@/lib/register";
import { loadBehaviours, ownedClass, ownedStudent, studentIdsOfClass } from "@/lib/owned";

export const dynamic = 'force-dynamic';

// GET /api/points?classId=N&from=YYYY-MM-DD  or  ?studentId=N : points, newest first.
export async function GET(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const p = req.nextUrl.searchParams;
  const from = p.get("from") ? parseIso(p.get("from")) : null;
  if (p.get("from") && !from) return badRequest("Date must look like YYYY-MM-DD.");
  try {
    let ids;
    if (p.get("studentId")) {
      const sid = cleanId(p.get("studentId"));
      if (sid.error || !(await ownedStudent(ownerId, sid.value))) return notFound("Student not found.");
      ids = [sid.value];
    } else {
      const cid = cleanId(p.get("classId"));
      const cls = cid.error ? null : await ownedClass(ownerId, cid.value);
      if (!cls) return notFound("Class not found.");
      ids = await studentIdsOfClass(ownerId, cls.name);
    }
    if (!ids.length) return NextResponse.json([]);
    const conds = [eq(POINTS.ownerId, ownerId), inArray(POINTS.studentId, ids)];
    if (from) conds.push(gte(POINTS.createdAt, new Date(`${from.iso}T00:00:00Z`)));
    const rows = await db.select({ id: POINTS.id, studentId: POINTS.studentId, behaviour: POINTS.behaviour, value: POINTS.value, createdAt: POINTS.createdAt })
      .from(POINTS).where(and(...conds)).orderBy(desc(POINTS.createdAt)).limit(3000);
    return NextResponse.json(rows);
  } catch (error) {
    return serverError("points GET", error);
  }
}

// POST /api/points { studentId, behaviour }: the value comes from the account's behaviour list.
export async function POST(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const body = await readJson(req);
  const sid = cleanId(body?.studentId);
  if (sid.error) return badRequest("Student id is not valid.");
  try {
    const b = (await loadBehaviours(ownerId)).find((x) => x.name === body.behaviour);
    if (!b) return badRequest("Please choose one of your behaviours.");
    if (!(await ownedStudent(ownerId, sid.value))) return notFound("Student not found.");
    const [row] = await db.insert(POINTS).values({ ownerId, studentId: sid.value, behaviour: b.name, value: b.value })
      .returning({ id: POINTS.id, createdAt: POINTS.createdAt });
    return NextResponse.json({ ...row, studentId: sid.value, behaviour: b.name, value: b.value }, { status: 201 });
  } catch (error) {
    return serverError("points POST", error);
  }
}

// DELETE /api/points?id=N: undo a point.
export async function DELETE(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const id = cleanId(req.nextUrl.searchParams.get("id"));
  if (id.error) return badRequest("Point id is not valid.");
  try {
    await db.delete(POINTS).where(and(eq(POINTS.id, id.value), eq(POINTS.ownerId, ownerId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("points DELETE", error);
  }
}
