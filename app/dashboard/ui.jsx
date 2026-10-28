"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { api } from "@/lib/client";
import { useSpace, SandboxTools } from "./Workspace";

/** Who is using the app: a signed-in user, or a demo guest with no account. */
export function useAccount() {
  const { user, isLoading } = useKindeBrowserClient();
  const { guest, space, name: chosen } = useSpace();
  // A name chosen in Settings wins over the one from Google or Microsoft.
  const name = chosen || [user?.given_name, user?.family_name].filter(Boolean).join(" ") || "";
  const firstName = chosen ? chosen.split(" ")[0] : user?.given_name || "";
  return { user, loading: isLoading, guest, space, sandbox: space === "sandbox", name, firstName };
}

const JOIN = "/api/auth/register?post_login_redirect_url=%2Fdashboard";

/** Shown across the top of every sandbox page, so nobody mistakes practice data for real. */
export function SandboxBar() {
  const { space, guest, switchTo } = useSpace();
  const [tools, setTools] = useState(false);
  if (space !== "sandbox") return null;
  return (
    <div className="r-sandboxbar" role="status">
      <span><b>Sandbox.</b> <span className="r-sandbox-long">{guest ? "A private demo with practice data. It is wiped after 24 hours." : "Practice data, kept apart from your real register."}</span><span className="r-sandbox-short">{guest ? "Demo data, wiped after 24 hours." : "Practice data only."}</span></span>
      <span className="r-row" style={{ gap: 8 }}>
        <button type="button" className="r-btn r-btn-sm" onClick={() => setTools(true)}>Sandbox tools</button>
        {guest ? <a className="r-btn r-btn-ghost r-btn-sm" href={JOIN}>Create a free account</a>
          : <button type="button" className="r-btn r-btn-ghost r-btn-sm r-sandbox-back" onClick={() => switchTo("main")}>Back to my register</button>}
        {guest ? <a className="r-sandbox-end" href="/demo/end">End demo</a> : null}
      </span>
      <Dialog open={tools} onClose={() => setTools(false)} title="Sandbox tools">
        <p className="r-muted" style={{ marginTop: 0 }}>Try things out here. None of this can reach your real classes.</p>
        <SandboxTools onDone={() => setTools(false)} />
      </Dialog>
    </div>
  );
}

/** A student's photo, or their initials when there is none. Used everywhere a student appears. */
export function Avatar({ s, size = 36, className = "" }) {
  const initials = s.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <span className={`r-avatar ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
      {s.photoAt ? <img src={`/api/student/${s.id}/photo?v=${encodeURIComponent(s.photoAt)}`} alt="" loading="lazy" /> : initials}
    </span>
  );
}

/** One student in a list. Every student list in the app uses this row. */
export function StudentRow({ s, showClass = true }) {
  return (
    <li>
      <Link className="r-row-link" href={`/dashboard/students/${s.id}`}>
        <Avatar s={s} />
        <span className="r-grow">{s.name}{showClass || s.contact ? <span className="r-muted r-block">{[showClass ? s.className : null, s.contact].filter(Boolean).join(". ")}</span> : null}</span>
        <ChevronRight size={18} aria-hidden="true" className="r-chev" />
      </Link>
    </li>
  );
}

export function PageHead({ title, sub, back, lead, children }) {
  useEffect(() => { if (typeof title === "string") document.title = `${title} | Here.`; }, [title]);
  return (
    <header className="r-head">
      {back ? <Link className={`r-back${back.phoneOnly ? " r-phone-only" : ""}`} href={back.href}>← {back.label}</Link> : null}
      <div className="r-head-row">
        {lead ? <div className="r-head-lead">{lead}<h1 className="r-title">{title}</h1></div> : <h1 className="r-title">{title}</h1>}
        {children ? <div className="r-row">{children}</div> : null}
      </div>
      {sub ? <p className="r-sub">{sub}</p> : null}
    </header>
  );
}

export function Panel({ title, action, children, pad }) {
  return (
    <section className="r-panel">
      {title ? (
        <div className="r-panel-head">
          <h2 className="r-panel-title">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={pad ? "r-panel-pad" : undefined}>{children}</div>
    </section>
  );
}

export function Bar({ value, low }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return <div className={`r-bar${low ? " r-low" : ""}`} role="img" aria-label={`${v}%`}><span style={{ width: `${v}%` }} /></div>;
}

/** Native <dialog>, opened while `open` is true. */
export function Dialog({ open, onClose, title, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="r-dialog" onClose={onClose} aria-label={title}>
      <div className="r-panel-head"><h2 className="r-panel-title">{title}</h2>
        <button className="r-btn r-btn-ghost" onClick={onClose} aria-label="Close">Close</button></div>
      <div className="r-panel-pad">{open ? children : null}</div>
    </dialog>
  );
}

/** Grey placeholder rows while data loads, so the page does not jump. */
export function Loading({ rows = 5 }) {
  return (
    <div className="r-skeleton" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="r-skel-row" style={{ width: `${90 - (i % 3) * 15}%` }} />)}
    </div>
  );
}

/** A slim bar that appears when the device loses its connection. */
export function OfflineBar() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  if (!offline) return null;
  return <div className="r-offline" role="status">You are offline. Marks will not save until the connection is back.</div>;
}

/** Splits pasted text into clean names: one per line, or comma separated. */
export function splitNames(text) {
  return [...new Set(text.split(/[\n,;]+/).map((n) => n.replace(/\s+/g, " ").trim()).filter(Boolean))];
}

/** Paste-friendly way to add many students at once. */
export function AddStudentsForm({ classes, fixedClass, onDone, autoFocus }) {
  const [text, setText] = useState("");
  const [cls, setCls] = useState(fixedClass || classes?.[0]?.name || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const names = splitNames(text);

  async function submit(e) {
    e.preventDefault();
    if (!names.length) return setError("Type at least one name.");
    setBusy(true); setError("");
    try {
      const r = await api.post("/api/student/bulk", { className: fixedClass || cls, names });
      setText("");
      onDone?.(r);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <form className="r-form" onSubmit={submit}>
      {error ? <p className="r-error" role="alert">{error}</p> : null}
      {!fixedClass && classes ? (
        <label className="r-label">Class
          <select className="r-select" value={cls} onChange={(e) => setCls(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </label>
      ) : null}
      <label className="r-label">Student names
        <textarea className="r-textarea" rows={5} value={text} onChange={(e) => setText(e.target.value)} autoFocus={autoFocus}
          placeholder={"One name per line, for example\nAmara Okafor\nBen Hughes"} />
        <span className="r-hint">Tip: paste a column straight from a spreadsheet.</span>
      </label>
      <button className="r-btn r-btn-wide" disabled={busy || !names.length}>
        {busy ? "Adding…" : names.length ? `Add ${names.length} ${names.length === 1 ? "student" : "students"}` : "Add students"}
      </button>
    </form>
  );
}

/** Class name plus first students in one step. */
export function NewClassForm({ onDone, suggest, autoFocus = true }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const names = splitNames(text);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Give the class a name.");
    setBusy(true); setError("");
    try {
      const cls = await api.post("/api/classes", { name: name.trim() });
      if (names.length) await api.post("/api/student/bulk", { className: cls.name, names });
      onDone?.(cls, names.length);
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <form className="r-form" onSubmit={submit}>
      {error ? <p className="r-error" role="alert">{error}</p> : null}
      <label className="r-label">Class name
        <input className="r-input" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} placeholder={suggest || "For example, 10B or Monday Maths"} autoFocus={autoFocus} />
      </label>
      <label className="r-label">Students (optional, you can add them later)
        <textarea className="r-textarea" rows={6} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={"One name per line\nAmara Okafor\nBen Hughes"} />
        <span className="r-hint">{names.length ? `${names.length} ${names.length === 1 ? "name" : "names"} ready to add.` : "Paste a column from a spreadsheet, or type one name per line."}</span>
      </label>
      <button className="r-btn r-btn-wide" disabled={busy}>{busy ? "Creating…" : names.length ? `Create class with ${names.length} ${names.length === 1 ? "student" : "students"}` : "Create class"}</button>
    </form>
  );
}

/** A class at a glance, with today's progress and one obvious next step. */
export function ClassCard({ c }) {
  const done = c.students > 0 && c.markedToday >= c.students;
  const pctDone = c.students ? Math.round((c.markedToday / c.students) * 100) : 0;
  return (
    <article className="r-card">
      <Link href={`/dashboard/classes/${c.id}`} className="r-card-link">
        <h3 className="r-card-title">{c.name}</h3>
        <p className="r-muted">{c.students} {c.students === 1 ? "student" : "students"}</p>
      </Link>
      {c.students > 0 ? (
        <>
          <div className="r-card-progress">
            <div className="r-bar"><span style={{ width: `${pctDone}%` }} /></div>
            <span className="r-small">{done ? "Done today" : `${c.markedToday} of ${c.students} marked`}</span>
          </div>
          <Link className={`r-btn r-btn-wide${done ? " r-btn-ghost" : ""}`} href={`/dashboard/classes/${c.id}`}>
            {done ? "Review register" : c.markedToday ? "Finish register" : "Take register"}
          </Link>
        </>
      ) : (
        <Link className="r-btn r-btn-wide r-btn-ghost" href={`/dashboard/classes/${c.id}?tab=students`}>Add students</Link>
      )}
    </article>
  );
}

/** Find any student by name. Loads the list once, filters as you type. */
export function StudentSearch({ dark }) {
  const router = useRouter();
  const [all, setAll] = useState(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const load = () => { if (!all) api.get("/api/student").then(setAll).catch(() => setAll([])); };
  const hits = q.trim() && all ? all.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];
  function go(s) { setQ(""); router.push(`/dashboard/students/${s.id}`); }
  return (
    <div className={`r-search${dark ? " r-search-dark" : ""}`}>
      <input className="r-input" type="search" placeholder="Find a student" aria-label="Find a student" value={q}
        onFocus={load} onChange={(e) => { setQ(e.target.value); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === "Enter" && hits[active]) go(hits[active]);
          if (e.key === "Escape") setQ("");
        }} />
      {q.trim() ? (
        <ul className="r-search-list" role="listbox">
          {all === null ? <li className="r-muted">Loading…</li> : hits.length === 0 ? <li className="r-muted">No student called “{q.trim()}”</li> :
            hits.map((s, i) => (
              <li key={s.id} role="option" aria-selected={i === active}>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); go(s); }}>
                  <span>{s.name}</span><span className="r-muted">{s.className}</span>
                </button>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}

/** A button that asks first, in our own dialog rather than the browser's. */
export function ConfirmButton({ label, title, message, confirmLabel, onConfirm, className = "r-btn r-btn-danger" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{label}</button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title || label}>
        <p style={{ marginTop: 0 }}>{message}</p>
        <div className="r-row">
          <button className="r-btn r-btn-danger" disabled={busy}
            onClick={async () => { setBusy(true); try { await onConfirm(); setOpen(false); } finally { setBusy(false); } }}>
            {busy ? "Working…" : confirmLabel || label}
          </button>
          <button className="r-btn r-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </Dialog>
    </>
  );
}
