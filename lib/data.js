import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/utils/dbConfig';
import { ATTENDANCE, CLASSES, DAYS_OFF, STUDENTS } from '@/utils/schema';
import { markFromRow } from '@/lib/register';

// Owner-scoped loaders. Every function takes ownerId and filters on it.

export function loadClasses(ownerId) {
  return db.select({ id: CLASSES.id, name: CLASSES.name, isSample: CLASSES.isSample, kind: CLASSES.kind, goalPct: CLASSES.goalPct, goalReward: CLASSES.goalReward })
    .from(CLASSES).where(eq(CLASSES.ownerId, ownerId)).orderBy(asc(CLASSES.name));
}

export function loadStudents(ownerId, className) {
  const where = className
    ? and(eq(STUDENTS.ownerId, ownerId), eq(STUDENTS.grade, className))
    : eq(STUDENTS.ownerId, ownerId);
  return db.select({
    id: STUDENTS.id, name: STUDENTS.name, className: STUDENTS.grade,
    address: STUDENTS.address, contact: STUDENTS.contact, isSample: STUDENTS.isSample,
    photoConsent: STUDENTS.photoConsent, photoAt: STUDENTS.photoAt,
  }).from(STUDENTS).where(where).orderBy(asc(STUDENTS.name));
}

export async function loadMarks(ownerId, monthKeys, studentIds) {
  if (!monthKeys.length) return [];
  const conds = [eq(ATTENDANCE.ownerId, ownerId), inArray(ATTENDANCE.date, monthKeys)];
  if (studentIds) {
    if (!studentIds.length) return [];
    conds.push(inArray(ATTENDANCE.studentId, studentIds));
  }
  const rows = await db.select({
    studentId: ATTENDANCE.studentId, date: ATTENDANCE.date, day: ATTENDANCE.day,
    present: ATTENDANCE.present, status: ATTENDANCE.status, reason: ATTENDANCE.reason,
    note: ATTENDANCE.note, markedAt: ATTENDANCE.markedAt,
  }).from(ATTENDANCE).where(and(...conds));
  return rows.map((r) => ({ ...markFromRow(r), markedAt: r.markedAt }));
}

export async function loadDaysOff(ownerId) {
  const rows = await db.select({ id: DAYS_OFF.id, day: DAYS_OFF.day, label: DAYS_OFF.label })
    .from(DAYS_OFF).where(eq(DAYS_OFF.ownerId, ownerId)).orderBy(asc(DAYS_OFF.day));
  return rows.map((r) => ({ ...r, day: typeof r.day === 'string' ? r.day : new Date(r.day).toISOString().slice(0, 10) }));
}

export async function classExists(ownerId, name) {
  const r = await db.select({ id: CLASSES.id }).from(CLASSES)
    .where(and(eq(CLASSES.ownerId, ownerId), eq(CLASSES.name, name))).limit(1);
  return r.length > 0;
}
