import { NextResponse } from "next/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { TASKS, TASK_MARKS } from "@/utils/schema";
import { getOwnerId, unauthorized, badRequest, notFound, serverError } from "@/lib/auth";
import { cleanId, cleanText, readJson } from "@/lib/validate";
import { containsProfanity } from "@/lib/utils";
import { parseIso } from "@/lib/register";
import { ownedClass, ownedTask } from "@/lib/owned";
import { limitsFor } from "@/lib/guest";

export const dynamic = 'force-dynamic';

function readTask(body) {
  const title = cleanText(body?.title, { max: 80, required: true });
  if (title.error) return { error: `Task name ${title.error}.` };
  const due = parseIso(body?.due);
  if (!due) return { error: "Please choose a due date." };
  const notes = cleanText(body?.notes, { max: 300 });
  if (notes.error) return { error: `Notes ${notes.error}.` };
  if (containsProfanity(title.value) || (notes.value && containsProfanity(notes.value))) return { error: "Please remove inappropriate words." };
  return { values: { title: title.value, due: due.iso, notes: notes.value } };
}

const iso = (d) => (typeof d === "string" ? d : new Date(d).toISOString().slice(0, 10));

// GET /api/tasks?classId=N: the group's tasks, each with every member's result.
export async function GET(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const cid = cleanId(req.nextUrl.searchParams.get("classId"));
  if (cid.error) return badRequest("Class id is not valid.");
  try {
    if (!(await ownedClass(ownerId, cid.value))) return notFound("Class not found.");
    const tasks = await db.select({ id: TASKS.id, title: TASKS.title, due: TASKS.due, notes: TASKS.notes }).from(TASKS)
      .where(and(eq(TASKS.ownerId, ownerId), eq(TASKS.classId, cid.value))).orderBy(asc(TASKS.due));
    const ids = tasks.map((t) => t.id);
    const marks = ids.length ? await db.select({ taskId: TASK_MARKS.taskId, studentId: TASK_MARKS.studentId, status: TASK_MARKS.status, share: TASK_MARKS.share, note: TASK_MARKS.note })
      .from(TASK_MARKS).where(and(eq(TASK_MARKS.ownerId, ownerId), inArray(TASK_MARKS.taskId, ids))) : [];
    return NextResponse.json(tasks.map((t) => ({ ...t, due: iso(t.due), marks: marks.filter((m) => m.taskId === t.id) })));
  } catch (error) {
    return serverError("tasks GET", error);
  }
}

// POST /api/tasks { classId, title, due, notes? }
export async function POST(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const body = await readJson(req);
  const cid = cleanId(body?.classId);
  if (cid.error) return badRequest("Class id is not valid.");
  const { values, error } = readTask(body);
  if (error) return badRequest(error);
  try {
    if (!(await ownedClass(ownerId, cid.value))) return notFound("Class not found.");
    const n = await db.select({ n: sql`count(*)::int` }).from(TASKS).where(eq(TASKS.ownerId, ownerId));
    const max = limitsFor(ownerId).tasks;
    if (n[0].n >= max) return badRequest(`You can have up to ${max} tasks.`);
    const [row] = await db.insert(TASKS).values({ ownerId, classId: cid.value, ...values }).returning({ id: TASKS.id });
    return NextResponse.json({ id: row.id, ...values, marks: [] }, { status: 201 });
  } catch (error) {
    return serverError("tasks POST", error);
  }
}

// PUT /api/tasks { id, title, due, notes? }
export async function PUT(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const body = await readJson(req);
  const id = cleanId(body?.id);
  if (id.error) return badRequest("Task id is not valid.");
  const { values, error } = readTask(body);
  if (error) return badRequest(error);
  try {
    if (!(await ownedTask(ownerId, id.value))) return notFound("Task not found.");
    await db.update(TASKS).set(values).where(and(eq(TASKS.id, id.value), eq(TASKS.ownerId, ownerId)));
    return NextResponse.json({ id: id.value, ...values });
  } catch (error) {
    return serverError("tasks PUT", error);
  }
}

// DELETE /api/tasks?id=N: the task and everyone's result for it.
export async function DELETE(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const id = cleanId(req.nextUrl.searchParams.get("id"));
  if (id.error) return badRequest("Task id is not valid.");
  try {
    if (!(await ownedTask(ownerId, id.value))) return notFound("Task not found.");
    await db.delete(TASK_MARKS).where(and(eq(TASK_MARKS.ownerId, ownerId), eq(TASK_MARKS.taskId, id.value)));
    await db.delete(TASKS).where(and(eq(TASKS.ownerId, ownerId), eq(TASKS.id, id.value)));
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("tasks DELETE", error);
  }
}
