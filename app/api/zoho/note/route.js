import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { STUDENTS } from "@/utils/schema";
import { badRequest, notFound, serverError } from "@/lib/auth";
import { readJson, cleanId } from "@/lib/validate";
import { loadMarks, loadDaysOff } from "@/lib/data";
import { monthKeysBetween, schoolYearStart, summarise, todayIso } from "@/lib/register";
import { zohoContext } from "@/lib/zoho-routes";
import { api } from "@/lib/providers/zoho";
import { attendanceNote } from "@/lib/notes";

export const dynamic = "force-dynamic";

// POST /api/zoho/note { studentId }: adds an attendance summary note to the linked Contact.
// The note is built here from stored marks, so the browser cannot send anything else to Zoho.
export async function POST(req) {
  const body = await readJson(req);
  const id = cleanId(body?.studentId);
  if (id.error) return badRequest("Student id is not valid.");
  const ctx = await zohoContext();
  if (ctx.error) return ctx.error;
  const link = ctx.conn.settings.links?.[id.value];
  if (!link) return badRequest("Link this student to a Zoho Contact first.");
  try {
    const [s] = await db.select({ name: STUDENTS.name, className: STUDENTS.grade }).from(STUDENTS)
      .where(and(eq(STUDENTS.id, id.value), eq(STUDENTS.ownerId, ctx.ownerId))).limit(1);
    if (!s) return notFound("Student not found.");
    const today = todayIso(), start = schoolYearStart(today);
    const daysOff = new Set((await loadDaysOff(ctx.ownerId)).map((d) => d.day));
    const marks = (await loadMarks(ctx.ownerId, monthKeysBetween(start, today), [id.value])).filter((m) => m.iso >= start && m.iso <= today);
    const note = attendanceNote(s, summarise(marks, daysOff), today);
    await api(ctx.conn, `/Contacts/${link.id}/Notes`, { method: "POST", body: JSON.stringify({ data: [{ Note_Title: note.title, Note_Content: note.body }] }) });
    return NextResponse.json({ sent: true, to: link.name });
  } catch (error) {
    return serverError("zoho note", error);
  }
}
