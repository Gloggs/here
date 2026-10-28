"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trophy, Star, Clock, TrendingUp, Users } from "lucide-react";
import { api, qs, localIso, shiftIso } from "@/lib/client";
import { pointsSummary, celebrations, goalProgress } from "@/lib/insights";
import { summarise, weekStart } from "@/lib/register";
import { Panel, Dialog, Loading, Avatar, Bar } from "../../ui";

const RANGES = { week: "This week", month: "Last 30 days" };

/** Behaviour points with photo tiles, a weekly class goal and celebrations that never rank attendance. */
export default function Points({ cls }) {
  const today = localIso();
  const monday = weekStart(today);
  const [range, setRange] = useState("week");
  const [students, setStudents] = useState(null);
  const [points, setPoints] = useState([]);
  const [behaviours, setBehaviours] = useState([]);
  const [marks, setMarks] = useState([]);
  const [sheet, setSheet] = useState(null); // student id, or "all"
  const [bump, setBump] = useState(null);

  useEffect(() => {
    const from8 = shiftIso(today, -56);
    Promise.all([
      api.get(`/api/student?${qs({ class: cls.name })}`),
      api.get(`/api/points?${qs({ classId: cls.id, from: shiftIso(today, -30) })}`),
      api.get("/api/behaviours"),
      api.get(`/api/attendance?${qs({ class: cls.name, from: from8, to: today })}`),
    ]).then(([s, p, b, a]) => { setStudents(s); setPoints(p); setBehaviours(b); setMarks(a.marks); })
      .catch((e) => toast.error(e.message));
  }, [cls.id, cls.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const from = range === "week" ? monday : shiftIso(today, -30);
  const sum = useMemo(() => pointsSummary(points, from), [points, from]);
  const party = useMemo(() => students ? celebrations(marks, students, { weekFrom: monday, recentFrom: shiftIso(today, -28), previousFrom: shiftIso(today, -56), today }) : null, [marks, students, monday, today]);
  const goal = useMemo(() => goalProgress(summarise(marks.filter((m) => m.iso >= monday)).pct, cls.goalPct), [marks, monday, cls.goalPct]);

  async function give(studentIds, b) {
    setSheet(null);
    const results = await Promise.allSettled(studentIds.map((id) => api.post("/api/points", { studentId: id, behaviour: b.name })));
    const made = results.filter((r) => r.status === "fulfilled").map((r) => ({ ...r.value, createdAt: String(r.value.createdAt) }));
    if (!made.length) return toast.error("That point was not saved. Please try again.");
    setPoints((p) => [...made, ...p]);
    setBump(studentIds.length === 1 ? studentIds[0] : "all");
    setTimeout(() => setBump(null), 400);
    const who = studentIds.length === 1 ? students.find((s) => s.id === studentIds[0])?.name.split(" ")[0] : "everyone";
    toast.success(`${b.value > 0 ? "+1" : "-1"} ${b.name} for ${who}.`, {
      action: { label: "Undo", onClick: async () => {
        await Promise.all(made.map((m) => api.del(`/api/points?${qs({ id: m.id })}`).catch(() => null)));
        setPoints((p) => p.filter((x) => !made.some((m) => m.id === x.id)));
      } },
    });
  }

  if (!students) return <Loading />;
  if (!students.length) return <div className="r-body"><div className="r-empty-block"><p>Add people to this group to start giving points.</p><Link className="r-btn" href={`/dashboard/classes/${cls.id}?tab=students`}>Add people</Link></div></div>;

  const ranked = [...students].map((s) => ({ ...s, total: sum.totals.get(s.id) || 0 })).sort((a, b) => b.total - a.total);
  const sheetStudent = typeof sheet === "number" ? students.find((s) => s.id === sheet) : null;

  return (
    <div className="r-body">
      {cls.goalPct ? (
        <section className={`r-goal${goal?.met ? " is-met" : ""}`} aria-label="Class goal">
          <div className="r-goal-row">
            <Trophy size={22} aria-hidden="true" />
            <div className="r-grow">
              <strong>{goal?.met ? "Goal reached this week" : `Class goal: ${cls.goalPct}% attendance this week`}</strong>
              <span className="r-muted r-block">{cls.goalReward ? `Reward: ${cls.goalReward}. ` : ""}{goal ? (goal.met ? `The class is on ${goal.pct}%.` : `The class is on ${goal.pct}%, ${goal.gap} points to go.`) : "No marks yet this week."}</span>
            </div>
          </div>
          <div className="r-bar r-bar-thick"><span style={{ width: `${Math.min(100, ((goal?.pct || 0) / cls.goalPct) * 100)}%` }} /></div>
        </section>
      ) : (
        <p className="r-note">Set a weekly attendance goal and a reward for the whole class in <Link href={`/dashboard/classes/${cls.id}?tab=settings`}>Settings</Link>. Working towards it together motivates more than ranking anyone.</p>
      )}

      <div className="r-section-head">
        <h2 className="r-h2">Points {sum.ratio !== null ? <span className="r-muted" style={{ textTransform: "none", letterSpacing: 0 }}>{sum.ratio}% positive</span> : null}</h2>
        <div className="r-chips">{Object.entries(RANGES).map(([k, v]) => <button key={k} className="r-chip" aria-pressed={range === k} onClick={() => setRange(k)}>{v}</button>)}</div>
      </div>
      <ul className="r-grid-reg r-points-grid">
        <li>
          <button className={`r-tile r-tile-all${bump === "all" ? " is-bump" : ""}`} onClick={() => setSheet("all")}>
            <span className="r-avatar" style={{ width: 72, height: 72 }} aria-hidden="true"><Users size={30} /></span>
            <span className="r-tile-name">Whole class</span>
          </button>
        </li>
        {students.map((s) => {
          const t = sum.totals.get(s.id) || 0;
          return (
            <li key={s.id}>
              <button className={`r-tile${bump === s.id ? " is-bump" : ""}`} onClick={() => setSheet(s.id)} aria-label={`${s.name}, ${t} ${Math.abs(t) === 1 ? "point" : "points"}. Give a point`}>
                <Avatar s={s} size={72} />
                <span className="r-tile-name">{s.name.split(" ")[0]}</span>
                {t !== 0 ? <span className={`r-tile-code r-pts${t < 0 ? " is-neg" : ""}`} aria-hidden="true">{t > 0 ? `+${t}` : t}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="r-grid2">
        <Panel title={`Top points: ${RANGES[range].toLowerCase()}`}>
          {ranked.every((s) => s.total <= 0) ? <p className="r-empty">No points yet. Tap a face above to give one.</p> : (
            <ol className="r-list r-podium">
              {ranked.filter((s) => s.total > 0).slice(0, 5).map((s, i) => (
                <li key={s.id}>
                  <span className="r-rank">{i + 1}</span>
                  <Avatar s={s} size={36} />
                  <Link className="r-grow" href={`/dashboard/students/${s.id}`}>{s.name}</Link>
                  <strong>+{s.total}</strong>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Panel title="Worth celebrating">
          <ul className="r-list">
            <li><Star size={20} aria-hidden="true" /><span className="r-grow"><b>Every day this week</b><span className="r-muted r-block">{party.fullWeek.length ? party.fullWeek.map((s) => s.name.split(" ")[0]).join(", ") : "Nobody yet. Check back on Friday."}</span></span></li>
            <li><Clock size={20} aria-hidden="true" /><span className="r-grow"><b>On time for the last 10 sessions</b><span className="r-muted r-block">{party.onTime.length ? party.onTime.map((s) => s.name.split(" ")[0]).join(", ") : "Nobody yet."}</span></span></li>
            <li><TrendingUp size={20} aria-hidden="true" /><span className="r-grow"><b>Most improved attendance</b><span className="r-muted r-block">{party.improved.length ? party.improved.map((s) => `${s.name.split(" ")[0]} (${s.from}% to ${s.to}%)`).join(", ") : "No big changes in the last four weeks."}</span></span></li>
          </ul>
        </Panel>
      </div>

      <Dialog open={sheet !== null} onClose={() => setSheet(null)} title={sheet === "all" ? "Give the whole class a point" : sheetStudent ? `Give ${sheetStudent.name.split(" ")[0]} a point` : "Give a point"}>
        {sheet !== null ? (
          <div className="r-form">
            {sheetStudent ? <div className="r-row" style={{ gap: 14 }}><Avatar s={sheetStudent} size={56} /><span className="r-muted">{sum.totals.get(sheetStudent.id) || 0} points {RANGES[range].toLowerCase()}</span></div> : null}
            <div>
              <div className="r-small r-strong" style={{ marginBottom: 8 }}>Well done</div>
              <div className="r-behaviours">
                {behaviours.filter((b) => b.value > 0).map((b) => <button key={b.name} className="r-behaviour is-good" onClick={() => give(sheet === "all" ? students.map((s) => s.id) : [sheet], b)}><b>+1</b> {b.name}</button>)}
              </div>
            </div>
            {behaviours.some((b) => b.value < 0) ? (
              <div>
                <div className="r-small r-strong" style={{ marginBottom: 8 }}>Needs work</div>
                <div className="r-behaviours">
                  {behaviours.filter((b) => b.value < 0).map((b) => <button key={b.name} className="r-behaviour is-work" onClick={() => give(sheet === "all" ? students.map((s) => s.id) : [sheet], b)}><b>-1</b> {b.name}</button>)}
                </div>
              </div>
            ) : null}
            <p className="r-muted r-small" style={{ margin: 0 }}>Change these behaviours in this class&apos;s Settings tab.</p>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
