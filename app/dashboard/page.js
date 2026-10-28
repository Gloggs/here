"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Check, X } from "lucide-react";
import { api, qs, localIso, longDate, shortDate, pct, flag } from "@/lib/client";
import { PageHead, Panel, Bar, Loading, ClassCard, NewClassForm, StudentSearch, Dialog, useAccount } from "./ui";
import { useSpace } from "./Workspace";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** A short list that completes itself as people use the app, so the next step is always clear. */
function GettingStarted({ data }) {
  const [hidden, setHidden] = useState(true);
  const [local, setLocal] = useState({ profile: false, report: false });
  useEffect(() => { setHidden(flag("checklist-hidden")); setLocal({ profile: flag("seen-profile"), report: flag("used-report") }); }, []);
  const first = data.classes.find((c) => c.students > 0) || data.classes[0];
  const steps = [
    { done: data.totals.classes > 0, label: "Create a class", href: "/dashboard/classes" },
    { done: data.totals.students > 0, label: "Add your students", href: first ? `/dashboard/classes/${first.id}?tab=students` : "/dashboard/classes" },
    { done: data.year.marked > 0, label: "Take your first register", href: first ? `/dashboard/classes/${first.id}` : "/dashboard/classes" },
    { done: local.profile, label: "Open a student to see their pattern", href: "/dashboard/students" },
    { done: local.report, label: "Download or print a report", href: "/dashboard/reports" },
  ];
  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;
  const next = steps.find((s) => !s.done);
  return (
    <section className="r-panel r-start" aria-labelledby="start">
      <div className="r-panel-head">
        <h2 id="start" className="r-panel-title">Getting started: {done} of {steps.length} done</h2>
        <button className="r-icon-btn r-icon-bare" aria-label="Hide getting started" data-tip="Hide" onClick={() => { flag("checklist-hidden", true); setHidden(true); }}><X size={18} /></button>
      </div>
      <div className="r-panel-pad">
        <div className="r-bar r-bar-thick"><span style={{ width: `${(done / steps.length) * 100}%` }} /></div>
        <ol className="r-checklist">
          {steps.map((s) => (
            <li key={s.label} className={s.done ? "is-done" : s === next ? "is-next" : ""}>
              <span className="r-check" aria-hidden="true">{s.done ? <Check size={14} /> : null}</span>
              {s.done ? <span>{s.label}</span> : <Link href={s.href}>{s.label}</Link>}
              {s === next ? <span className="r-small r-strong">Next</span> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Today() {
  const router = useRouter();
  const { firstName, sandbox } = useAccount();
  const { switchTo } = useSpace();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const today = localIso();

  const load = () => api.get(`/api/overview?${qs({ date: today })}`).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function resetSandbox() {
    setBusy(true);
    try { await api.post("/api/sandbox", { action: "reset" }); toast.success("The sample class is back."); await load(); }
    catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  const name = firstName ? `, ${firstName}` : "";

  if (error) return <><PageHead title="Today" /><div className="r-body"><p className="r-error">{error}</p></div></>;
  if (!data) return <><PageHead title={`${greeting()}${name}`} sub={longDate(today)} /><Loading /></>;

  if (data.totals.classes === 0) {
    return (
      <>
        <PageHead title={`${greeting()}${name}`} sub={longDate(today)} />
        <div className="r-body r-split">
          <Panel title="Set up your first class" pad>
            <div className="r-quick">
              {sandbox ? <><span>The sandbox is empty.</span>
                <button className="r-btn r-btn-ghost" onClick={resetSandbox} disabled={busy}>{busy ? "Loading…" : "Bring back the sample class"}</button></>
              : <><span>Just looking around?</span>
                <button className="r-btn r-btn-ghost" onClick={() => switchTo("sandbox")}>Open the sandbox</button></>}
            </div>
            <p className="r-muted" style={{ margin: "0 0 16px" }}>Or set up your own: name the class, paste in your students, and you are ready to take the register.</p>
            <NewClassForm autoFocus={false} onDone={(cls, n) => { toast.success(n ? `${cls.name} is ready with ${n} students.` : `${cls.name} created.`); router.push(`/dashboard/classes/${cls.id}${n ? "" : "?tab=students"}`); }} />
          </Panel>
          <Panel title="How it works" pad>
            <ol className="r-steps" style={{ marginTop: 0 }}>
              <li><b>Take the register.</b> Tap / present, L late or N absent for each student, then mark the rest present.</li>
              <li><b>Spot patterns.</b> Students below 90% are flagged, with the days they miss most.</li>
              <li><b>Share reports.</b> Download a summary or every mark as a spreadsheet.</li>
            </ol>
          </Panel>
        </div>
      </>
    );
  }

  const left = data.classes.filter((c) => c.students > 0 && c.markedToday < c.students);
  const attention = data.watch.length + data.unexplained.length;

  return (
    <>
      <PageHead title={`${greeting()}${name}`}
        sub={data.isDayOff ? `${longDate(today)}. Marked as a day off.` : `${longDate(today)}. ${left.length ? `${left.length} ${left.length === 1 ? "register" : "registers"} to take.` : "All registers taken."}${data.streak >= 2 ? ` Registers taken ${data.streak} school days in a row.` : ""}`} />
      <div className="r-body">
        <GettingStarted data={data} />
        <div className="r-mobile-only"><StudentSearch /></div>

        <section aria-labelledby="regs">
          <div className="r-section-head">
            <h2 id="regs" className="r-h2">Today&apos;s registers</h2>
            <button className="r-linkbtn" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" /> New class</button>
          </div>
          <div className="r-cards">
            {[...left, ...data.classes.filter((c) => !left.includes(c))].map((c) => <ClassCard key={c.id} c={c} />)}
          </div>
        </section>

        <section aria-labelledby="att">
          <div className="r-section-head">
            <h2 id="att" className="r-h2">Needs attention {attention ? <span className="r-count">{attention}</span> : null}</h2>
          </div>
          <div className="r-grid2">
            <Panel title={`Below ${data.threshold}% this school year`}>
              {data.watch.length === 0 ? <p className="r-empty">Nobody is below {data.threshold}%. </p> : (
                <ul className="r-list">
                  {data.watch.map((s) => (
                    <li key={s.id}>
                      <Link className="r-row-link" href={`/dashboard/students/${s.id}`}>
                        <span className="r-grow">{s.name}<span className="r-muted r-block">{s.className}. {s.absent} absent, {s.late} late</span></span>
                        <span style={{ width: 88 }}><span className="r-small r-block" style={{ textAlign: "right", marginBottom: 4 }}>{s.pct}%</span><Bar value={s.pct} low /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Absences with no reason">
              {data.unexplained.length === 0 ? <p className="r-empty">Every absence has a reason.</p> : (
                <ul className="r-list">
                  {data.unexplained.map((m) => (
                    <li key={`${m.studentId}-${m.iso}`}>
                      <Link className="r-row-link" href={m.classId ? `/dashboard/classes/${m.classId}?${qs({ date: m.iso, student: m.studentId })}` : `/dashboard/students/${m.studentId}`}>
                        <span className="r-flag" aria-hidden="true" />
                        <span className="r-grow">{m.name}<span className="r-muted r-block">{m.className}</span></span>
                        <span className="r-muted r-small">{shortDate(m.iso)}</span>
                        <span className="r-small r-strong">Add reason</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </section>

        <section aria-labelledby="nums">
          <h2 id="nums" className="r-h2">At a glance</h2>
          <div className="r-stats">
            <div className="r-stat r-stat-key"><div className="r-stat-num">{pct(data.today.pct)}</div><div className="r-stat-label">In today ({data.today.marked} marked)</div></div>
            <div className="r-stat"><div className="r-stat-num">{pct(data.week.pct)}</div><div className="r-stat-label">This week</div></div>
            <div className="r-stat"><div className="r-stat-num">{pct(data.year.pct)}</div><div className="r-stat-label">School year so far</div></div>
            <div className="r-stat"><div className="r-stat-num">{data.totals.students}</div><div className="r-stat-label">Students in {data.totals.classes} {data.totals.classes === 1 ? "class" : "classes"}</div></div>
          </div>
          <p style={{ marginTop: 12 }}><Link href="/dashboard/reports">See full reports</Link></p>
        </section>
      </div>
      <Dialog open={adding} onClose={() => setAdding(false)} title="New class">
        <NewClassForm onDone={(cls, n) => { toast.success(`${cls.name} created.`); router.push(`/dashboard/classes/${cls.id}${n ? "" : "?tab=students"}`); }} />
      </Dialog>
    </>
  );
}

export default function TodayPage() {
  return <Suspense fallback={<Loading />}><Today /></Suspense>;
}
