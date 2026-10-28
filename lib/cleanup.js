import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/utils/dbConfig';
import { ATTENDANCE, BEHAVIOURS, CLASSES, DAYS_OFF, POINTS, STUDENTS, STUDENT_PHOTOS, TASK_MARKS, TASKS, PROFILES } from '@/utils/schema';

/** Removes students and everything that belongs to them: marks, photos, points, task results. */
export async function removeStudents(ownerId, ids) {
  if (!ids.length) return;
  const mine = (t) => and(eq(t.ownerId, ownerId), inArray(t.studentId, ids));
  await db.delete(ATTENDANCE).where(mine(ATTENDANCE));
  await db.delete(STUDENT_PHOTOS).where(mine(STUDENT_PHOTOS));
  await db.delete(POINTS).where(mine(POINTS));
  await db.delete(TASK_MARKS).where(mine(TASK_MARKS));
  await db.delete(STUDENTS).where(and(eq(STUDENTS.ownerId, ownerId), inArray(STUDENTS.id, ids)));
}

/** Removes a group's tasks and their results. */
export async function removeTasksOfClass(ownerId, classId) {
  const ids = (await db.select({ id: TASKS.id }).from(TASKS)
    .where(and(eq(TASKS.ownerId, ownerId), eq(TASKS.classId, classId)))).map((t) => t.id);
  if (ids.length) await db.delete(TASK_MARKS).where(and(eq(TASK_MARKS.ownerId, ownerId), inArray(TASK_MARKS.taskId, ids)));
  await db.delete(TASKS).where(and(eq(TASKS.ownerId, ownerId), eq(TASKS.classId, classId)));
}

/** Removes every record an account owns. Used by "Delete all my data" and when a demo ends. */
export async function removeAccount(ownerId) {
  for (const t of [ATTENDANCE, STUDENT_PHOTOS, POINTS, TASK_MARKS, TASKS, BEHAVIOURS, STUDENTS, CLASSES, DAYS_OFF]) {
    await db.delete(t).where(eq(t.ownerId, ownerId));
  }
}

/** Removes the chosen display name. Quiet if the profiles table is not there yet. */
export async function removeProfile(userId) {
  try { await db.delete(PROFILES).where(eq(PROFILES.ownerId, userId)); }
  catch (error) { console.error("[removeProfile]", error.message); }
}
