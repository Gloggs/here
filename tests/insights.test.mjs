import { test } from "node:test";
import assert from "node:assert/strict";
import { taskStats, taskWeeks, pointsSummary, celebrations, goalProgress, makeGroups } from "../lib/insights.js";
import { weekStart } from "../lib/register.js";

const people = [{ id: 1, name: "Amara" }, { id: 2, name: "Ben" }, { id: 3, name: "Chloe" }];
const tasks = [
  { id: 10, due: "2026-10-05", marks: [{ studentId: 1, status: "done", share: 50 }, { studentId: 2, status: "late", share: 30 }] },
  { id: 11, due: "2026-10-12", marks: [{ studentId: 1, status: "done", share: 60 }, { studentId: 2, status: "missed" }] },
  { id: 12, due: "2026-10-30", marks: [] }, // not due yet, nobody marked
];

test("task stats count unmarked overdue work as missed and flag a run of misses", () => {
  const s = Object.fromEntries(taskStats(tasks, people, "2026-10-28").map((r) => [r.name, r]));
  assert.equal(s.Amara.completion, 100);
  assert.equal(s.Amara.onTime, 100);
  assert.equal(s.Ben.completion, 50);
  assert.equal(s.Ben.onTime, 0);
  assert.equal(s.Chloe.missed, 2);
  assert.equal(s.Chloe.flag, "Missed the last 2 tasks");
  assert.equal(s.Amara.workload, 78.6); // 110 of 140 share points
  assert.equal(s.Amara.assigned, 2); // the future task does not count yet
});

test("task weeks give the group completion rate per week", () => {
  const w = taskWeeks(tasks, 3, "2026-10-28", weekStart);
  assert.deepEqual(w.map((x) => [x.start, x.pct]), [["2026-10-05", 66.7], ["2026-10-12", 33.3]]);
});

test("points summary totals per student and the positive ratio", () => {
  const pts = [
    { studentId: 1, value: 1, createdAt: "2026-10-27T09:00:00Z" },
    { studentId: 1, value: 1, createdAt: "2026-10-28T09:00:00Z" },
    { studentId: 2, value: -1, createdAt: "2026-10-28T10:00:00Z" },
    { studentId: 2, value: 1, createdAt: "2026-10-01T10:00:00Z" },
  ];
  const s = pointsSummary(pts, "2026-10-26");
  assert.equal(s.totals.get(1), 2);
  assert.equal(s.totals.get(2), -1);
  assert.equal(s.ratio, 67);
});

test("celebrations praise full weeks and improvement, not raw attendance", () => {
  const marks = [
    { studentId: 1, iso: "2026-10-26", status: "present" }, { studentId: 1, iso: "2026-10-27", status: "present" },
    { studentId: 2, iso: "2026-10-26", status: "present" }, { studentId: 2, iso: "2026-10-27", status: "absent" },
    // Chloe: 50% before, 100% recently
    { studentId: 3, iso: "2026-09-10", status: "absent" }, { studentId: 3, iso: "2026-09-11", status: "present" },
    { studentId: 3, iso: "2026-10-20", status: "present" }, { studentId: 3, iso: "2026-10-21", status: "late" },
  ];
  const c = celebrations(marks, people, { weekFrom: "2026-10-26", recentFrom: "2026-10-01", previousFrom: "2026-09-01", today: "2026-10-28" });
  assert.deepEqual(c.fullWeek.map((s) => s.name), ["Amara"]);
  assert.deepEqual(c.improved.map((s) => [s.name, s.from, s.to]), [["Chloe", 50, 100]]);
});

test("goal progress and group maker", () => {
  assert.deepEqual(goalProgress(95.5, 97), { pct: 95.5, goal: 97, met: false, gap: 1.5 });
  assert.equal(goalProgress(null, 97), null);
  const g = makeGroups(["a", "b", "c", "d", "e"], 2, () => 0.5);
  assert.equal(g.length, 2);
  assert.deepEqual(g.map((x) => x.length), [3, 2]);
  assert.equal(g.flat().sort().join(""), "abcde");
});
