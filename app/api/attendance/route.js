import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { ATTENDANCE } from "@/utils/schema";
import { getOwnerId, unauthorized, badRequest, notFound, serverError } from "@/lib/auth";
import { cleanText, cleanId, readJson } from "@/lib/validate";
import { loadStudents, loadMarks, loadDaysOff } from "@/lib/data";
import { monthKeysBetween, parseIso, storedKey } from "@/lib/register";
import { readMarkInput, ownedStudentIds, upsertMarks } from "@/lib/marks";

export const dynamic = 'force-dynamic';

// GET /api/attendance?class=Name&from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns { students, marks: [{ studentId, iso, status, reason, note }], daysOff }
export async function GET(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const p = req.nextUrl.searchParams;
  const cls = cleanText(p.get("class"), { max: 30, required: true });
  if (cls.error) return badRequest("Please choose a class.");
  const from = parseIso(p.get("from")), to = parseIso(p.get("to"));
  if (!from || !to || from.iso > to.iso) return badRequest("Dates must look like YYYY-MM-DD.");
  try {
    const students = await loadStudents(ownerId, cls.value);
    const marks = (await loadMarks(ownerId, monthKeysBetween(from.iso, to.iso), students.map((s) => s.id)))
      .filter((m) => m.iso >= from.iso && m.iso <= to.iso)
      .map(({ markedAt, ...m }) => m);
    const daysOff = (await loadDaysOff(ownerId)).filter((d) => d.day >= from.iso && d.day <= to.iso);
    return NextResponse.json({ students, marks, daysOff });
  } catch (error) {
    return serverError("attendance GET", error);
  }
}

// POST /api/attendance { studentId, date: YYYY-MM-DD, status, reason?, note? }
export async function POST(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const body = await readJson(req);
  if (!body) return badRequest("Please send the mark.");
  const id = cleanId(body.studentId);
  if (id.error) return badRequest("Student id is not valid.");
  const { values, error } = readMarkInput(body);
  if (error) return badRequest(error);
  try {
    if (!(await ownedStudentIds(ownerId, [id.value])).length) return notFound("Student not found.");
    await upsertMarks(ownerId, [{ ...values, studentId: id.value }]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("attendance POST", error);
  }
}

// DELETE /api/attendance?studentId=N&date=YYYY-MM-DD: clears a mark.
export async function DELETE(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const p = req.nextUrl.searchParams;
  const id = cleanId(p.get("studentId"));
  const key = storedKey(p.get("date"));
  if (id.error || !key) return badRequest("Student or date is not valid.");
  try {
    await db.delete(ATTENDANCE).where(and(
      eq(ATTENDANCE.ownerId, ownerId), eq(ATTENDANCE.studentId, id.value),
      eq(ATTENDANCE.date, key.date), eq(ATTENDANCE.day, key.day),
    ));
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("attendance DELETE", error);
  }
}
