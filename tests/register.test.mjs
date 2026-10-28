import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseIso, isoFromMark, monthKeysBetween, weekStart, weekdayOf, markFromRow,
  summarise, csvCell, toCsv, schoolYearStart, addDays, storedKey, markCode, registerStreak,
} from "../lib/register.js";

test("parseIso accepts real dates and rejects impossible ones", () => {
  assert.deepEqual(parseIso("2026-10-28"), { iso: "2026-10-28", year: 2026, month: 10, day: 28, monthKey: "10/2026" });
  assert.equal(parseIso("2026-02-30"), null);
  assert.equal(parseIso("2024-02-29")?.day, 29); // leap year
  assert.equal(parseIso("2026-13-01"), null);
  assert.equal(parseIso("28/10/2026"), null);
  assert.equal(parseIso(undefined), null);
});

test("stored month keys convert back to ISO dates", () => {
  assert.equal(isoFromMark("03/2026", 7), "2026-03-07");
  assert.deepEqual(storedKey("2026-03-07"), { date: "03/2026", day: 7 });
});

test("monthKeysBetween spans years", () => {
  assert.deepEqual(monthKeysBetween("2025-11-15", "2026-02-01"), ["11/2025", "12/2025", "01/2026", "02/2026"]);
});

test("weeks start on Monday and the school year on 1 September", () => {
  assert.equal(weekStart("2026-10-28"), "2026-10-26"); // Wednesday -> Monday
  assert.equal(weekStart("2026-11-01"), "2026-10-26"); // Sunday belongs to the week before
  assert.equal(weekdayOf("2026-10-28"), 3);
  assert.equal(schoolYearStart("2026-10-28"), "2026-09-01");
  assert.equal(schoolYearStart("2027-03-01"), "2026-09-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("old rows without a status fall back to the present flag", () => {
  assert.equal(markFromRow({ studentId: 1, date: "10/2026", day: 1, present: true }).status, "present");
  assert.equal(markFromRow({ studentId: 1, date: "10/2026", day: 1, present: false }).status, "absent");
  assert.equal(markFromRow({ studentId: 1, date: "10/2026", day: 1, present: false, status: "late" }).status, "late");
});

test("summarise counts late as in, skips days off and flags missing reasons", () => {
  const marks = [
    { iso: "2026-10-01", status: "present" },
    { iso: "2026-10-02", status: "late" },
    { iso: "2026-10-05", status: "absent", reason: "Illness" },
    { iso: "2026-10-06", status: "absent" },
    { iso: "2026-10-26", status: "absent" }, // half term
  ];
  const r = summarise(marks, new Set(["2026-10-26"]));
  assert.deepEqual(r, { marked: 4, present: 1, late: 1, absent: 2, unexplained: 1, pct: 50 });
  assert.equal(summarise([]).pct, null);
});

test("CSV cells are quoted and protected against formula injection", () => {
  assert.equal(csvCell('Say "hi", please'), '"Say ""hi"", please"');
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell("+44 7700"), "'+44 7700");
  assert.equal(csvCell(null), "");
  assert.equal(toCsv(["a", "b"], [[1, "x,y"]]), 'a,b\r\n1,"x,y"\r\n');
});

test("register codes follow the paper register", () => {
  assert.equal(markCode({ status: "present" }), "/");
  assert.equal(markCode({ status: "late" }), "L");
  assert.equal(markCode({ status: "absent" }), "N");
  assert.equal(markCode({ status: "absent", reason: "Illness" }), "I");
  assert.equal(markCode({ status: "absent", reason: "Appointment" }), "M");
  assert.equal(markCode({ status: "absent", reason: "Holiday" }), "H");
  assert.equal(markCode(null), "");
});

test("streak counts school days in a row and skips weekends and days off", () => {
  // Wednesday 28 Oct 2026 back to Thursday 22 Oct, with Monday 26 Oct as a day off
  const marked = new Set(["2026-10-28", "2026-10-27", "2026-10-23", "2026-10-22"]);
  assert.equal(registerStreak(marked, "2026-10-28", new Set(["2026-10-26"])), 4);
  assert.equal(registerStreak(marked, "2026-10-28"), 2); // Monday missed without a day off
  assert.equal(registerStreak(new Set(["2026-10-27"]), "2026-10-28"), 1); // today not marked yet
  assert.equal(registerStreak(new Set(), "2026-10-28"), 0);
});
