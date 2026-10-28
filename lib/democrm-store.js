// The sample CRM's memory. It lives in this browser only (never on the server) and is
// plain data, so these functions can be tested without a browser.
import { SNOOZE_DAYS } from "./crm.js";

export const emptyStore = () => ({ links: {}, notes: [], fields: {}, tasks: [], tasked: {} });

const clip = (s, n) => String(s ?? "").slice(0, n);

export function setLink(store, studentId, contact) {
  const links = { ...store.links };
  if (contact) links[studentId] = { id: contact.id, name: contact.name }; else delete links[studentId];
  return { ...store, links };
}
export function addNote(store, contactId, note, at) {
  return { ...store, notes: [{ contactId, title: clip(note.title, 200), body: clip(note.body, 1000), at }, ...store.notes].slice(0, 200) };
}
export function setFields(store, contactId, fields) {
  return { ...store, fields: { ...store.fields, [contactId]: fields } };
}
export function addTask(store, contactId, task, at) {
  return { ...store, tasks: [{ contactId, subject: clip(task.subject, 200), due: task.due, description: clip(task.description, 600), at }, ...store.tasks].slice(0, 200) };
}
export function markTasked(store, studentId, iso) {
  return { ...store, tasked: { ...store.tasked, [studentId]: iso } };
}
export function isSnoozed(store, studentId, todayIso) {
  const done = store.tasked[studentId];
  if (typeof done !== "string") return false;
  const d = new Date(`${todayIso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - SNOOZE_DAYS);
  return done > d.toISOString().slice(0, 10);
}

/** Reads a stored store defensively: anything unexpected becomes an empty one. */
export function readStore(text) {
  try {
    const v = JSON.parse(text);
    const e = emptyStore();
    return {
      links: v?.links && typeof v.links === "object" && !Array.isArray(v.links) ? v.links : e.links,
      notes: Array.isArray(v?.notes) ? v.notes.slice(0, 200) : e.notes,
      fields: v?.fields && typeof v.fields === "object" && !Array.isArray(v.fields) ? v.fields : e.fields,
      tasks: Array.isArray(v?.tasks) ? v.tasks.slice(0, 200) : e.tasks,
      tasked: v?.tasked && typeof v.tasked === "object" && !Array.isArray(v.tasked) ? v.tasked : e.tasked,
    };
  } catch { return emptyStore(); }
}

const KEY = "here:sample-crm:v1";
export function loadStore() {
  try { return readStore(localStorage.getItem(KEY)); } catch { return emptyStore(); }
}
export function saveStore(store) {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* private window: it just will not be remembered */ }
}
export function clearStore() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}
