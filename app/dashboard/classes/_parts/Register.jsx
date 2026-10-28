"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, X, List, LayoutGrid } from "lucide-react";
import { api, qs, localIso, shiftIso, longDate, REASONS, REASON_CODES, REASON_LABELS, STATUS_CODES, markCode } from "@/lib/client";
import { Loading, Avatar, Dialog } from "../../ui";

const WORD = { present: "Present", late: "Late", absent: "Absent" };

export default function Register({ className, classId, date, setDate, focusStudent }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [cursor, setCursor] = useState(-1);
  // List or photo grid, remembered per browser. In the grid, tapping a face opens its marks.
  const [view, setView] = useState("list");
  const [sheet, setSheet] = useState(null);
  useEffect(() => { try { setView(localStorage.getItem("here-register-view") || "list"); } catch {} }, []);
  const pickView = (v) => { setView(v); try { localStorage.setItem("here-register-view", v); } catch {} };
  // For the moment the register is finished: how long it took and where to go next.
  const [started, setStarted] = useState(null);
  const [finish, setFinish] = useState(null);
  const [error, setError] = useState("");
  const today = localIso();
  const [tip, setTip] = useState(false);
  useEffect(() => { try { setTip(!localStorage.getItem("register-tip-seen")); } catch { setTip(false); } }, []);
  const hideTip = () => { setTip(false); try { localStorage.setItem("register-tip-seen", "1"); } catch {} };

  const load = useCallback(() => {
    setData(null); setError("");
    api.get(`/api/attendance?${qs({ class: className, from: date, to: date })}`)
      .then((d) => setData({ students: d.students, dayOff: d.daysOff[0] || null,
        marks: Object.fromEntries(d.marks.map((m) => [m.studentId, m])) }))
      .catch((e) => setError(e.message));
  }, [className, date]);
  useEffect(() => { setOpen(focusStudent || null); setStarted(null); setFinish(null); load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  // Arriving from "Add reason": open that student's row and bring it into view.
  useEffect(() => {
    if (data && focusStudent) document.getElementById(`reg-${focusStudent}`)?.scrollIntoView({ block: "center" });
  }, [data, focusStudent]);

  const counts = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0, todo: 0, total: 0 };
    for (const s of data?.students ?? []) { c.total++; const m = data.marks[s.id]; if (m) c[m.status]++; else c.todo++; }
    return c;
  }, [data]);

  async function save(studentId, change) {
    if (!started) setStarted(Date.now());
    const before = data.marks[studentId];
    const next = { studentId, iso: date, status: "present", reason: null, note: null, ...before, ...change };
    if (next.status !== "absent") next.reason = null;
    setData((d) => ({ ...d, marks: { ...d.marks, [studentId]: next } }));
    try {
      await api.post("/api/attendance", { studentId, date, status: next.status, reason: next.reason, note: next.note });
    } catch (e) {
      toast.error(e.message);
      setData((d) => ({ ...d, marks: { ...d.marks, [studentId]: before } }));
    }
  }

  async function clear(studentId) {
    const before = data.marks[studentId];
    setData((d) => { const marks = { ...d.marks }; delete marks[studentId]; return { ...d, marks }; });
    try { await api.del(`/api/attendance?${qs({ studentId, date })}`); }
    catch (e) { toast.error(e.message); setData((d) => ({ ...d, marks: { ...d.marks, [studentId]: before } })); }
  }

  async function markRest() {
    if (!started) setStarted(Date.now());
    const ids = data.students.filter((s) => !data.marks[s.id]).map((s) => s.id);
    try {
      const r = await api.post("/api/attendance/rest", { className, date });
      load();
      if (r.marked) toast.success(`Marked ${r.marked} present.`, {
        action: { label: "Undo", onClick: async () => {
          await Promise.all(ids.map((id) => api.del(`/api/attendance?${qs({ studentId: id, date })}`).catch(() => null)));
          load();
        } },
      });
    } catch (e) { toast.error(e.message); }
  }

  // Keyboard: arrow keys move between students, P / L / A mark and move on.
  useEffect(() => {
    if (!data?.students.length) return;
    function onKey(e) {
      const t = e.target;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest?.("input, textarea, select, dialog[open]")) return;
      const k = e.key.toLowerCase();
      const n = data.students.length;
      if (k === "arrowdown" || k === "j") { e.preventDefault(); setCursor((c) => Math.min(n - 1, c + 1)); }
      else if (k === "arrowup" || k === "k") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
      else if (["/", "p", "l", "n", "a"].includes(k)) {
        const i = cursor < 0 ? 0 : cursor;
        const st = { "/": "present", p: "present", l: "late", n: "absent", a: "absent" }[k];
        const id = data.students[i].id;
        save(id, { status: st });
        if (st === "absent") setOpen(id); else { setOpen(null); setCursor(Math.min(n - 1, i + 1)); }
      } else if (k === "escape") { setOpen(null); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // re-binds each render so it sees the latest marks

  useEffect(() => {
    if (cursor >= 0 && data) document.getElementById(`reg-${data.students[cursor]?.id}`)?.scrollIntoView({ block: "nearest" });
  }, [cursor, data]);

  const doneAll = data && counts.total > 0 && counts.todo === 0;

  useEffect(() => {
    if (!doneAll || !started || finish) return;
    const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
    setFinish({ seconds, next: null });
    hideTip(); // they have done it once, so the tip has done its job
    api.get(`/api/overview?${qs({ date })}`).then((o) => {
      const next = o.classes.find((c) => c.name !== className && c.students > 0 && c.markedToday < c.students);
      setFinish({ seconds, next });
    }).catch(() => {});
  }, [doneAll, started]); // eslint-disable-line react-hooks/exhaustive-deps
  const pctDone = counts.total ? Math.round(((counts.total - counts.todo) / counts.total) * 100) : 0;

  return (
    <div className="r-register">
      <div className="r-datebar">
        <button className="r-icon-btn" onClick={() => setDate(shiftIso(date, -1))} aria-label="Previous day" data-tip="Previous day"><ChevronLeft size={20} /></button>
        <div className="r-datebar-mid">
          <div className="r-datebar-date">{longDate(date)}</div>
          {date !== today ? <button className="r-linkbtn" onClick={() => setDate(today)}>Back to today</button>
            : <span className="r-muted r-small">Today</span>}
        </div>
        <button className="r-icon-btn" onClick={() => setDate(shiftIso(date, 1))} aria-label="Next day" disabled={date >= today} data-tip={date >= today ? "Days ahead cannot be marked" : "Next day"}><ChevronRight size={20} /></button>
      </div>

      {error ? <p className="r-error" style={{ margin: 16 }}>{error}</p> : !data ? <Loading /> : data.students.length === 0 ? (
        <div className="r-empty-block">
          <p>There are no students in {className} yet.</p>
          <Link className="r-btn" href={`/dashboard/classes/${classId}?tab=students`}>Add students</Link>
        </div>
      ) : (
        <>
          <div className="r-progress" aria-live="polite">
            <div className="r-progress-row">
              <strong>{doneAll ? "Register complete" : `${counts.total - counts.todo} of ${counts.total} marked`}</strong>
              <span className="r-muted r-small">{counts.present} present · {counts.late} late · {counts.absent} absent</span>
            </div>
            <div className="r-bar r-bar-thick"><span style={{ width: `${pctDone}%` }} /></div>
          </div>
          {tip ? (
            <div className="r-tip" role="note">
              <div>
                <strong>How to take the register</strong>
                <p>Tap <b>/</b> present, <b>L</b> late or <b>N</b> absent, the same marks as a paper register. Absent asks for a reason, which changes the N to its code. Tap a name to add a note. Every tap saves.</p>
              </div>
              <button className="r-icon-btn r-icon-bare" onClick={hideTip} aria-label="Hide this tip"><X size={18} /></button>
            </div>
          ) : null}
          {data.dayOff ? <p className="r-note">This is a day off ({data.dayOff.label}). Marks on this day are left out of percentages.</p> : null}

          <div className="r-viewbar">
            <div className="r-seg" role="group" aria-label="Show as">
              <button className="is-on" aria-pressed={view === "list"} onClick={() => pickView("list")} data-tip="List"><List size={18} aria-hidden="true" /> <span className="r-viewlabel">List</span></button>
              <button className="is-on" aria-pressed={view === "grid"} onClick={() => pickView("grid")} data-tip="Photo grid"><LayoutGrid size={18} aria-hidden="true" /> <span className="r-viewlabel">Grid</span></button>
            </div>
          </div>
          {view === "grid" ? (
            <ul className="r-grid-reg">
              {data.students.map((s) => {
                const m = data.marks[s.id];
                return (
                  <li key={s.id}>
                    <button className={`r-tile${m ? ` is-${m.status}` : ""}`} onClick={() => setSheet(s.id)} aria-label={`${s.name}: ${m ? m.status : "not marked"}`}>
                      <Avatar s={s} size={72} />
                      <span className="r-tile-name">{s.name.split(" ")[0]}</span>
                      <span className="r-tile-code" aria-hidden="true">{m ? markCode(m) : ""}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {view === "list" ? <>
          <div className="r-reg-header" aria-hidden="true">
            <span>Student</span>
            <span className="r-reg-cols"><span>Present</span><span>Late</span><span>Absent</span></span>
          </div>
          <ul className="r-list r-reg-list">
            {data.students.map((s, idx) => {
              const m = data.marks[s.id];
              const isOpen = open === s.id;
              return (
                <li key={s.id} id={`reg-${s.id}`} className={`r-reg-row${isOpen ? " is-open" : ""}${idx === cursor ? " is-cursor" : ""}`}>
                  <div className="r-reg-main">
                    <Avatar s={s} size={36} />
                    <button className="r-reg-name" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
                      <span>{s.name}</span>
                      {m?.status === "absent" ? <span className={`r-reg-sub${m.reason ? "" : " is-missing"}`}>{m.reason ? REASON_LABELS[m.reason] : "Tap to add a reason"}</span>
                        : m?.note ? <span className="r-reg-sub">{m.note}</span> : null}
                    </button>
                    <div className="r-seg" role="group" aria-label={`Mark ${s.name}`}>
                      {["present", "late", "absent"].map((st) => (
                        <button key={st} className={`is-${st}`} aria-pressed={m?.status === st} aria-label={WORD[st]} data-tip={`${WORD[st]} (${st === "present" ? "/ or P" : st === "late" ? "L" : "N or A"})`}
                          onClick={() => { save(s.id, { status: st }); setOpen(st === "absent" ? s.id : open === s.id ? null : open); }}>
                          {st === "absent" && m?.status === "absent" ? markCode(m) : STATUS_CODES[st]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {isOpen ? (
                    <div className="r-reg-extra">
                      {m?.status === "absent" ? (
                        <div>
                          <div className="r-small r-strong">Reason for absence</div>
                          <div className="r-chips">
                            {REASONS.map((r) => (
                              <button key={r} className="r-chip" aria-pressed={m.reason === r} onClick={() => { save(s.id, { reason: r }); setOpen(null); }}><b className="r-code">{REASON_CODES[r]}</b> {REASON_LABELS[r]}</button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <label className="r-label">Note (optional)
                        <input className="r-input" maxLength={200} defaultValue={m?.note || ""} placeholder={m ? "For example, left at lunch" : "Mark the student first"}
                          onBlur={(e) => { const v = e.target.value.trim(); if (m && v !== (m.note || "")) save(s.id, { note: v || null }); }}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                          disabled={!m} />
                      </label>
                      <div className="r-row">
                        <Link className="r-btn r-btn-ghost" href={`/dashboard/students/${s.id}`}>View {s.name.split(" ")[0]}</Link>
                        {m ? <button className="r-btn r-btn-ghost" onClick={() => { clear(s.id); setOpen(null); }}>Clear mark</button> : null}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          </> : null}

          <Dialog open={sheet !== null} onClose={() => setSheet(null)} title={data.students.find((x) => x.id === sheet)?.name || "Mark"}>
            {sheet !== null ? (() => {
              const m = data.marks[sheet];
              const st = data.students.find((x) => x.id === sheet);
              return (
                <div className="r-form">
                  <div className="r-row" style={{ alignItems: "center", gap: 14 }}><Avatar s={st} size={64} /><span className="r-muted">{m ? (m.status === "absent" ? `Absent${m.reason ? `: ${REASON_LABELS[m.reason]}` : ""}` : WORD[m.status]) : "Not marked yet"}</span></div>
                  <div className="r-seg r-seg-big" role="group" aria-label={`Mark ${st.name}`}>
                    {["present", "late", "absent"].map((code) => (
                      <button key={code} className={`is-${code}`} aria-pressed={m?.status === code}
                        onClick={() => { save(sheet, { status: code }); if (code !== "absent") setSheet(null); }}>
                        <b>{STATUS_CODES[code]}</b> {WORD[code]}
                      </button>
                    ))}
                  </div>
                  {m?.status === "absent" ? (
                    <div className="r-chips">
                      {REASONS.map((r) => (
                        <button key={r} className="r-chip" aria-pressed={m.reason === r} onClick={() => { save(sheet, { reason: r }); setSheet(null); }}><b className="r-code">{REASON_CODES[r]}</b> {REASON_LABELS[r]}</button>
                      ))}
                    </div>
                  ) : null}
                  <div className="r-row">
                    <Link className="r-btn r-btn-ghost" href={`/dashboard/students/${sheet}`}>View {st.name.split(" ")[0]}</Link>
                    {m ? <button className="r-btn r-btn-ghost" onClick={() => { clear(sheet); setSheet(null); }}>Clear mark</button> : null}
                  </div>
                </div>
              );
            })() : null}
          </Dialog>

          <div className="r-sticky-foot">
            {doneAll ? (
              <>
                <span className={`r-done${finish ? " is-fresh" : ""}`}>
                  <Check size={18} aria-hidden="true" />
                  {finish ? `Register complete in ${finish.seconds < 60 ? `${finish.seconds} ${finish.seconds === 1 ? "second" : "seconds"}` : `${Math.floor(finish.seconds / 60)} min ${finish.seconds % 60} s`}` : `All ${counts.total} marked`}
                </span>
                {finish?.next ? <Link className="r-btn" href={`/dashboard/classes/${finish.next.id}`}>Next: {finish.next.name}</Link>
                  : <Link className="r-btn r-btn-ghost" href="/dashboard">Back to today</Link>}
              </>
            ) : (
              <><button className="r-btn" onClick={markRest}>Mark the other {counts.todo} present</button>
                <span className="r-muted r-small"><span className="r-pointer-only">Keys: ↑ ↓ to move, / L N to mark. </span>Every tap saves straight away</span></>
            )}
          </div>
        </>
      )}
    </div>
  );
}
