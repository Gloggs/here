import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { TASK_MARKS } from "@/utils/schema";
import { getOwnerId, unauthorized, badRequest, notFound, serverError } from "@/lib/auth";
import { cleanId, cleanText, readJson } from "@/lib/validate";
import { TASK_STATUSES } from "@/lib/insights";
import { ownedStudent, ownedTask } from "@/lib/owned";

export const dynamic = 'force-dynamic';

// POST /api/tasks/marks { taskId, studentId, status, share?, note? }: one person's result, replacing any earlier one.
export async function POST(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const body = await readJson(req);
  const taskId = cleanId(body?.taskId), studentId = cleanId(body?.studentId);
  if (taskId.error || studentId.error) return badRequest("Task or student is not valid.");
  if (!TASK_STATUSES.includes(body.status)) return badRequest("Result must be done, late or missed.");
  const share = body.share === null || body.share === undefined || body.share === "" ? null : Number(body.share);
  if (share !== null && (!Number.isInteger(share) || share < 0 || share > 100)) return badRequest("Share must be a whole number from 0 to 100.");
  const note = cleanText(body.note, { max: 200 });
  if (note.error) return badRequest(`Note ${note.error}.`);
  try {
    if (!(await ownedTask(ownerId, taskId.value))) return notFound("Task not found.");
    if (!(await ownedStudent(ownerId, studentId.value))) return notFound("Student not found.");
    const values = { status: body.status, share: body.status === "missed" ? null : share, note: note.value, markedAt: new Date() };
    await db.insert(TASK_MARKS).values({ ownerId, taskId: taskId.value, studentId: studentId.value, ...values })
      .onConflictDoUpdate({ target: [TASK_MARKS.ownerId, TASK_MARKS.taskId, TASK_MARKS.studentId], set: values });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("task marks POST", error);
  }
}

// DELETE /api/tasks/marks?taskId=N&studentId=M
export async function DELETE(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const p = req.nextUrl.searchParams;
  const taskId = cleanId(p.get("taskId")), studentId = cleanId(p.get("studentId"));
  if (taskId.error || studentId.error) return badRequest("Task or student is not valid.");
  try {
    await db.delete(TASK_MARKS).where(and(eq(TASK_MARKS.ownerId, ownerId), eq(TASK_MARKS.taskId, taskId.value), eq(TASK_MARKS.studentId, studentId.value)));
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("task marks DELETE", error);
  }
}
