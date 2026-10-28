"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MessageCircle, Mail } from "lucide-react";
import { longDate } from "@/lib/client";
import { demoAdapter, zohoAdapter } from "@/lib/crm-client";
import { absenceMessage, whatsappNumber } from "@/lib/notes";
import { Panel } from "../../ui";

/** Message a parent about an absence, and send attendance to a linked CRM contact (Zoho, or the sample CRM in the sandbox). */
export default function ContactPanel({ student, recent }) {
  const lastAbsent = recent.find((m) => m.status === "absent");
  const text = lastAbsent ? absenceMessage(student.name, student.className, longDate(lastAbsent.iso)) : null;
  const wa = whatsappNumber(student.contact);
  return (
    <Panel title="Contact" pad>
      {text ? (
        <>
          <p className="r-muted" style={{ marginTop: 0 }}>Ask about the absence on {longDate(lastAbsent.iso)}. This opens your own app with the note filled in, so you can check it before sending.</p>
          <div className="r-row">
            {wa ? <a className="r-btn" href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true" /> WhatsApp</a>
              : <span className="r-muted r-small">Add a contact number in Edit details to message on WhatsApp.</span>}
            <a className="r-btn r-btn-ghost" href={`mailto:?subject=${encodeURIComponent(`${student.name.split(" ")[0]}'s absence`)}&body=${encodeURIComponent(text)}`}><Mail size={16} aria-hidden="true" /> Email</a>
          </div>
        </>
      ) : <p className="r-muted" style={{ margin: 0 }}>No absences to ask about.</p>}
    </Panel>
  );
}

/** The student's CRM link, near the top of their profile so it is easy to find. */
export function StudentCrm({ student, sandbox }) {
  const crm = useMemo(() => (sandbox ? demoAdapter() : zohoAdapter()), [sandbox]);
  return <Panel title={crm.name} pad><CrmLink student={student} sandbox={sandbox} crm={crm} /></Panel>;
}

function CrmLink({ student, sandbox, crm }) {
  const [state, setState] = useState(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { crm.getLink(student.id).then(setState).catch(() => setState({ connected: false })); }, [crm, student.id]);
  if (!state) return null;
  if (!state.connected) return <p className="r-muted" style={{ margin: 0 }}>Keep your students in Zoho? <Link href="/dashboard/apps">Connect Zoho CRM</Link> to link {student.name.split(" ")[0]} to their Contact and send attendance back with one tap.</p>;

  async function run(fn) { setBusy(true); try { await fn(); } catch (err) { toast.error(err.message); } finally { setBusy(false); } }
  const search = (e) => { e.preventDefault(); run(async () => setResults(await crm.search(q))); };
  const link = (c) => run(async () => { const l = await crm.setLink(student.id, c); setState({ connected: true, link: l }); setResults(null); });
  const send = () => run(async () => { toast.success(`Attendance note added to ${await crm.sendNote(student.id)} in ${crm.name}.`); });
  const fields = () => run(async () => { await crm.updateFields(student.id); toast.success(`Attendance fields updated in ${crm.name}.`); });

  return (
    <div>
      {state.link ? (
        <>
          <div className="r-row">
            <span className="r-grow">Linked to <b>{state.link.name}</b></span>
            <button className="r-btn" onClick={send} disabled={busy}>{busy ? "Working…" : "Send attendance note"}</button>
            <button className="r-btn r-btn-ghost" onClick={fields} disabled={busy}>Update fields</button>
            <button className="r-btn r-btn-ghost" onClick={() => link(null)} disabled={busy}>Unlink</button>
          </div>
          <p className="r-muted r-small" style={{ marginBottom: 0 }}>Send a note adds an attendance summary to the contact. Update fields fills in attendance %, status and last marked.</p>
          {sandbox ? <p className="r-muted r-small" style={{ marginBottom: 0 }}>This is the built-in sample CRM, so nothing leaves your browser. See what arrived on the <Link href="/dashboard/apps">Apps page</Link>.</p> : null}
        </>
      ) : (
        <>
          <p className="r-muted" style={{ marginTop: 0 }}>Not linked yet. Find {student.name.split(" ")[0]}&apos;s contact to send attendance to it.</p>
          <form className="r-row" onSubmit={search} style={{ gap: 8 }}>
            <input className="r-input r-grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find the contact by name, email or phone" aria-label={`Find a contact in ${crm.name}`} minLength={2} maxLength={60} />
            <button className="r-btn" disabled={busy || q.trim().length < 2}>Search</button>
          </form>
          {results ? (results.length ? (
            <ul className="r-list" style={{ marginTop: 8 }}>
              {results.map((c) => (
                <li key={c.id}><span className="r-grow">{c.name}<span className="r-muted r-block">{[c.email, c.phone].filter(Boolean).join(". ")}</span></span>
                  <button className="r-btn r-btn-ghost r-btn-sm" onClick={() => link(c)} disabled={busy}>Link</button></li>
              ))}
            </ul>) : <p className="r-muted r-small">No contacts match.</p>) : null}
        </>
      )}
    </div>
  );
}
