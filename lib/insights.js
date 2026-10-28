// Pure maths for points, tasks and celebrations. No imports from the app, so it
// runs the same in the browser, on the server and in tests.

export const DEFAULT_BEHAVIOURS = [
  { name: 'Helping others', value: 1 },
  { name: 'On task', value: 1 },
  { name: 'Teamwork', value: 1 },
  { name: 'Great effort', value: 1 },
  { name: 'Participating', value: 1 },
  { name: 'Off task', value: -1 },
  { name: 'Disruptive', value: -1 },
  { name: 'No homework', value: -1 },
];

export const TASK_STATUSES = ['done', 'late', 'missed'];
export const TASK_CODES = { done: '/', late: 'L', missed: 'N' };

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Per-person task results. A task counts for someone once it has a mark for them,
 * or once its due date has passed (then it counts as missed until marked).
 * tasks: [{ id, due: 'YYYY-MM-DD', marks: [{ studentId, status, share }] }]
 */
export function taskStats(tasks, students, today) {
  const sorted = [...tasks].sort((a, b) => a.due.localeCompare(b.due));
  const out = new Map(students.map((s) => [s.id, {
    studentId: s.id, name: s.name, assigned: 0, done: 0, late: 0, missed: 0,
    shareTotal: 0, shareCount: 0, missedRun: 0,
  }]));
  for (const t of sorted) {
    const marks = new Map((t.marks || []).map((m) => [m.studentId, m]));
    for (const [id, row] of out) {
      const m = marks.get(id);
      const status = m ? m.status : t.due < today ? 'missed' : null;
      if (!status) continue;
      row.assigned++;
      row[status]++;
      row.missedRun = status === 'missed' ? row.missedRun + 1 : 0;
      if (m && m.share !== null && m.share !== undefined) { row.shareTotal += m.share; row.shareCount++; }
    }
  }
  const totalShare = [...out.values()].reduce((a, r) => a + r.shareTotal, 0);
  return [...out.values()].map((r) => ({
    ...r,
    completion: r.assigned ? round1(((r.done + r.late) / r.assigned) * 100) : null,
    onTime: r.done + r.late ? round1((r.done / (r.done + r.late)) * 100) : null,
    avgShare: r.shareCount ? Math.round(r.shareTotal / r.shareCount) : null,
    workload: totalShare ? round1((r.shareTotal / totalShare) * 100) : null,
    flag: r.missedRun >= 2 ? `Missed the last ${r.missedRun} tasks` : null,
  }));
}

/** Completion rate of the whole group for each week (by task due date, Monday start). */
export function taskWeeks(tasks, studentCount, today, weekStartOf) {
  const weeks = new Map();
  for (const t of tasks) {
    if (t.due > today && !(t.marks || []).length) continue;
    const w = weekStartOf(t.due);
    if (!weeks.has(w)) weeks.set(w, { start: w, expected: 0, completed: 0 });
    const row = weeks.get(w);
    const marked = t.marks || [];
    const expected = t.due < today ? studentCount : marked.length;
    row.expected += expected;
    row.completed += marked.filter((m) => m.status !== 'missed').length;
  }
  return [...weeks.values()].sort((a, b) => a.start.localeCompare(b.start))
    .map((w) => ({ start: w.start, pct: w.expected ? round1((w.completed / w.expected) * 100) : null, marked: w.expected }))
    .filter((w) => w.pct !== null);
}

/** Points totals per student and for the class, newest first in `recent`. */
export function pointsSummary(points, fromIso) {
  const totals = new Map();
  let positive = 0, negative = 0;
  for (const p of points) {
    if (fromIso && p.createdAt.slice(0, 10) < fromIso) continue;
    totals.set(p.studentId, (totals.get(p.studentId) || 0) + p.value);
    if (p.value > 0) positive += p.value; else negative -= p.value;
  }
  const ratio = positive + negative ? Math.round((positive / (positive + negative)) * 100) : null;
  return { totals, positive, negative, ratio };
}

/**
 * Celebrations from attendance marks. Never ranks by attendance itself:
 * illness is not a child's fault, so it praises full weeks, punctuality and improvement.
 * marks: [{ studentId, iso, status }]
 */
export function celebrations(marks, students, { weekFrom, recentFrom, previousFrom, today }) {
  const by = new Map(students.map((s) => [s.id, []]));
  for (const m of marks) if (by.has(m.studentId)) by.get(m.studentId).push(m);
  const pct = (ms) => { const n = ms.length; return n ? ((ms.filter((m) => m.status !== 'absent').length) / n) * 100 : null; };
  const fullWeek = [], onTime = [], improved = [];
  for (const s of students) {
    const ms = by.get(s.id);
    const week = ms.filter((m) => m.iso >= weekFrom && m.iso <= today);
    if (week.length >= 2 && week.every((m) => m.status === 'present')) fullWeek.push(s);
    const lastTen = ms.filter((m) => m.status !== 'absent').sort((a, b) => b.iso.localeCompare(a.iso)).slice(0, 10);
    if (lastTen.length >= 10 && lastTen.every((m) => m.status === 'present')) onTime.push(s);
    const recent = pct(ms.filter((m) => m.iso >= recentFrom && m.iso <= today));
    const before = pct(ms.filter((m) => m.iso >= previousFrom && m.iso < recentFrom));
    if (recent !== null && before !== null && recent - before >= 5) improved.push({ ...s, from: round1(before), to: round1(recent) });
  }
  improved.sort((a, b) => (b.to - b.from) - (a.to - a.from));
  return { fullWeek, onTime, improved: improved.slice(0, 3) };
}

/** Progress towards a weekly attendance goal. */
export function goalProgress(weekPct, goalPct) {
  if (!goalPct || weekPct === null || weekPct === undefined) return null;
  return { pct: weekPct, goal: goalPct, met: weekPct >= goalPct, gap: round1(Math.max(0, goalPct - weekPct)) };
}

/** Split names into n groups as evenly as possible, after a shuffle. */
export function makeGroups(names, n, random = Math.random) {
  const a = [...names];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const groups = Array.from({ length: Math.max(1, Math.min(n, a.length || 1)) }, () => []);
  a.forEach((x, i) => groups[i % groups.length].push(x));
  return groups;
}
