"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { Dialog, Loading } from "../ui";

/** Import, field updates and suggested check-ins for one CRM (Zoho, or the sample CRM). */
export default function CrmPanel({ crm, current = true, onChange }) {
  const [importing, setImporting] = useState(false);
  const [actions, setActions] = useState(null);
  const [busy, setBusy] = useState("");

  const loadActions = useCallback(() => {
    if (!current) { setActions([]); return; }
    crm.actions().then(setActions).catch((e) => { setActions([]); toast.error(e.message); });
  }, [crm, current]);
  useEffect(() => { loadActions(); }, [loadActions]);
  // Arriving from "Check-ins to approve" elsewhere: scroll to the list once it has loaded.
  useEffect(() => {
    if (actions !== null && window.location.hash === "#checkins") document.getElementById("checkins")?.scrollIntoView({ block: "start" });
  }, [actions]);

  async function updateAll() {
    setBusy("fields");
    try { const r = await crm.updateFields(); toast.success(`Updated ${r.updated} contact${r.updated === 1 ? "" : "s"} in ${crm.name}${r.failed ? `. ${r.failed} could not be updated` : ""}.`); onChange?.(); }
    catch (e) { toast.error(e.message); } finally { setBusy(""); }
  }
  async function decide(a, approve) {
    setBusy(String(a.studentId));
    try {
      await (approve ? crm.act(a.studentId) : crm.dismiss(a.studentId));
      toast.success(approve ? `Task created for ${a.contactName} in ${crm.name}.` : "Dismissed for two weeks.");
      loadActions(); onChange?.();
    } catch (e) { toast.error(e.message); loadActions(); } finally { setBusy(""); }
  }

  return (
    <div className="r-zoho">
      {!current ? (
        <p className="r-muted r-small" style={{ marginTop: 0 }}>Importing, field updates and check-in tasks need a few more permissions. Reconnect Zoho CRM below to allow them. Your links are kept.</p>
      ) : (
        <>
          <div className="r-row" style={{ gap: 8 }}>
            <button className="r-btn" onClick={() => setImporting(true)}>Import students</button>
            <button className="r-btn r-btn-ghost" onClick={updateAll} disabled={busy === "fields"}>{busy === "fields" ? "Updating…" : "Update attendance fields"}</button>
          </div>
          {crm.kind === "zoho" ? (
            <p className="r-muted r-small">Update fields fills in three fields on each linked Contact. Add them once in Zoho, under Setup, Modules and Fields, Contacts, using the labels <b>Here Attendance</b> (number), <b>Here Status</b> (single line) and <b>Here Last Marked</b> (date).</p>
          ) : null}

          <h3 id="checkins" className="r-zoho-title" style={{ marginTop: 20, scrollMarginTop: 24 }}>Suggested check-ins</h3>
          {actions === null ? <Loading rows={1} /> : actions.length === 0 ? (
            <p className="r-muted r-small" style={{ marginTop: 0 }}>Nobody needs one right now. Students appear here after three absences in a row, or when attendance falls below 90%. Nothing is created in {crm.name} until you approve it.</p>
          ) : (
            <ul className="r-list">
              {actions.map((a) => (
                <li key={a.studentId}>
                  <span className="r-grow"><b>{a.name}</b><span className="r-muted r-block">{a.reason}. Task for {a.contactName}, due in two working days.</span></span>
                  <button className="r-btn r-btn-sm" disabled={busy === String(a.studentId)} onClick={() => decide(a, true)}>Create task</button>
                  <button className="r-btn r-btn-ghost r-btn-sm" disabled={busy === String(a.studentId)} onClick={() => decide(a, false)}>Not now</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {importing ? <ImportDialog crm={crm} onClose={() => setImporting(false)} onDone={() => { setImporting(false); loadActions(); onChange?.(); }} /> : null}
    </div>
  );
}

export function ImportDialog({ crm, onClose, onDone, fixedClass }) {
  const [list, setList] = useState(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [classes, setClasses] = useState([]);
  const [tag, setTag] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [className, setClassName] = useState(fixedClass || "");
  const [busy, setBusy] = useState(false);

  const fetchPage = useCallback((p) => crm.browse(p).then((r) => { setList((l) => [...(l || []), ...r.contacts]); setMore(r.more); setPage(p); }).catch((e) => { setList((l) => l || []); toast.error(e.message); }), [crm]);
  useEffect(() => { fetchPage(1); api.get("/api/classes").then((c) => { setClasses(c); if (!fixedClass) setClassName(c[0]?.name || ""); }).catch(() => {}); }, [fetchPage, crm, fixedClass]);

  const tags = [...new Set((list || []).flatMap((c) => c.tags))].sort();
  const shown = (list || []).filter((c) => !tag || c.tags.includes(tag));
  const free = shown.filter((c) => !c.linked);
  const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function go() {
    setBusy(true);
    try {
      const r = await crm.importIn([...picked], className);
      toast.success(`Added ${r.added} student${r.added === 1 ? "" : "s"} to ${className}${r.skipped ? `. ${r.skipped} skipped` : ""}.`);
      onDone();
    } catch (e) { toast.error(e.message); setBusy(false); }
  }

  return (
    <Dialog open onClose={onClose} title={`Import from ${crm.name}`}>
      {list === null ? <Loading rows={4} /> : (
        <div className="r-form">
          <p className="r-muted r-small" style={{ margin: 0 }}>Choose the contacts who are your students. Each becomes a student in the class you pick, already linked to their contact. {crm.kind === "zoho" ? "Showing your newest 100 Contacts at a time." : "These are made-up people."}</p>
          {classes.length === 0 ? <p className="r-error">Create a class first, then come back to import.</p> : (
            <div className="r-row" style={{ gap: 8 }}>
              {fixedClass ? <span className="r-grow">Adding to <b>{fixedClass}</b></span> : (
                <select className="r-select r-grow" value={className} onChange={(e) => setClassName(e.target.value)} aria-label="Add to class">
                  {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              )}
              {tags.length ? (
                <select className="r-select r-grow" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
                  <option value="">All tags</option>
                  {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : null}
            </div>
          )}
          <div className="r-row">
            <button type="button" className="r-btn r-btn-ghost r-btn-sm" onClick={() => setPicked(new Set(free.slice(0, crm.kind === "demo" ? 20 : 100).map((c) => c.id)))}>Select all shown</button>
            <button type="button" className="r-btn r-btn-ghost r-btn-sm" onClick={() => setPicked(new Set())}>Clear</button>
          </div>
          <ul className="r-list" style={{ maxHeight: 320, overflowY: "auto" }}>
            {shown.length === 0 ? <li className="r-muted">No contacts to show.</li> : shown.map((c) => (
              <li key={c.id}>
                <label className="r-row r-grow" style={{ gap: 12, cursor: c.linked ? "default" : "pointer" }}>
                  <input type="checkbox" checked={picked.has(c.id)} disabled={c.linked} onChange={() => toggle(c.id)} aria-label={`Import ${c.name}`} />
                  <span className="r-grow">{c.name}<span className="r-muted r-block">{c.linked ? "Already linked to a student" : [c.phone, c.tags.join(", ")].filter(Boolean).join(". ")}</span></span>
                </label>
              </li>
            ))}
          </ul>
          {more ? <button type="button" className="r-btn r-btn-ghost" onClick={() => fetchPage(page + 1)}>Load more</button> : null}
          <div className="r-row">
            <button className="r-btn" disabled={busy || !picked.size || !className} onClick={go}>{busy ? "Importing…" : `Import ${picked.size || ""} ${picked.size === 1 ? "student" : "students"}`}</button>
            <button className="r-btn r-btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
