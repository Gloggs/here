"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DEMO_CONTACTS } from "@/lib/democrm-data";
import { FIELD_NAMES } from "@/lib/crm";
import { loadStore } from "@/lib/democrm-store";
import { demoAdapter } from "@/lib/crm-client";
import { shortDate } from "@/lib/client";

/** What has landed in the sample CRM: fields, notes and tasks per contact. Refreshes when asked. */
export default function SampleCrm({ version }) {
  const [store, setStore] = useState(null);
  useEffect(() => { setStore(loadStore()); }, [version]);
  if (!store) return null;
  const touched = DEMO_CONTACTS.filter((c) => store.fields[c.id] || store.notes.some((n) => n.contactId === c.id) || store.tasks.some((t) => t.contactId === c.id));

  return (
    <div className="r-zoho">
      <h3 className="r-zoho-title">Inside the sample CRM</h3>
      {touched.length === 0 ? (
        <p className="r-muted r-small" style={{ marginTop: 0 }}>Nothing has been sent yet. Link a student to a contact from their profile, then send a note or update fields, and it appears here as it would in a real CRM.</p>
      ) : (
        <ul className="r-list">
          {touched.map((c) => {
            const f = store.fields[c.id], notes = store.notes.filter((n) => n.contactId === c.id), tasks = store.tasks.filter((t) => t.contactId === c.id);
            return (
              <li key={c.id} style={{ display: "block" }}>
                <b>{c.name}</b>
                {f ? <p className="r-small" style={{ margin: "4px 0" }}>{FIELD_NAMES.attendance}: {f[FIELD_NAMES.attendance] ?? "none"}. {FIELD_NAMES.status}: {f[FIELD_NAMES.status]}. {FIELD_NAMES.lastMarked}: {f[FIELD_NAMES.lastMarked] || "none"}.</p> : null}
                {tasks.map((t, i) => <p key={`t${i}`} className="r-small" style={{ margin: "4px 0" }}>Task: {t.subject}. Due {shortDate(t.due)}.</p>)}
                {notes.map((n, i) => <p key={`n${i}`} className="r-small r-muted" style={{ margin: "4px 0", whiteSpace: "pre-line" }}>Note: {n.title}{"\n"}{n.body}</p>)}
              </li>
            );
          })}
        </ul>
      )}
      <button className="r-btn r-btn-ghost r-btn-sm" onClick={() => { demoAdapter().reset(); setStore(loadStore()); toast.success("Sample CRM cleared."); }}>Clear the sample CRM</button>
    </div>
  );
}
