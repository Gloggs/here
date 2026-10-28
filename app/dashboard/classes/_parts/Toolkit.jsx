"use client";
import { useEffect, useRef, useState } from "react";
import { Wrench, Shuffle, UsersRound, Timer as TimerIcon, Music } from "lucide-react";
import { openMedia } from "../../MediaDock";
import { api, qs, localIso } from "@/lib/client";
import { makeGroups } from "@/lib/insights";
import { Dialog, Avatar } from "../../ui";

/** People to use: whoever is marked present or late today, or everyone if the register is not taken yet. */
function useHere(cls, open) {
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!open) return;
    const d = localIso();
    api.get(`/api/attendance?${qs({ class: cls.name, from: d, to: d })}`).then((r) => {
      const inToday = new Set(r.marks.filter((m) => m.status !== "absent").map((m) => m.studentId));
      const here = r.students.filter((s) => inToday.has(s.id));
      setState(here.length ? { people: here, note: `${here.length} here today` } : { people: r.students, note: "Register not taken yet, so using everyone" });
    }).catch(() => setState({ people: [], note: "Could not load names" }));
  }, [open, cls.name]);
  return state;
}

function Picker({ people }) {
  const [pick, setPick] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [used, setUsed] = useState([]);
  function roll() {
    const pool = people.filter((p) => !used.includes(p.id));
    const from = pool.length ? pool : people;
    if (!from.length) return;
    setRolling(true);
    let n = 0;
    const t = setInterval(() => {
      setPick(from[Math.floor(Math.random() * from.length)]);
      if (++n >= 10) {
        clearInterval(t);
        const final = from[Math.floor(Math.random() * from.length)];
        setPick(final); setRolling(false);
        setUsed((u) => (pool.length ? [...u, final.id] : [final.id]));
      }
    }, 70);
  }
  return (
    <div className="r-tool">
      <div className={`r-pick${rolling ? "" : pick ? " is-done" : ""}`} aria-live="polite">
        {pick ? <><Avatar s={pick} size={96} /><strong>{pick.name}</strong></> : <span className="r-muted">Press the button to pick someone</span>}
      </div>
      <button className="r-btn r-btn-wide" onClick={roll} disabled={rolling || !people.length}>{pick ? "Pick again" : "Pick a name"}</button>
      <p className="r-muted r-small" style={{ margin: 0 }}>Nobody is picked twice until everyone has had a turn.</p>
    </div>
  );
}

function Groups({ people }) {
  const [n, setN] = useState(Math.max(2, Math.min(6, Math.round(people.length / 4))));
  const [groups, setGroups] = useState(null);
  return (
    <div className="r-tool">
      <div className="r-row">
        <label className="r-label" style={{ flex: 1 }}>Number of groups
          <input className="r-input" type="number" min="2" max={Math.max(2, people.length)} value={n} onChange={(e) => setN(Number(e.target.value))} inputMode="numeric" />
        </label>
        <button className="r-btn" style={{ alignSelf: "flex-end" }} onClick={() => setGroups(makeGroups(people, n))} disabled={people.length < 2}>{groups ? "Shuffle again" : "Make groups"}</button>
      </div>
      {groups ? (
        <ol className="r-groups">
          {groups.map((g, i) => (
            <li key={i}><strong>Group {i + 1}</strong><span>{g.map((p) => p.name).join(", ")}</span></li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function Timer() {
  const [total, setTotal] = useState(300);
  const [left, setLeft] = useState(300);
  const [running, setRunning] = useState(false);
  const end = useRef(null);
  useEffect(() => {
    if (!running) return;
    end.current = Date.now() + left * 1000;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((end.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        setRunning(false);
        try { // a short, gentle chime when time is up
          const a = new (window.AudioContext || window.webkitAudioContext)();
          [0, 0.25, 0.5].forEach((d) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.15, a.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d + 0.2); o.connect(g).connect(a.destination); o.start(a.currentTime + d); o.stop(a.currentTime + d + 0.22); });
        } catch {}
      }
    }, 250);
    return () => clearInterval(t);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (s) => { setTotal(s); setLeft(s); setRunning(false); };
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return (
    <div className="r-tool">
      <div className={`r-clock${left === 0 ? " is-up" : ""}`} role="timer" aria-live="off">{mm}:{ss}</div>
      <div className="r-bar r-bar-thick"><span style={{ width: `${total ? (left / total) * 100 : 0}%` }} /></div>
      <div className="r-chips">{[60, 120, 300, 600, 900].map((s) => <button key={s} className="r-chip" aria-pressed={total === s} onClick={() => set(s)}>{s / 60} min</button>)}</div>
      <div className="r-row">
        <button className="r-btn" onClick={() => (left === 0 ? set(total) : setRunning(!running))}>{running ? "Pause" : left === 0 ? "Reset" : left === total ? "Start" : "Carry on"}</button>
        <button className="r-btn r-btn-ghost" onClick={() => set(total)}>Reset</button>
      </div>
    </div>
  );
}

const TOOLS = [["pick", "Pick a name", Shuffle], ["groups", "Make groups", UsersRound], ["timer", "Timer", TimerIcon], ["media", "Media", Music]];

export default function Toolkit({ cls }) {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState("pick");
  const here = useHere(cls, open);
  return (
    <>
      <button className="r-btn r-btn-ghost" onClick={() => setOpen(true)}><Wrench size={18} aria-hidden="true" /> Tools</button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Tools for ${cls.name}`}>
        <div className="r-seg r-seg-big r-seg-tools" role="tablist" aria-label="Tool" style={{ marginBottom: 16 }}>
          {TOOLS.map(([k, label, Icon]) => (
            <button key={k} className="is-on" role="tab" aria-selected={tool === k} aria-pressed={tool === k} onClick={() => setTool(k)}><Icon size={20} aria-hidden="true" /> {label}</button>
          ))}
        </div>
        {tool === "pick" || tool === "groups" ? <p className="r-muted r-small" style={{ marginTop: 0 }}>{here ? here.note : "Loading names…"}</p> : null}
        {tool === "pick" && here ? <Picker people={here.people} /> : null}
        {tool === "groups" && here ? <Groups people={here.people} /> : null}
        {tool === "timer" ? <Timer /> : null}
        {tool === "media" ? <div className="r-tool"><p style={{ margin: 0 }}>Play a YouTube video or a Spotify playlist in a small player that stays open while you take the register or move between pages.</p><button className="r-btn" onClick={() => { setOpen(false); openMedia(); }}>Open the media player</button></div> : null}
      </Dialog>
    </>
  );
}
