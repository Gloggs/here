import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/utils/dbConfig';
import { BEHAVIOURS, CLASSES, STUDENTS, TASKS } from '@/utils/schema';
import { DEFAULT_BEHAVIOURS } from '@/lib/insights';

// Small ownership checks shared by the routes. Each returns null when the item
// is not this account's, so a route can answer 404 without saying why.

export async function ownedStudent(ownerId, id) {
  const r = await db.select({ id: STUDENTS.id, name: STUDENTS.name, className: STUDENTS.grade, photoConsent: STUDENTS.photoConsent })
    .from(STUDENTS).where(and(eq(STUDENTS.id, id), eq(STUDENTS.ownerId, ownerId))).limit(1);
  return r[0] || null;
}

export async function ownedClass(ownerId, id) {
  const r = await db.select({ id: CLASSES.id, name: CLASSES.name }).from(CLASSES)
    .where(and(eq(CLASSES.id, id), eq(CLASSES.ownerId, ownerId))).limit(1);
  return r[0] || null;
}

export async function ownedTask(ownerId, id) {
  const r = await db.select({ id: TASKS.id, classId: TASKS.classId }).from(TASKS)
    .where(and(eq(TASKS.id, id), eq(TASKS.ownerId, ownerId))).limit(1);
  return r[0] || null;
}

export async function studentIdsOfClass(ownerId, className) {
  return (await db.select({ id: STUDENTS.id }).from(STUDENTS)
    .where(and(eq(STUDENTS.ownerId, ownerId), eq(STUDENTS.grade, className)))).map((s) => s.id);
}

/** This account's behaviours, or the built-in list when it has not made its own. */
export async function loadBehaviours(ownerId) {
  const rows = await db.select({ name: BEHAVIOURS.name, value: BEHAVIOURS.value }).from(BEHAVIOURS)
    .where(eq(BEHAVIOURS.ownerId, ownerId)).orderBy(asc(BEHAVIOURS.position));
  return rows.length ? rows : DEFAULT_BEHAVIOURS;
}

