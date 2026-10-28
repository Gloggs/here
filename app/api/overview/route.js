import { NextResponse } from "next/server";
import { getOwnerId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { loadClasses, loadStudents, loadMarks, loadDaysOff } from "@/lib/data";
import { LOW_ATTENDANCE, monthKeysBetween, parseIso, registerStreak, schoolYearStart, summarise, weekStart, todayIso } from "@/lib/register";

export const dynamic = 'force-dynamic';

// GET /api/overview?date=YYYY-MM-DD: today at a glance, the week so far and who needs a look.
export async function GET(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const d = parseIso(req.nextUrl.searchParams.get("date") ?? todayIso());
  if (!d) return badRequest("Date must look like YYYY-MM-DD.");
  try {
    const [classes, students, daysOffRows] = await Promise.all([
      loadClasses(ownerId), loadStudents(ownerId), loadDaysOff(ownerId),
    ]);
    const daysOff = new Set(daysOffRows.map((r) => r.day));
    const start = schoolYearStart(d.iso);
    const marks = (await loadMarks(ownerId, monthKeysBetween(start, d.iso)))
      .filter((m) => m.iso >= start && m.iso <= d.iso);

    const today = marks.filter((m) => m.iso === d.iso);
    const week = marks.filter((m) => m.iso >= weekStart(d.iso));
    const byStudent = new Map();
    for (const m of marks) {
      if (!byStudent.has(m.studentId)) byStudent.set(m.studentId, []);
      byStudent.get(m.studentId).push(m);
    }

    const markedToday = new Set(today.map((m) => m.studentId));
    const classRows = classes.map((c) => {
      const inClass = students.filter((s) => s.className === c.name);
      const done = inClass.filter((s) => markedToday.has(s.id)).length;
      return { id: c.id, name: c.name, students: inClass.length, markedToday: done };
    });

    const watch = students.map((s) => {
      const sum = summarise(byStudent.get(s.id) ?? [], daysOff);
      return { id: s.id, name: s.name, className: s.className, classId: classes.find((c) => c.name === s.className)?.id ?? null, ...sum };
    }).filter((s) => s.pct !== null && s.pct < LOW_ATTENDANCE)
      .sort((a, b) => a.pct - b.pct).slice(0, 10);

    const unexplained = marks.filter((m) => m.status === 'absent' && (!m.reason || m.reason === 'No reason given'))
      .slice(-50).reverse()
      .map((m) => {
        const st = students.find((s) => s.id === m.studentId);
        return { ...m, name: st?.name ?? '', className: st?.className ?? '', classId: classes.find((c) => c.name === st?.className)?.id ?? null };
      });

    return NextResponse.json({
      date: d.iso, isDayOff: daysOff.has(d.iso),
      today: summarise(today, daysOff), week: summarise(week, daysOff), year: summarise(marks, daysOff),
      classes: classRows, watch, unexplained: unexplained.slice(0, 10),
      totals: { classes: classes.length, students: students.length },
      streak: registerStreak(new Set(marks.map((m) => m.iso)), d.iso, daysOff),
      reasonsGiven: marks.some((m) => m.status === "absent" && m.reason && m.reason !== "No reason given"),
      threshold: LOW_ATTENDANCE,
    });
  } catch (error) {
    return serverError("overview GET", error);
  }
}
