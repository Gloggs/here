import { eq } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { ATTENDANCE, BEHAVIOURS, CLASSES, DAYS_OFF, POINTS, STUDENTS, TASK_MARKS, TASKS } from "@/utils/schema";
import { getOwnerId, unauthorized, serverError } from "@/lib/auth";
import { markFromRow } from "@/lib/register";

export const dynamic = 'force-dynamic';

// GET /api/account/export: everything this account has stored, as one JSON file.
export async function GET() {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  try {
    const [classes, students, marks, daysOff, points, behaviours, tasks, taskMarks] = await Promise.all([
      db.select({ name: CLASSES.name, createdAt: CLASSES.createdAt, isSample: CLASSES.isSample }).from(CLASSES).where(eq(CLASSES.ownerId, ownerId)),
      db.select({ id: STUDENTS.id, name: STUDENTS.name, className: STUDENTS.grade, address: STUDENTS.address, contact: STUDENTS.contact, isSample: STUDENTS.isSample, photoConsent: STUDENTS.photoConsent })
        .from(STUDENTS).where(eq(STUDENTS.ownerId, ownerId)),
      db.select({ studentId: ATTENDANCE.studentId, date: ATTENDANCE.date, day: ATTENDANCE.day, present: ATTENDANCE.present,
        status: ATTENDANCE.status, reason: ATTENDANCE.reason, note: ATTENDANCE.note, markedAt: ATTENDANCE.markedAt })
        .from(ATTENDANCE).where(eq(ATTENDANCE.ownerId, ownerId)),
      db.select({ day: DAYS_OFF.day, label: DAYS_OFF.label }).from(DAYS_OFF).where(eq(DAYS_OFF.ownerId, ownerId)),
      db.select({ studentId: POINTS.studentId, behaviour: POINTS.behaviour, value: POINTS.value, createdAt: POINTS.createdAt }).from(POINTS).where(eq(POINTS.ownerId, ownerId)),
      db.select({ name: BEHAVIOURS.name, value: BEHAVIOURS.value }).from(BEHAVIOURS).where(eq(BEHAVIOURS.ownerId, ownerId)),
      db.select({ id: TASKS.id, classId: TASKS.classId, title: TASKS.title, due: TASKS.due, notes: TASKS.notes }).from(TASKS).where(eq(TASKS.ownerId, ownerId)),
      db.select({ taskId: TASK_MARKS.taskId, studentId: TASK_MARKS.studentId, status: TASK_MARKS.status, share: TASK_MARKS.share, note: TASK_MARKS.note }).from(TASK_MARKS).where(eq(TASK_MARKS.ownerId, ownerId)),
    ]);
    const body = JSON.stringify({
      exportedAt: new Date().toISOString(),
      classes, students,
      marks: marks.map((r) => ({ ...markFromRow(r), markedAt: r.markedAt })),
      daysOff, points, behaviours, tasks, taskMarks,
      note: "Photos are not included in this file. Download them from each student's profile.",
    }, null, 2);
    return new Response(body, { headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="register-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    } });
  } catch (error) {
    return serverError("account export", error);
  }
}
