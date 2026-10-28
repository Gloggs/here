"use client";
// Small fetch helpers for the pages. Errors come back as readable messages.

async function call(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401) { window.location.href = "/api/auth/login"; throw new Error("Please sign in."); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export const api = {
  get: (url) => call("GET", url),
  post: (url, body) => call("POST", url, body ?? {}),
  put: (url, body) => call("PUT", url, body),
  del: (url) => call("DELETE", url),
};

/** Small per-browser flags for the getting-started list. Never required for anything to work. */
export function flag(name, set) {
  try {
    if (set) localStorage.setItem(`here-${name}`, "1");
    return localStorage.getItem(`here-${name}`) === "1";
  } catch { return false; }
}

export function qs(params) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, v);
  return p.toString();
}

/** Local date as YYYY-MM-DD (not UTC, so late evenings stay on the right day). */
export function localIso(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shiftIso(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  return localIso(new Date(y, m - 1, d + days));
}

export function longDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export function shortDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function pct(n) { return n === null || n === undefined ? "None" : `${n}%`; }

export { REASONS, REASON_CODES, REASON_LABELS, STATUS_CODES, markCode } from "./register";
