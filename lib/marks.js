import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/utils/dbConfig';
import { ATTENDANCE, STUDENTS } from '@/utils/schema';
import { STATUSES, REASONS, storedKey } from '@/lib/register';
import { cleanText } from '@/lib/validate';

/** Checks a mark from the browser. Returns { values } or { error }. */
export function readMarkInput(body) {
  const key = storedKey(body?.date);
  if (!key) return { error: 'Date must look like YYYY-MM-DD.' };
  if (!STATUSES.includes(body.status)) return { error: 'Status must be present, late or absent.' };
  let reason = null;
  if (body.status === 'absent' && body.reason != null) {
    if (!REASONS.includes(body.reason)) return { error: 'Please choose a listed reason.' };
    reason = body.reason;
  }
  const note = cleanText(body.note, { max: 200 });
  if (note.error) return { error: `Note ${note.error}.` };
  return { values: { ...key, status: body.status, reason, note: note.value } };
}

/** Keeps only ids that belong to this account. */
export async function ownedStudentIds(ownerId, ids) {
  if (!ids.length) return [];
  const rows = await db.select({ id: STUDENTS.id }).from(STUDENTS)
    .where(and(eq(STUDENTS.ownerId, ownerId), inArray(STUDENTS.id, ids)));
  return rows.map((r) => r.id);
}

/** Inserts or replaces one mark per (student, day). */
export function upsertMarks(ownerId, rows) {
  if (!rows.length) return Promise.resolve([]);
  const now = new Date();
  const values = rows.map((r) => ({
    ownerId, studentId: r.studentId, date: r.date, day: r.day,
    status: r.status, present: r.status !== 'absent', reason: r.reason ?? null, note: r.note ?? null, markedAt: now,
  }));
  return db.insert(ATTENDANCE).values(values).onConflictDoUpdate({
    target: [ATTENDANCE.ownerId, ATTENDANCE.studentId, ATTENDANCE.date, ATTENDANCE.day],
    set: {
      status: sqlExcluded('status'), present: sqlExcluded('present'), reason: sqlExcluded('reason'),
      note: sqlExcluded('note'), markedAt: sqlExcluded('marked_at'),
    },
  });
}

function sqlExcluded(col) { return sql.raw(`excluded.${col}`); }
