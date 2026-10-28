// Server-side helpers shared by Zoho and the sample CRM. Every query is filtered by ownerId.
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { STUDENTS } from "@/utils/schema";
import { limitsFor } from "@/lib/guest";
import { classExists, loadDaysOff, loadMarks } from "@/lib/data";
import { monthKeysBetween, schoolYearStart, summarise, todayIso } from "@/lib/register";
import { absenceRun, attendanceFields, riskOf, studentFromContact, taskFor } from "@/lib/crm";
import { attendanceNote } from "@/lib/notes";

/**
 * Everything a CRM might be sent about these students, built from stored marks.
 * Students that are not this owner's are simply left out.
 */
export async function studentFacts(ownerId, ids) {
  const wanted = [...new Set(ids)].slice(0, 100);
  if (!wanted.length) return [];
  const rows = await db.select({ id: STUDENTS.id, name: STUDENTS.name, className: STUDENTS.grade }).from(STUDENTS)
    .where(and(eq(STUDENTS.ownerId, ownerId), inArray(STUDENTS.id, wanted)));
  if (!rows.length) return [];
  const today = todayIso(), start = schoolYearStart(today);
  const daysOff = new Set((await loadDaysOff(ownerId)).map((d) => d.day));
  const marks = (await loadMarks(ownerId, monthKeysBetween(start, today), rows.map((r) => r.id)))
    .filter((m) => m.iso >= start && m.iso <= today);
  return rows.map((s) => {
    const mine = marks.filter((m) => m.studentId === s.id);
    const summary = summarise(mine, daysOff);
    const risk = riskOf(summary, absenceRun(mine, daysOff));
    const lastMarked = mine.reduce((latest, m) => (!latest || m.iso > latest ? m.iso : latest), null);
    return {
      student: s, summary, risk,
      note: attendanceNote(s, summary, today),
      fields: attendanceFields(summary, risk, lastMarked),
      task: risk ? taskFor(s, summary, risk, today) : null,
    };
  });
}

/**
 * Adds students from CRM contacts to one of the owner's classes. The class must exist and the
 * owner's student limit applies. Returns the new student ids paired with their contact ids.
 */
export async function importStudents(ownerId, className, contacts) {
  if (!(await classExists(ownerId, className))) return { error: "Please choose one of your classes." };
  const people = contacts.map((c) => ({ contactId: c.id, person: studentFromContact(c) })).filter((x) => x.person);
  if (!people.length) return { added: [], skipped: contacts.length };
  const [{ n }] = await db.select({ n: sql`count(*)::int` }).from(STUDENTS).where(eq(STUDENTS.ownerId, ownerId));
  const room = limitsFor(ownerId).students - n;
  if (room <= 0) return { error: `You are at the limit of ${limitsFor(ownerId).students} students.` };
  const take = people.slice(0, room);
  const created = await db.insert(STUDENTS)
    .values(take.map(({ person }) => ({ ownerId, name: person.name, grade: className, contact: person.contact })))
    .returning({ id: STUDENTS.id });
  return {
    added: created.map((s, i) => ({ studentId: s.id, contactId: take[i].contactId, name: take[i].person.name })),
    skipped: contacts.length - created.length,
  };
}
