"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, qs, localIso, markCode, REASON_LABELS } from "@/lib/client";
import { Loading } from "../../ui";

const NEXT = { undefined: "present", present: "late", late: "absent", absent: undefined };

function monthInfo(ym) {
  const [y, m] = ym.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const list = Array.from({ length: days }, (_, i) => {
    const d = i + 1;
    const iso = `${ym}-${String(d).padStart(2, "0")}`;
    const wd = new Date(y, m - 1, d).getDay();
    return { d, iso, weekend: wd === 0 || wd === 6, letter: "SMTWTFS"[wd] };
  });
  const label = new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return { list, label, from: list[0].iso, to: list[days - 1].iso };
}
function shiftMonth(ym, n) {
  const [y, m] = ym.split("-").map(Number);
  const t = new Date(y, m - 1 + n, 1);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthGrid({ className, onPickDay }) {
  const today = localIso();
  const [ym, setYm] = useState(today.slice(0, 7));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const info = useMemo(() => monthInfo(ym), [ym]);
  const wrap = useRef(null);

  const load = useCallback(() => {
    setData(null);
    api.get(`/api/attendance?${qs({ class: className, from: info.from, to: info.to })}`).then((d) => {
      const marks = {};
      for (const m of d.marks) marks[`${m.studentId}|${m.iso}`] = m;
      setData({ students: d.students, marks, off: new Set(d.daysOff.map((x) => x.day)) });
    }).catch((e) => setError(e.message));
  }, [className, info]);
  useEffect(load, [load]);

  useEffect(() => {
    const el = wrap.current?.querySelector("th.r-today");
    if (el && wrap.current) wrap.current.scrollLeft = Math.max(0, el.offsetLeft - wrap.current.clientWidth / 2);
  }, [data]);

  async function cycle(studentId, iso) {
    const key = `${studentId}|${iso}`;
    const before = data.marks[key];
    const status = NEXT[before?.status];
    setData((d) => {
      const marks = { ...d.marks };
      if (status) marks[key] = { ...before, studentId, iso, status, reason: status === "absent" ? before?.reason ?? null : null };
      else delete marks[key];
      return { ...d, marks };
    });
    try {
      if (status) await api.post("/api/attendance", { studentId, date: iso, status, reason: status === "absent" ? before?.reason ?? null : null, note: before?.note ?? null });
      else await api.del(`/api/attendance?${qs({ studentId, date: iso })}`);
    } catch (e) {
      toast.error(e.message);
      setData((d) => ({ ...d, marks: { ...d.marks, [key]: before } }));
    }
  }

  function rate(studentId) {
    let marked = 0, inn = 0;
    for (const day of info.list) {
      if (data.off.has(day.iso)) continue;
      const m = data.marks[`${studentId}|${day.iso}`];
      if (m) { marked++; if (m.status !== "absent") inn++; }
    }
    return marked ? `${Math.round((inn / marked) * 1000) / 10}%` : "";
  }

  return (
    <div className="r-body">
      <div className="r-row r-spread">
        <div className="r-row">
          <button className="r-icon-btn r-icon-light" onClick={() => setYm(shiftMonth(ym, -1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <strong style={{ minWidth: 130, textAlign: "center" }}>{info.label}</strong>
          <button className="r-icon-btn r-icon-light" onClick={() => setYm(shiftMonth(ym, 1))} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
        <div className="r-legend">
          <span><i style={{ background: "var(--ink)" }} />/ Present</span>
          <span><i style={{ background: "#C3A6A0" }} />L Late</span>
          <span><i style={{ background: "#A15C38" }} />Absent: I illness, M medical, H holiday, N no reason</span>
          <span><i style={{ background: "var(--line)" }} />Day off</span>
        </div>
      </div>
      <p className="r-muted r-small" style={{ margin: 0 }}>Tap a square to cycle present, late, absent and clear. <span className="r-pointer-only">Point at a square to see its details. </span>Tap a date to open that day&apos;s register.</p>
      {error ? <p className="r-error">{error}</p> : !data ? <Loading /> : data.students.length === 0 ? <p className="r-empty">No students in this class yet.</p> : (
        <div className="r-table-wrap" ref={wrap}>
          <table className="r-table">
            <thead>
              <tr>
                <th className="r-sticky-col">Student</th>
                {info.list.map((d) => (
                  <th key={d.d} className={`r-cell${d.iso === today ? " r-today" : ""}`} aria-current={d.iso === today ? "date" : undefined}>
                    <button className="r-daybtn" onClick={() => onPickDay?.(d.iso)} title={`Open the register for ${d.iso}`}>{d.letter}<br />{d.d}</button>
                  </th>
                ))}
                <th>Month</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.id}>
                  <td className="r-sticky-col"><Link href={`/dashboard/students/${s.id}`}>{s.name}</Link></td>
                  {info.list.map((d) => {
                    const m = data.marks[`${s.id}|${d.iso}`];
                    const cls = `r-cell${data.off.has(d.iso) ? " r-off" : d.weekend ? " r-weekend" : ""}${d.iso === today ? " r-today" : ""}`;
                    return (
                      <td key={d.d} className={cls}>
                        <button className={m ? `m-${m.status}` : ""} onClick={() => cycle(s.id, d.iso)}
                          aria-label={`${s.name}, ${d.iso}: ${m ? m.status : "not marked"}`}
                          title={`${s.name}, ${d.iso}: ${m ? (m.status === "absent" ? `absent (${m.reason ? REASON_LABELS[m.reason] : "no reason yet"})` : m.status) : "not marked"}${m?.note ? `. Note: ${m.note}` : ""}`}>{markCode(m)}</button>
                      </td>
                    );
                  })}
                  <td>{rate(s.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
