// What Here. sends to a CRM and what it takes from one. Pure functions only, so they are
// easy to test and the same code serves Zoho and the built-in sample CRM.
import { LOW_ATTENDANCE, addDays, weekdayOf } from "./register.js";

/** The three fields Here. fills in on a Contact. Create them in Zoho with these API names. */
export const FIELD_NAMES = { attendance: "Here_Attendance", status: "Here_Status", lastMarked: "Here_Last_Marked" };
export const SNOOZE_DAYS = 14;

/** Consecutive absences, newest first. Days off are skipped; any other mark ends the run. */
export function absenceRun(marks, daysOff = new Set()) {
  const sorted = marks.filter((m) => !daysOff.has(m.iso)).sort((a, b) => (a.iso < b.iso ? 1 : -1));
  let run = 0;
  for (const m of sorted) { if (m.status === "absent") run++; else break; }
  return run;
}

/** Why a student needs a check-in, or null. Needs a few marks before judging percentages. */
export function riskOf(summary, run, threshold = LOW_ATTENDANCE) {
  const reasons = [];
  if (run >= 3) reasons.push(`${run} absences in a row`);
  if (summary.marked >= 5 && summary.pct !== null && summary.pct < threshold) reasons.push(`attendance ${summary.pct}%, below ${threshold}%`);
  return reasons.length ? { text: reasons.join(" and ") } : null;
}

/** The Contact fields to write. Numbers and dates only; nothing free-typed reaches the CRM. */
export function attendanceFields(summary, risk, lastMarked) {
  return {
    [FIELD_NAMES.attendance]: summary.pct,
    [FIELD_NAMES.status]: summary.marked === 0 ? "No marks yet" : risk ? "Check in" : "On track",
    [FIELD_NAMES.lastMarked]: lastMarked || null,
  };
}

/** The Zoho Task for a student who needs a check-in. Due in two working days. */
export function taskFor(student, summary, risk, todayIso) {
  let due = addDays(todayIso, 2);
  const w = weekdayOf(due);
  if (w === 6) due = addDays(due, 2); else if (w === 0) due = addDays(due, 1);
  const first = String(student.name).split(" ")[0];
  return {
    subject: `Check in with ${first}: ${risk.text}`.slice(0, 200),
    due,
    description: [
      `${student.name} (${student.className}). ${risk.text}.`,
      `Attendance this school year: ${summary.pct === null ? "no marks yet" : `${summary.pct}%`}.`,
      "Created from Here. after you approved it.",
    ].join("\n"),
  };
}

/** True when a suggestion was dealt with in the last SNOOZE_DAYS days. */
export function snoozed(tasked, studentId, todayIso) {
  const done = tasked?.[studentId];
  return typeof done === "string" && done > addDays(todayIso, -SNOOZE_DAYS);
}

const PHONE_OK = /^[0-9+()\-\s]{1,20}$/;

/** Turns what a CRM holds about a contact into what a Here. student needs. Never trusts length or characters. */
export function studentFromContact(c) {
  const name = String(c?.name || "").replace(/\s+/g, " ").trim().slice(0, 50);
  if (!name) return null;
  const phone = [c.mobile, c.phone].map((p) => String(p || "").trim()).find((p) => PHONE_OK.test(p)) || null;
  return { name, contact: phone };
}

const ID_OK = /^[A-Za-z0-9_-]{1,25}$/;
export const validContactIds = (ids, max = 100) => Array.isArray(ids) && ids.length > 0 && ids.length <= max && ids.every((i) => typeof i === "string" && ID_OK.test(i));
