import { getOwnerId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { cleanText } from "@/lib/validate";
import { loadStudents, loadMarks, loadDaysOff } from "@/lib/data";
import { markCode, monthKeysBetween, parseIso, summarise, toCsv } from "@/lib/register";

export const dynamic = 'force-dynamic';

// GET /api/export?class=Name&from=&to=&kind=summary|marks : CSV download.
export async function GET(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const p = req.nextUrl.searchParams;
  const cls = cleanText(p.get("class"), { max: 30 });
  const from = parseIso(p.get("from")), to = parseIso(p.get("to"));
  if (cls.error || !from || !to || from.iso > to.iso) return badRequest("Class or dates are not valid.");
  const kind = p.get("kind") === "marks" ? "marks" : "summary";
  try {
    const students = await loadStudents(ownerId, cls.value);
    const daysOff = new Set((await loadDaysOff(ownerId)).map((d) => d.day));
    const marks = (await loadMarks(ownerId, monthKeysBetween(from.iso, to.iso), students.map((s) => s.id)))
      .filter((m) => m.iso >= from.iso && m.iso <= to.iso);
    const name = new Map(students.map((s) => [s.id, s]));
    let csv;
    if (kind === "marks") {
      csv = toCsv(["Date", "Student", "Class", "Code", "Status", "Reason", "Note"],
        marks.sort((a, b) => a.iso.localeCompare(b.iso))
          .map((m) => [m.iso, name.get(m.studentId)?.name, name.get(m.studentId)?.className, markCode(m), m.status, m.reason, m.note]));
    } else {
      csv = toCsv(["Student", "Class", "Sessions", "Present", "Late", "Absent", "Unexplained", "Attendance %"],
        students.map((s) => {
          const sum = summarise(marks.filter((m) => m.studentId === s.id), daysOff);
          return [s.name, s.className, sum.marked, sum.present, sum.late, sum.absent, sum.unexplained, sum.pct ?? ""];
        }));
    }
    const file = `register-${kind}-${from.iso}-to-${to.iso}.csv`;
    return new Response(csv, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    } });
  } catch (error) {
    return serverError("export GET", error);
  }
}
