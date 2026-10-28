"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MessageCircle, Mail } from "lucide-react";
import { api, qs, longDate } from "@/lib/client";
import { absenceMessage, whatsappNumber } from "@/lib/notes";
import { Panel } from "../../ui";

/** Message a parent about an absence, and send a summary to a linked Zoho Contact. */
export default function ContactPanel({ student, recent, sandbox }) {
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
      {sandbox ? null : <ZohoLink student={student} />}
    </Panel>
  );
}

function ZohoLink({ student }) {
  const [state, setState] = useState(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get(`/api/zoho/link?${qs({ studentId: student.id })}`).then(setState).catch(() => setState({ connected: false })); }, [student.id]);
  if (!state) return null;
  if (!state.connected) return <p className="r-muted r-small" style={{ margin: "16px 0 0" }}>Use Zoho CRM? <Link href="/dashboard/apps">Connect it on the Apps page</Link> to send attendance to a Contact.</p>;

  async function search(e) {
    e.preventDefault();
    setBusy(true);
    try { setResults((await api.get(`/api/zoho/contacts?${qs({ q })}`)).contacts); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }
  async function link(c) {
    setBusy(true);
    try { const r = await api.post("/api/zoho/link", { studentId: student.id, contactId: c?.id ?? null, contactName: c?.name }); setState({ connected: true, link: r.link }); setResults(null); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }
  async function send() {
    setBusy(true);
    try { const r = await api.post("/api/zoho/note", { studentId: student.id }); toast.success(`Attendance note added to ${r.to} in Zoho.`); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="r-zoho">
      <h3 className="r-zoho-title">Zoho CRM</h3>
      {state.link ? (
        <div className="r-row">
          <span className="r-grow">Linked to <b>{state.link.name}</b></span>
          <button className="r-btn" onClick={send} disabled={busy}>{busy ? "Sending…" : "Send attendance note"}</button>
          <button className="r-btn r-btn-ghost" onClick={() => link(null)} disabled={busy}>Unlink</button>
        </div>
      ) : (
        <>
          <form className="r-row" onSubmit={search} style={{ gap: 8 }}>
            <input className="r-input r-grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find the Contact by name, email or phone" aria-label="Find a Zoho Contact" minLength={2} maxLength={60} />
            <button className="r-btn" disabled={busy || q.trim().length < 2}>Search</button>
          </form>
          {results ? (results.length ? (
            <ul className="r-list" style={{ marginTop: 8 }}>
              {results.map((c) => (
                <li key={c.id}><span className="r-grow">{c.name}<span className="r-muted r-block">{[c.email, c.phone].filter(Boolean).join(". ")}</span></span>
                  <button className="r-btn r-btn-ghost r-btn-sm" onClick={() => link(c)} disabled={busy}>Link</button></li>
              ))}
            </ul>) : <p className="r-muted r-small">No Contacts match.</p>) : null}
        </>
      )}
    </div>
  );
}
