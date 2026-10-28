"use client";
import { useState } from "react";

export default function StudentForm({ classes, initial, onSubmit, submitLabel }) {
  const [form, setForm] = useState({ name: "", className: classes[0]?.name || "", address: "", contact: "", ...initial });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Please add a name.");
    setBusy(true); setError("");
    try { await onSubmit({ name: form.name.trim(), className: form.className, address: form.address, contact: form.contact, photoConsent: !!form.photoConsent }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <form className="r-form" onSubmit={submit}>
      {error ? <p className="r-error" role="alert">{error}</p> : null}
      <label className="r-label">Full name<input className="r-input" maxLength={50} value={form.name} onChange={set("name")} required autoFocus /></label>
      <label className="r-label">Class
        <select className="r-select" value={form.className} onChange={set("className")}>
          {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </label>
      <label className="r-label">Contact number (optional)<input className="r-input" maxLength={20} inputMode="tel" value={form.contact || ""} onChange={set("contact")} /></label>
      <label className="r-label">Address (optional)<input className="r-input" maxLength={100} value={form.address || ""} onChange={set("address")} /></label>
      <label className="r-check-row">
        <input type="checkbox" checked={!!form.photoConsent} onChange={(e) => setForm((f) => ({ ...f, photoConsent: e.target.checked }))} />
        <span>Consent given to keep a photo of this student{initial?.photoAt ? ". Unticking removes the current photo." : "."}</span>
      </label>
      <button className="r-btn r-btn-wide" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
    </form>
  );
}
