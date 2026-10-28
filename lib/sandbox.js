// Tools for the sandbox space: quick ways to make the practice data look like a real
// term, so people can see how the app reacts before trusting it with real pupils.
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { CLASSES, STUDENTS } from "@/utils/schema";
import { removeAccount } from "@/lib/cleanup";
import { addSample } from "@/lib/sample";
import { upsertMarks } from "@/lib/marks";
import { addDays, storedKey, todayIso, weekdayOf } from "@/lib/register";

const EXTRA = ["Maya Singh", "Noah Adeyemi", "Olivia Price", "Priya Shah", "Quinn Taylor", "Ruby Ali",
  "Sam O'Neill", "Tara Begum", "Umar Hussain", "Vera Kowalski", "Will Jones", "Zara Ahmed"];
const REASONS = ["Illness", "Appointment", "No reason given"];

export const SANDBOX_ACTIONS = ["reset", "clear", "fill-today", "bad-week", "add-students"];

function lastWeekday(iso) {
  let d = iso;
  while ([0, 6].includes(weekdayOf(d))) d = addDays(d, -1);
  return d;
}

async function students(ownerId) {
  return db.select({ id: STUDENTS.id, grade: STUDENTS.grade }).from(STUDENTS).where(eq(STUDENTS.ownerId, ownerId));
}

/** Runs one sandbox tool and returns a short sentence describing what changed. */
export async function runSandbox(ownerId, action) {
  if (action === "reset") {
    await removeAccount(ownerId);
    await addSample(ownerId);
    return "The sandbox is back to the sample class.";
  }
  if (action === "clear") {
    await removeAccount(ownerId);
    return "The sandbox is empty. Try setting up a class from scratch.";
  }
  const all = await students(ownerId);
  if (action === "fill-today") {
    if (!all.length) return "Add a class first.";
    const day = lastWeekday(todayIso());
    const key = storedKey(day);
    await upsertMarks(ownerId, all.map((s) => {
      const x = Math.random();
      const status = x < 0.06 ? "absent" : x < 0.11 ? "late" : "present";
      return { studentId: s.id, ...key, status, reason: status === "absent" ? REASONS[Math.floor(Math.random() * REASONS.length)] : null };
    }));
    return `Marked ${all.length} students for ${day === todayIso() ? "today" : "the last school day"}.`;
  }
  if (action === "bad-week") {
    if (all.length < 3) return "Add a few students first.";
    const picked = [...all].sort(() => Math.random() - 0.5).slice(0, 3);
    const rows = [];
    let day = addDays(todayIso(), -1), n = 0;
    while (n < 5) {
      if (![0, 6].includes(weekdayOf(day))) {
        n++;
        for (const s of picked) if (Math.random() < 0.8) rows.push({ studentId: s.id, ...storedKey(day), status: "absent", reason: REASONS[Math.floor(Math.random() * REASONS.length)] });
      }
      day = addDays(day, -1);
    }
    await upsertMarks(ownerId, rows);
    return "Three students missed most of the last week. Check Today and Reports to see them flagged.";
  }
  if (action === "add-students") {
    const [cls] = await db.select({ name: CLASSES.name }).from(CLASSES).where(eq(CLASSES.ownerId, ownerId)).limit(1);
    if (!cls) return "Add a class first.";
    const taken = new Set((await db.select({ name: STUDENTS.name }).from(STUDENTS)
      .where(and(eq(STUDENTS.ownerId, ownerId), inArray(STUDENTS.name, EXTRA)))).map((s) => s.name));
    const names = EXTRA.filter((n) => !taken.has(n)).slice(0, 5);
    if (!names.length) return "Every practice student is already here.";
    await db.insert(STUDENTS).values(names.map((name) => ({ ownerId, name, grade: cls.name, isSample: true })));
    return `Added ${names.length} students to ${cls.name}.`;
  }
  return null;
}
