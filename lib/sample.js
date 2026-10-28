// The sample class: twelve made-up students with four weeks of marks, points and tasks.
// Used by Settings, the empty Today page and the no-sign-up demo.
import { and, eq } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { CLASSES, POINTS, STUDENTS, TASKS, TASK_MARKS } from "@/utils/schema";
import { removeStudents, removeTasksOfClass } from "@/lib/cleanup";
import { DEFAULT_BEHAVIOURS } from "@/lib/insights";
import { addDays, storedKey, todayIso, weekdayOf } from "@/lib/register";
import { upsertMarks } from "@/lib/marks";

const CLASS_NAME = "Sample 10B";
const NAMES = ["Amara Okafor", "Ben Hughes", "Chloe Patel", "Daniel Wright", "Ella Brown", "Farah Khan",
  "George Evans", "Hana Nowak", "Isaac Mensah", "Jade Wilson", "Kian Murphy", "Lily Chen"];
// How often each sample student is away, so the overview has something to show.
const AWAY = [0.02, 0.05, 0.03, 0.15, 0.04, 0.08, 0.22, 0.03, 0.06, 0.12, 0.04, 0.02];
const REASONS = ["Illness", "Appointment", "No reason given", "Illness", "Holiday"];

function rand(seed) { let x = seed; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; }

export async function addSample(ownerId) {
    const existing = await db.select({ id: CLASSES.id }).from(CLASSES)
      .where(and(eq(CLASSES.ownerId, ownerId), eq(CLASSES.isSample, true))).limit(1);
    if (existing.length) return { error: "The sample class is already loaded." };
    const [cls] = await db.insert(CLASSES).values({ ownerId, name: CLASS_NAME, isSample: true, goalPct: 96, goalReward: "Film on Friday afternoon" })
      .onConflictDoNothing().returning({ id: CLASSES.id });
    const students = await db.insert(STUDENTS)
      .values(NAMES.map((name) => ({ ownerId, name, grade: CLASS_NAME, isSample: true })))
      .returning({ id: STUDENTS.id });

    const r = rand(students[0].id);
    const rows = [];
    let day = todayIso(), weekdays = 0;
    while (weekdays < 20) {
      day = addDays(day, -1);
      const w = weekdayOf(day);
      if (w === 0 || w === 6) continue;
      weekdays++;
      const key = storedKey(day);
      students.forEach((s, i) => {
        const x = r();
        const status = x < AWAY[i] ? 'absent' : x < AWAY[i] + 0.05 ? 'late' : 'present';
        rows.push({ studentId: s.id, ...key, status, reason: status === 'absent' ? REASONS[Math.floor(r() * REASONS.length)] : null });
      });
    }
    await upsertMarks(ownerId, rows);

    // A few weeks of behaviour points, mostly positive, as a real class would have.
    const good = DEFAULT_BEHAVIOURS.filter((b) => b.value > 0), work = DEFAULT_BEHAVIOURS.filter((b) => b.value < 0);
    const points = [];
    for (let i = 0; i < 60; i++) {
      const s = students[Math.floor(r() * students.length)];
      const b = r() < 0.85 ? good[Math.floor(r() * good.length)] : work[Math.floor(r() * work.length)];
      const when = new Date(Date.now() - Math.floor(r() * 21) * 86400000);
      points.push({ ownerId, studentId: s.id, behaviour: b.name, value: b.value, createdAt: when });
    }
    await db.insert(POINTS).values(points);

    // Group tasks: three done, one due this week, with each person's share of the work.
    if (cls) {
      const titles = ["Volcano poster", "Book review", "Science write-up", "Maths investigation"];
      for (let t = 0; t < titles.length; t++) {
        const due = addDays(todayIso(), (t - 3) * 7 + 2);
        const [task] = await db.insert(TASKS).values({ ownerId, classId: cls.id, title: titles[t], due }).returning({ id: TASKS.id });
        if (due > todayIso()) continue;
        const marks = students.map((s, i) => {
          const x = r();
          const status = x < AWAY[i] * 2 ? 'missed' : x < AWAY[i] * 2 + 0.12 ? 'late' : 'done';
          return { ownerId, taskId: task.id, studentId: s.id, status, share: status === 'missed' ? null : 5 + Math.floor(r() * 10) };
        });
        await db.insert(TASK_MARKS).values(marks);
      }
    }
  return { className: CLASS_NAME, students: students.length };
}

export async function removeSample(ownerId) {
    const ids = (await db.select({ id: STUDENTS.id }).from(STUDENTS)
      .where(and(eq(STUDENTS.ownerId, ownerId), eq(STUDENTS.isSample, true)))).map((s) => s.id);
    await removeStudents(ownerId, ids);
    const classes = await db.select({ id: CLASSES.id }).from(CLASSES).where(and(eq(CLASSES.ownerId, ownerId), eq(CLASSES.isSample, true)));
    for (const c of classes) await removeTasksOfClass(ownerId, c.id);
    await db.delete(CLASSES).where(and(eq(CLASSES.ownerId, ownerId), eq(CLASSES.isSample, true)));
  return { removed: ids.length };
}
