"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api, qs, localIso, shiftIso, shortDate, flag } from "@/lib/client";
import { PageHead, Panel, Bar, Loading } from "../ui";
import WeeklyChart from "../WeeklyChart";

const LOW = 90;

function presets(today) {
  const [y, m, d] = today.split("-").map(Number);
  const wd = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return {
    "This week": [shiftIso(today, -wd), today],
    "This month": [`${today.slice(0, 7)}-01`, today],
    "Last 30 days": [shiftIso(today, -29), today],
    "School year": [`${m >= 9 ? y : y - 1}-09-01`, today],
  };
}

function summarise(marks, off) {
  let present = 0, late = 0, absent = 0, unexplained = 0;
  for (const k of marks) {
    if (off.has(k.iso)) continue;
    if (k.status === "present") present++; else if (k.status === "late") late++;
    else { absent++; if (!k.reason || k.reason === "No reason given") unexplained++; }
  }
  const marked = present + late + absent;
  return { marked, present, late, absent, unexplained, pct: marked ? Math.round(((present + late) / marked) * 1000) / 10 : null };
}

export default function Reports() {
  const today = localIso();
  const P = useMemo(() => presets(today), [today]);
  const [classes, setClasses] = useState(null);
  const [cls, setCls] = useState("");
  const [range, setRange] = useState(P["This month"]);
  const [rows, setRows] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [daysOff, setDaysOff] = useState([]);
  const [off, setOff] = useState({ from: "", to: "", label: "" });
  const [error, setError] = useState("");

  const loadDaysOff = () => api.get("/api/days-off").then(setDaysOff).catch((e) => toast.error(e.message));
  useEffect(() => {
    api.get("/api/classes").then((c) => { setClasses(c); if (c.length) setCls(c[0].name); }).catch((e) => setError(e.message));
    loadDaysOff();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(() => {
    if (!cls) return;
    setRows(null);
    api.get(`/api/attendance?${qs({ class: cls, from: range[0], to: range[1] })}`).then((d) => {
      const offSet = new Set(d.daysOff.map((x) => x.day));
      setRows(d.students.map((s) => ({ ...s, ...summarise(d.marks.filter((m) => m.studentId === s.id), offSet) }))
        .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101)));
      const byWeek = new Map();
      for (const m of d.marks) {
        const [y, mo, da] = m.iso.split("-").map(Number);
        const wd = (new Date(y, mo - 1, da).getDay() + 6) % 7;
        const start = shiftIso(m.iso, -wd);
        if (!byWeek.has(start)) byWeek.set(start, []);
        byWeek.get(start).push(m);
      }
      setWeeks([...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b))
        .map(([start, ms]) => ({ start, ...summarise(ms, offSet) })).filter((w) => w.pct !== null));
    }).catch((e) => setError(e.message));
  }, [cls, range]);
  useEffect(load, [load]);

  const total = useMemo(() => {
    if (!rows) return null;
    const t = rows.reduce((a, r) => ({ marked: a.marked + r.marked, inn: a.inn + r.present + r.late, absent: a.absent + r.absent }), { marked: 0, inn: 0, absent: 0 });
    return { ...t, pct: t.marked ? Math.round((t.inn / t.marked) * 1000) / 10 : null, low: rows.filter((r) => r.pct !== null && r.pct < LOW).length };
  }, [rows]);

  async function addOff(e) {
    e.preventDefault();
    try { await api.post("/api/days-off", { from: off.from, to: off.to || off.from, label: off.label.trim() }); setOff({ from: "", to: "", label: "" }); toast.success("Days off saved."); loadDaysOff(); load(); }
    catch (err) { toast.error(err.message); }
  }
  async function removeOff(id) {
    try { await api.del(`/api/days-off?${qs({ id })}`); loadDaysOff(); load(); } catch (err) { toast.error(err.message); }
  }

  const exportUrl = (kind) => `/api/export?${qs({ class: cls, from: range[0], to: range[1], kind })}`;

  if (error) return <><PageHead title="Reports" /><div className="r-body"><p className="r-error">{error}</p></div></>;
  if (!classes) return <><PageHead title="Reports" /><Loading /></>;

  return (
    <>
      <PageHead title="Reports" sub={`${shortDate(range[0])} to ${shortDate(range[1])}`}>
        {classes.length ? (
          <select className="r-select" style={{ width: "auto" }} value={cls} onChange={(e) => setCls(e.target.value)} aria-label="Class">
            {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        ) : null}
      </PageHead>
      <div className="r-body">
        <div className="r-row">
          <div className="r-chips">
            {Object.entries(P).map(([name, r]) => (
              <button key={name} className="r-chip" aria-pressed={range[0] === r[0] && range[1] === r[1]} onClick={() => setRange(r)}>{name}</button>
            ))}
          </div>
        </div>
        <div className="r-dates">
          <label className="r-label">From
            <input type="date" className="r-input" value={range[0]} max={range[1]} onChange={(e) => e.target.value && setRange([e.target.value, range[1]])} /></label>
          <label className="r-label">To
            <input type="date" className="r-input" value={range[1]} min={range[0]} onChange={(e) => e.target.value && setRange([range[0], e.target.value])} /></label>
        </div>

        {!classes.length ? <p>Add a class to see reports. <Link href="/dashboard/students">Go to students</Link>.</p> : !rows ? <Loading /> : (
          <>
            <div className="r-stats">
              <div className="r-stat r-stat-key"><div className="r-stat-num">{total.pct === null ? "None" : `${total.pct}%`}</div><div className="r-stat-label">Class attendance</div></div>
              <div className="r-stat"><div className="r-stat-num">{total.marked}</div><div className="r-stat-label">Sessions marked</div></div>
              <div className="r-stat"><div className="r-stat-num">{total.absent}</div><div className="r-stat-label">Absences</div></div>
              <div className="r-stat"><div className="r-stat-num">{total.low}</div><div className="r-stat-label">Below {LOW}%</div></div>
            </div>
            <div className="r-row">
              <a className="r-btn r-btn-ghost" href={exportUrl("summary")} download onClick={() => flag("used-report", true)}>Download summary (CSV)</a>
              <a className="r-btn r-btn-ghost" href={exportUrl("marks")} download onClick={() => flag("used-report", true)}>Download every mark (CSV)</a>
              <button className="r-btn r-btn-ghost" onClick={() => { flag("used-report", true); window.print(); }}>Print</button>
            </div>
            <Panel title="Attendance by week"><div className="r-panel-pad"><WeeklyChart weeks={weeks} threshold={LOW} /></div></Panel>
            <Panel title="By student">
              {rows.length === 0 ? <p className="r-empty">No students in {cls}.</p> : (
                <div className="r-table-wrap" style={{ border: 0 }}>
                  <table className="r-table">
                    <thead><tr><th>Student</th><th>Attendance</th><th style={{ minWidth: 120 }}></th><th>Present</th><th>Late</th><th>Absent</th><th>No reason</th></tr></thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id}>
                          <td><Link href={`/dashboard/students/${r.id}`}>{r.name}</Link></td>
                          <td>{r.pct === null ? "None" : `${r.pct}%`}</td>
                          <td><Bar value={r.pct ?? 0} low={r.pct !== null && r.pct < LOW} /></td>
                          <td>{r.present}</td><td>{r.late}</td><td>{r.absent}</td><td>{r.unexplained}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}

        <Panel title="Days off" action={<span className="r-muted">Left out of every percentage</span>}>
          <form className="r-form r-panel-pad" onSubmit={addOff} style={{ borderBottom: "1px solid var(--line)", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", alignItems: "end" }}>
            <label className="r-label">From<input type="date" className="r-input" required value={off.from} onChange={(e) => setOff({ ...off, from: e.target.value })} /></label>
            <label className="r-label">To (optional)<input type="date" className="r-input" min={off.from} value={off.to} onChange={(e) => setOff({ ...off, to: e.target.value })} /></label>
            <label className="r-label">Label<input className="r-input" maxLength={40} required placeholder="Half term" value={off.label} onChange={(e) => setOff({ ...off, label: e.target.value })} /></label>
            <button className="r-btn">Add days off</button>
          </form>
          {daysOff.length === 0 ? <p className="r-empty">No days off added.</p> : (
            <ul className="r-list">
              {daysOff.slice(-40).reverse().map((d) => (
                <li key={d.id}><div className="r-grow">{shortDate(d.day)}<div className="r-muted">{d.label}</div></div>
                  <button className="r-btn r-btn-ghost" onClick={() => removeOff(d.id)}>Remove</button></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
