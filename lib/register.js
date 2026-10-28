// Shared date and attendance maths for the API routes. Pure functions only.

export const STATUSES = ['present', 'late', 'absent'];
export const REASONS = ['Illness', 'Appointment', 'Holiday', 'No reason given'];

// Codes used on paper registers in English schools (DfE attendance codes).
// Stored reasons keep their original wording; these are only for display and export.
export const STATUS_CODES = { present: '/', late: 'L', absent: 'N' };
export const REASON_CODES = { Illness: 'I', Appointment: 'M', Holiday: 'H', 'No reason given': 'N' };
export const REASON_LABELS = { Illness: 'Illness', Appointment: 'Medical appointment', Holiday: 'Holiday', 'No reason given': 'No reason yet' };

/** The register code for a mark: / present, L late, or the absence reason code (N when unknown). */
export function markCode(mark) {
  if (!mark) return '';
  if (mark.status === 'absent') return REASON_CODES[mark.reason] || 'N';
  return STATUS_CODES[mark.status] || '';
}
export const LOW_ATTENDANCE = 90; // percent; below this a student is persistently absent (DfE: missing 10%+)

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Validates "YYYY-MM-DD". Returns { iso, year, month, day, monthKey } or null. */
export function parseIso(value) {
  if (typeof value !== 'string') return null;
  const m = ISO_RE.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  if (day < 1 || day > new Date(year, month, 0).getDate()) return null;
  return { iso: `${m[1]}-${m[2]}-${m[3]}`, year, month, day, monthKey: `${m[2]}/${m[1]}` };
}

/** Stored marks use date "MM/YYYY" plus day. Converts back to "YYYY-MM-DD". */
export function isoFromMark(monthKey, day) {
  const [mm, yyyy] = monthKey.split('/');
  return `${yyyy}-${mm}-${String(day).padStart(2, '0')}`;
}

/** All "MM/YYYY" keys from one ISO date to another, inclusive. */
export function monthKeysBetween(fromIso, toIso) {
  const a = parseIso(fromIso), b = parseIso(toIso);
  if (!a || !b) return [];
  const keys = [];
  let y = a.year, m = a.month;
  while (y < b.year || (y === b.year && m <= b.month)) {
    keys.push(`${String(m).padStart(2, '0')}/${y}`);
    m += 1; if (m > 12) { m = 1; y += 1; }
    if (keys.length > 36) break;
  }
  return keys;
}

export function weekdayOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sunday
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Monday of the week containing iso, as ISO. */
export function weekStart(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const back = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - back);
  return t.toISOString().slice(0, 10);
}

/** Normalises a stored row into { studentId, iso, status, reason, note }. */
export function markFromRow(r) {
  const status = STATUSES.includes(r.status) ? r.status : (r.present ? 'present' : 'absent');
  return { studentId: r.studentId, iso: isoFromMark(r.date, r.day), status, reason: r.reason ?? null, note: r.note ?? null };
}

/**
 * Counts for one set of marks. Days off are ignored.
 * pct = (present + late) / marked sessions, to one decimal place.
 */
export function summarise(marks, daysOff = new Set()) {
  let present = 0, late = 0, absent = 0, unexplained = 0;
  for (const k of marks) {
    if (daysOff.has(k.iso)) continue;
    if (k.status === 'present') present++;
    else if (k.status === 'late') late++;
    else { absent++; if (!k.reason || k.reason === 'No reason given') unexplained++; }
  }
  const marked = present + late + absent;
  const pct = marked ? Math.round(((present + late) / marked) * 1000) / 10 : null;
  return { marked, present, late, absent, unexplained, pct };
}

export function inRange(iso, fromIso, toIso) {
  return (!fromIso || iso >= fromIso) && (!toIso || iso <= toIso);
}

/** Escapes one CSV cell, including spreadsheet formula injection. */
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header, rows) {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** 1 September of the school year that contains iso. */
export function schoolYearStart(iso) {
  const [y, m] = iso.split('-').map(Number);
  return `${m >= 9 ? y : y - 1}-09-01`;
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/**
 * How many school days in a row have at least one mark, counting back from today.
 * Weekends and days off are skipped. If today has no marks yet the count starts
 * from the previous school day, so the streak is not lost before the first lesson.
 */
export function registerStreak(markedDays, todayIsoValue, daysOff = new Set()) {
  let day = todayIsoValue;
  const school = (d) => { const w = weekdayOf(d); return w !== 0 && w !== 6 && !daysOff.has(d); };
  if (!markedDays.has(day)) day = addDays(day, -1);
  let count = 0;
  for (let i = 0; i < 400; i++) {
    if (!school(day)) { day = addDays(day, -1); continue; }
    if (!markedDays.has(day)) break;
    count++;
    day = addDays(day, -1);
  }
  return count;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Splits an ISO date into the stored { date: "MM/YYYY", day }. */
export function storedKey(iso) {
  const p = parseIso(iso);
  return p ? { date: p.monthKey, day: p.day } : null;
}
