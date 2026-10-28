// Server-side input checks. The browser forms check the same things, but the
// server never trusts the browser.

const MONTH_RE = /^(0[1-9]|1[0-2])\/(\d{4})$/;
const CONTACT_RE = /^[0-9+()\-\s]*$/;

export function cleanText(value, { max, required = false } = {}) {
  if (value === undefined || value === null) {
    return required ? { error: "is required" } : { value: null };
  }
  if (typeof value !== "string") return { error: "must be text" };
  const trimmed = value.trim();
  if (required && trimmed.length === 0) return { error: "is required" };
  if (max && trimmed.length > max) return { error: `must be ${max} characters or fewer` };
  return { value: trimmed.length ? trimmed : null };
}

export function cleanContact(value) {
  const r = cleanText(value, { max: 20 });
  if (r.error || r.value === null) return r;
  if (!CONTACT_RE.test(r.value)) return { error: "can only contain digits, spaces, +, - and brackets" };
  return r;
}

export function cleanId(value) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(n) || n <= 0 || n > 2147483647) return { error: "is not a valid id" };
  return { value: n };
}

/** "MM/YYYY", e.g. "10/2026". Returns the parsed month and year. */
export function cleanMonth(value) {
  if (typeof value !== "string") return { error: "must look like MM/YYYY" };
  const m = MONTH_RE.exec(value.trim());
  if (!m) return { error: "must look like MM/YYYY" };
  const month = Number(m[1]);
  const year = Number(m[2]);
  if (year < 2000 || year > 2100) return { error: "year is out of range" };
  return { value: `${m[1]}/${m[2]}`, month, year, daysInMonth: new Date(year, month, 0).getDate() };
}

export function cleanDay(value, daysInMonth) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(n) || n < 1 || n > daysInMonth) return { error: "is not a day in that month" };
  return { value: n };
}

/** Reads a JSON body without throwing on bad input. */
export async function readJson(req) {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}
