"use client";
import { useState } from "react";

const PEOPLE = ["Amara Okafor", "Ben Hughes", "Chloe Patel", "Daniel Wright", "Ella Brown"];
const START = { 0: "present", 1: "present", 3: "absent" };
const WORD = { present: "Present", late: "Late", absent: "Absent" };

/** A working miniature of the register so visitors can feel it before signing in. */
export default function DemoRegister() {
  const [marks, setMarks] = useState(START);
  const [started, setStarted] = useState(null);
  const [took, setTook] = useState(null);
  function mark(next) {
    const t = started || Date.now();
    if (!started) setStarted(t);
    setMarks(next);
    if (Object.keys(next).length === PEOPLE.length && took === null) setTook(Math.max(1, Math.round((Date.now() - t) / 1000)));
  }
  const counts = Object.values(marks).reduce((a, s) => ({ ...a, [s]: a[s] + 1 }), { present: 0, late: 0, absent: 0 });
  const done = Object.keys(marks).length;
  return (
    <div className="l-demo" aria-label="Try the register">
      <div className="l-demo-head">
        <span className="l-demo-class">10B</span>
        <span>Wednesday 28 October</span>
      </div>
      <div className="l-demo-progress">
        <strong>{done === PEOPLE.length ? "Register complete" : `${done} of ${PEOPLE.length} marked`}</strong>
        <span>{counts.present} present · {counts.late} late · {counts.absent} absent</span>
        <div className="r-bar r-bar-thick"><span style={{ width: `${(done / PEOPLE.length) * 100}%` }} /></div>
      </div>
      <ul>
        {PEOPLE.map((p, i) => (
          <li key={p}>
            <span className="l-demo-name">{p}{marks[i] === "absent" ? <small>Illness</small> : null}</span>
            <span className="r-seg" role="group" aria-label={`Mark ${p}`}>
              {["present", "late", "absent"].map((st) => (
                <button key={st} type="button" className={`is-${st}`} aria-pressed={marks[i] === st} aria-label={WORD[st]} data-tip={WORD[st]}
                  onClick={() => mark({ ...marks, [i]: st })}>{st === "present" ? "/" : st === "late" ? "L" : marks[i] === "absent" && i === 3 ? "I" : "N"}</button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <div className="l-demo-foot">
        <button type="button" className="r-btn" disabled={done === PEOPLE.length}
          onClick={() => { const n = { ...marks }; PEOPLE.forEach((_, i) => { if (!n[i]) n[i] = "present"; }); mark(n); }}>
          {done === PEOPLE.length ? (took ? `Done in ${took} ${took === 1 ? "second" : "seconds"}` : "All marked") : `Mark the other ${PEOPLE.length - done} present`}
        </button>
        <button type="button" className="r-linkbtn" onClick={() => { setMarks(START); setStarted(null); setTook(null); }}>Reset</button>
      </div>
    </div>
  );
}
