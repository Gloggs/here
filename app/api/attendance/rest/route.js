import { NextResponse } from "next/server";
import { getOwnerId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { cleanText, readJson } from "@/lib/validate";
import { loadStudents, loadMarks } from "@/lib/data";
import { parseIso } from "@/lib/register";
import { upsertMarks } from "@/lib/marks";

export const dynamic = 'force-dynamic';

// POST /api/attendance/rest { className, date }: marks everyone not yet marked as present.
export async function POST(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const body = await readJson(req);
  const cls = cleanText(body?.className, { max: 30, required: true });
  const d = parseIso(body?.date);
  if (cls.error || !d) return badRequest("Class or date is not valid.");
  try {
    const students = await loadStudents(ownerId, cls.value);
    const marked = new Set((await loadMarks(ownerId, [d.monthKey], students.map((s) => s.id)))
      .filter((m) => m.iso === d.iso).map((m) => m.studentId));
    const rows = students.filter((s) => !marked.has(s.id))
      .map((s) => ({ studentId: s.id, date: d.monthKey, day: d.day, status: 'present' }));
    await upsertMarks(ownerId, rows);
    return NextResponse.json({ marked: rows.length });
  } catch (error) {
    return serverError("attendance rest POST", error);
  }
}
