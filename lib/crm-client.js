"use client";
// One shape for talking to a CRM from the pages, whether it is the user's own Zoho or the
// built-in sample CRM. The pages never need to know which one they have.
import { useEffect, useMemo, useState } from "react";
import { api, qs, localIso } from "@/lib/client";
import { DEMO_CONTACTS, demoContact } from "@/lib/democrm-data";
import { addNote, addTask, clearStore, isSnoozed, loadStore, markTasked, saveStore, setFields, setLink } from "@/lib/democrm-store";

export function zohoAdapter() {
  return {
    kind: "zoho", name: "Zoho CRM",
    status: () => api.get("/api/connections").then((d) => {
      const z = d.connections.find((c) => c.provider === "zoho");
      return z ? { connected: true, label: z.label || "Zoho CRM", current: z.scopeVersion >= 2 } : { connected: false };
    }),
    getLink: (studentId) => api.get(`/api/zoho/link?${qs({ studentId })}`).then((r) => (r.connected ? { connected: true, link: r.link } : { connected: false })),
    setLink: (studentId, c) => api.post("/api/zoho/link", { studentId, contactId: c?.id ?? null, contactName: c?.name }).then((r) => r.link),
    search: (q) => api.get(`/api/zoho/contacts?${qs({ q })}`).then((r) => r.contacts),
    browse: (page) => api.get(`/api/zoho/import?${qs({ page })}`),
    importIn: (ids, className) => api.post("/api/zoho/import", { ids, className }),
    sendNote: (studentId) => api.post("/api/zoho/note", { studentId }).then((r) => r.to),
    updateFields: (studentId) => api.post("/api/zoho/fields", studentId ? { studentId } : {}),
    actions: () => api.get("/api/zoho/actions").then((r) => r.actions),
    act: (studentId) => api.post("/api/zoho/actions", { studentId }),
    dismiss: (studentId) => api.post("/api/zoho/actions", { studentId, dismiss: true }),
  };
}

async function facts(ids) {
  if (!ids.length) return [];
  return (await api.get(`/api/crm/facts?${qs({ ids: ids.join(",") })}`)).facts;
}

export function demoAdapter() {
  const save = (fn) => { const s = fn(loadStore()); saveStore(s); return s; };
  const linkedIds = () => Object.keys(loadStore().links).map(Number);
  return {
    kind: "demo", name: "Sample CRM",
    status: async () => ({ connected: true, label: "Sample CRM", current: true }),
    getLink: async (studentId) => ({ connected: true, link: loadStore().links[studentId] || null }),
    setLink: async (studentId, c) => { save((s) => setLink(s, studentId, c)); return c ? { id: c.id, name: c.name } : null; },
    search: async (q) => {
      const w = q.trim().toLowerCase();
      return DEMO_CONTACTS.filter((c) => [c.name, c.email, c.phone].some((x) => x.toLowerCase().includes(w))).slice(0, 10);
    },
    browse: async () => {
      const linked = new Set(Object.values(loadStore().links).map((l) => l.id));
      return { contacts: DEMO_CONTACTS.map((c) => ({ id: c.id, name: c.name, phone: c.phone, tags: c.tags, linked: linked.has(c.id) })), more: false };
    },
    importIn: async (ids, className) => {
      const linked = new Set(Object.values(loadStore().links).map((l) => l.id));
      const r = await api.post("/api/crm/import", { ids: ids.filter((i) => !linked.has(i)), className });
      save((s) => r.added.reduce((acc, a) => setLink(acc, a.studentId, { id: a.contactId, name: demoContact(a.contactId)?.name || a.name }), s));
      return { added: r.added.length, skipped: ids.length - r.added.length };
    },
    sendNote: async (studentId) => {
      const link = loadStore().links[studentId];
      const [f] = await facts([studentId]);
      if (!link || !f) throw new Error("Link this student to a contact first.");
      save((s) => addNote(s, link.id, f.note, new Date().toISOString()));
      return link.name;
    },
    updateFields: async (studentId) => {
      const links = loadStore().links;
      const ids = studentId ? [studentId] : linkedIds();
      const list = (await facts(ids)).filter((f) => links[f.studentId]);
      if (!list.length) throw new Error("No students are linked to contacts yet.");
      save((s) => list.reduce((acc, f) => setFields(acc, links[f.studentId].id, f.fields), s));
      return { updated: list.length, failed: 0 };
    },
    actions: async () => {
      const store = loadStore(), today = localIso();
      return (await facts(linkedIds()))
        .filter((f) => f.risk && store.links[f.studentId] && !isSnoozed(store, f.studentId, today))
        .map((f) => ({ studentId: f.studentId, name: f.name, reason: f.risk.text, contactName: store.links[f.studentId].name }));
    },
    act: async (studentId) => {
      const link = loadStore().links[studentId];
      const [f] = await facts([studentId]);
      if (!link || !f?.task) throw new Error("That suggestion is no longer needed.");
      save((s) => markTasked(addTask(s, link.id, f.task, new Date().toISOString()), studentId, localIso()));
      return { created: true };
    },
    dismiss: async (studentId) => { save((s) => markTasked(s, studentId, localIso())); return { created: false }; },
    read: () => loadStore(),
    reset: () => clearStore(),
  };
}

// The real register asks the server once a minute at most whether Zoho is connected.
let cached = null;
export function forgetCrmStatus() { cached = null; }

/**
 * The CRM for the current space: the sample CRM in the sandbox and demo, the user's Zoho otherwise.
 * status: null while loading, then { connected, label, current }.
 */
export function useCrm(sandbox) {
  const crm = useMemo(() => (sandbox ? demoAdapter() : zohoAdapter()), [sandbox]);
  const [status, setStatus] = useState(null);
  useEffect(() => {
    let live = true;
    if (sandbox) { crm.status().then((s) => live && setStatus(s)); return () => { live = false; }; }
    if (!cached || Date.now() - cached.at > 60_000) cached = { at: Date.now(), p: crm.status().catch(() => ({ connected: false })) };
    cached.p.then((s) => live && setStatus(s));
    return () => { live = false; };
  }, [crm, sandbox]);
  return { crm, status };
}
