import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { STUDENTS } from "@/utils/schema";
import { getOwnerId, unauthorized, badRequest, notFound, serverError } from "@/lib/auth";
import { cleanId } from "@/lib/validate";
import { loadMarks, loadDaysOff } from "@/lib/data";
import { LOW_ATTENDANCE, WEEKDAYS, monthKeysBetween, schoolYearStart, summarise, todayIso, weekdayOf } from "@/lib/register";

export const dynamic = 'force-dynamic';

// GET /api/student/N: one student's details, this school year's marks and patterns.
export async function GET(_req, { params }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const id = cleanId(params.id);
  if (id.error) return badRequest("Student id is not valid.");
  try {
    const rows = await db.select({
      id: STUDENTS.id, name: STUDENTS.name, className: STUDENTS.grade,
      address: STUDENTS.address, contact: STUDENTS.contact,
      photoConsent: STUDENTS.photoConsent, photoAt: STUDENTS.photoAt,
    }).from(STUDENTS).where(and(eq(STUDENTS.id, id.value), eq(STUDENTS.ownerId, ownerId))).limit(1);
    if (!rows.length) return notFound("Student not found.");

    const today = todayIso();
    const start = schoolYearStart(today);
    const daysOff = new Set((await loadDaysOff(ownerId)).map((d) => d.day));
    const marks = (await loadMarks(ownerId, monthKeysBetween(start, today), [id.value]))
      .filter((m) => m.iso >= start && m.iso <= today)
      .sort((a, b) => (a.iso < b.iso ? 1 : -1));

    const byWeekday = [1, 2, 3, 4, 5].map((w) => ({
      day: WEEKDAYS[w], ...summarise(marks.filter((m) => weekdayOf(m.iso) === w), daysOff),
    }));
    const reasons = {};
    for (const m of marks) if (m.status === 'absent') reasons[m.reason ?? 'No reason given'] = (reasons[m.reason ?? 'No reason given'] ?? 0) + 1;

    return NextResponse.json({
      student: rows[0], summary: summarise(marks, daysOff), threshold: LOW_ATTENDANCE,
      byWeekday, reasons, recent: marks.slice(0, 30).map(({ markedAt, ...m }) => m),
    });
  } catch (error) {
    return serverError("student profile GET", error);
  }
}
