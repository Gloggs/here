"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, localIso, qs } from "@/lib/client";
import { PageHead, Loading } from "../../ui";
import Register from "../_parts/Register";
import MonthGrid from "../_parts/MonthGrid";
import ClassStudents from "../_parts/ClassStudents";
import ClassSettings from "../_parts/ClassSettings";
import Points from "../_parts/Points";
import Tasks from "../_parts/Tasks";
import Toolkit from "../_parts/Toolkit";

const CLASS_TABS = [["register", "Register"], ["points", "Points"], ["tasks", "Tasks"], ["month", "Month"], ["students", "Students"], ["settings", "Settings"]];
const TEAM_TABS = [["tasks", "Tasks"], ["register", "Attendance"], ["points", "Points"], ["month", "Month"], ["students", "People"], ["settings", "Settings"]];

function ClassHub({ id }) {
  const router = useRouter();
  const params = useSearchParams();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") || "") ? params.get("date") : localIso();
  const [classes, setClasses] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => api.get("/api/classes").then(setClasses).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const cls = classes?.find((c) => String(c.id) === String(id));
  const TABS = cls?.kind === "team" ? TEAM_TABS : CLASS_TABS;
  const tab = TABS.some(([t]) => t === params.get("tab")) ? params.get("tab") : TABS[0][0];
  const go = (next) => router.replace(`/dashboard/classes/${id}?${qs({ tab: next.tab ?? tab, date: (next.date ?? date) === localIso() ? undefined : next.date ?? date })}`, { scroll: false });

  if (error) return <><PageHead title="Class" /><div className="r-body"><p className="r-error">{error}</p></div></>;
  if (!classes) return <><PageHead title="Class" /><Loading /></>;
  if (!cls) return (
    <><PageHead title="Class not found" />
      <div className="r-body"><p>This class does not exist or was deleted.</p><Link className="r-btn" href="/dashboard/classes">See your classes</Link></div></>
  );

  return (
    <>
      <PageHead title={cls.name} sub={`${cls.kind === "team" ? "Team. " : ""}${cls.students} ${cls.kind === "team" ? (cls.students === 1 ? "person" : "people") : cls.students === 1 ? "student" : "students"}`} back={{ href: "/dashboard/classes", label: "Classes" }}>
        <Toolkit cls={cls} />
        {classes.length > 1 ? (
          <select className="r-select" style={{ width: "auto" }} aria-label="Switch class" value={cls.id}
            onChange={(e) => router.push(`/dashboard/classes/${e.target.value}?${qs({ tab })}`)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : null}
      </PageHead>
      <nav className="r-tabs" aria-label="Class sections">
        {TABS.map(([t, label]) => (
          <button key={t} aria-current={tab === t ? "page" : undefined} onClick={() => go({ tab: t })}>
            {label}{t === "students" ? <span className="r-tab-count">{cls.students}</span> : null}
          </button>
        ))}
      </nav>
      {tab === "register" ? <Register className={cls.name} classId={cls.id} date={date} setDate={(d) => go({ date: d })} focusStudent={Number(params.get("student")) || null} /> : null}
      {tab === "month" ? <MonthGrid className={cls.name} onPickDay={(d) => go({ tab: "register", date: d })} /> : null}
      {tab === "students" ? <ClassStudents className={cls.name} onChange={load} /> : null}
      {tab === "settings" ? <ClassSettings key={`${cls.id}-${cls.kind}-${cls.goalPct}`} cls={cls} onRenamed={load} /> : null}
      {tab === "points" ? <Points cls={cls} /> : null}
      {tab === "tasks" ? <Tasks classId={cls.id} className={cls.name} /> : null}
    </>
  );
}

export default function ClassPage({ params }) {
  return <Suspense fallback={<Loading />}><ClassHub id={params.id} /></Suspense>;
}
