"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, qs, shortDate, pct, flag } from "@/lib/client";
import { PageHead, Panel, Bar, Dialog, Loading, ConfirmButton, Avatar, useAccount } from "../../ui";
import ContactPanel, { StudentCrm } from "./ContactPanel";
import PhotoEditor from "../../PhotoEditor";
import { Pencil } from "lucide-react";
import StudentForm from "../StudentForm";

const WORD = { present: "Present", late: "Late", absent: "Absent" };

export default function StudentProfile({ params }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState(false);
  const { guest, sandbox } = useAccount();
  const [error, setError] = useState("");

  const load = () => Promise.all([api.get(`/api/student/${params.id}`), api.get("/api/classes")])
    .then(([d, c]) => { setData(d); setClasses(c); }).catch((e) => setError(e.message));
  useEffect(() => { load(); flag("seen-profile", true); }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(values) {
    await api.put("/api/student", { ...values, id: Number(params.id) });
    toast.success("Saved."); setEditing(false); load();
  }
  async function remove() {
    try { await api.del(`/api/student?${qs({ id: params.id })}`); toast.success("Student removed."); router.push("/dashboard/students"); }
    catch (e) { toast.error(e.message); }
  }

  if (error) return <><PageHead title="Student" /><div className="r-body"><p className="r-error">{error}</p><Link href="/dashboard/students">Back to students</Link></div></>;
  if (!data) return <><PageHead title="Student" /><Loading /></>;

  const { student, summary, threshold, byWeekday, reasons, recent } = data;
  const classId = classes.find((c) => c.name === student.className)?.id;
  const low = summary.pct !== null && summary.pct < threshold;
  const worst = byWeekday.filter((w) => w.marked >= 3 && w.pct !== null).sort((a, b) => a.pct - b.pct)[0];

  return (
    <>
      <PageHead back={{ href: "/dashboard/students", label: "Students" }} title={student.name} lead={
        <span className="r-photo">
          <Avatar s={student} size={88} className="r-avatar-head" />
          <button className="r-photo-edit" onClick={() => setPhoto(true)} aria-label={student.photoAt ? "Change photo" : "Add a photo"} data-tip={student.photoAt ? "Change photo" : "Add a photo"}><Pencil size={16} /></button>
        </span>} sub={[student.className, student.contact, student.address].filter(Boolean).join(". ")}>
        {classId ? <Link className="r-btn r-btn-ghost" href={`/dashboard/classes/${classId}`}>Open {student.className}</Link> : null}
        <button className="r-btn r-btn-ghost" onClick={() => setEditing(true)}>Edit details</button>
      </PageHead>
      <div className="r-body">
        <div className="r-stats">
          <div className={`r-stat${low ? " r-stat-key" : ""}`}><div className="r-stat-num">{pct(summary.pct)}</div><div className="r-stat-label">This school year{low ? `. Below ${threshold}%` : ""}</div></div>
          <div className="r-stat"><div className="r-stat-num">{summary.absent}</div><div className="r-stat-label">Absent</div></div>
          <div className="r-stat"><div className="r-stat-num">{summary.late}</div><div className="r-stat-label">Late</div></div>
          <div className="r-stat"><div className="r-stat-num">{summary.unexplained}</div><div className="r-stat-label">No reason given</div></div>
        </div>

        <StudentCrm student={student} sandbox={sandbox} />

        <div className="r-grid2">
          <Panel title="By day of the week">
            <ul className="r-list">
              {byWeekday.map((w) => (
                <li key={w.day}>
                  <div style={{ width: 96 }}>{w.day}</div>
                  <div className="r-grow"><Bar value={w.pct ?? 0} low={w.pct !== null && w.pct < threshold} /></div>
                  <div className="r-small" style={{ width: 64, textAlign: "right" }}>{w.pct === null ? "None" : `${w.pct}%`}</div>
                </li>
              ))}
            </ul>
            {worst && worst.pct < threshold ? <p className="r-empty" style={{ paddingTop: 0 }}>Most often away on a {worst.day}.</p> : null}
          </Panel>
          <Panel title="Reasons for absence">
            {Object.keys(reasons).length === 0 ? <p className="r-empty">No absences this year.</p> : (
              <ul className="r-list">
                {Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
                  <li key={r}><div className="r-grow">{r}</div><b>{n}</b></li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Recent marks">
          {recent.length === 0 ? <p className="r-empty">No marks yet.</p> : (
            <ul className="r-list">
              {recent.map((m) => (
                <li key={m.iso}>
                  {m.status === "absent" ? <span className="r-flag" aria-hidden="true" /> : null}
                  <div className="r-grow">{WORD[m.status]}{m.reason ? `. ${m.reason}` : ""}{m.note ? <div className="r-muted">{m.note}</div> : null}</div>
                  <Link className="r-muted" href={`/dashboard/register?${qs({ class: student.className, date: m.iso })}`} title="Open that day's register">{shortDate(m.iso)}</Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <ContactPanel student={student} recent={recent} />

        <div className="r-row">
          <Link className="r-btn r-btn-ghost" href="/dashboard/students">Back to students</Link>
          <ConfirmButton className="r-btn r-btn-ghost" label="Remove student" title={`Remove ${student.name}?`} confirmLabel="Remove for good"
            message={`${student.name} and all their marks will be removed. This cannot be undone.`} onConfirm={remove} />
        </div>
      </div>
      <Dialog open={photo} onClose={() => setPhoto(false)} title={student.photoAt ? "Change photo" : "Add a photo"}>
        {guest ? (
          <div className="r-form">
            <p style={{ margin: 0 }}>Photos are turned off in the demo. With a free account you can take or upload a photo for each student, crop it and keep it private.</p>
            <a className="r-btn" href="/api/auth/register?post_login_redirect_url=%2Fdashboard">Create a free account</a>
          </div>
        ) : student.photoConsent ? (
          <PhotoEditor student={student} onClose={() => setPhoto(false)} onSaved={(at) => { setData((d) => ({ ...d, student: { ...d.student, photoAt: at } })); setPhoto(false); }} />
        ) : (
          <div className="r-form">
            <p style={{ margin: 0 }}>Schools need consent before keeping a photo of a pupil. Confirm you have it for {student.name}.</p>
            <button className="r-btn" onClick={async () => {
              try { await api.put("/api/student", { ...student, id: student.id, photoConsent: true }); setData((d) => ({ ...d, student: { ...d.student, photoConsent: true } })); }
              catch (e) { toast.error(e.message); }
            }}>I have consent, continue</button>
            <button className="r-btn r-btn-ghost" onClick={() => setPhoto(false)}>Not now</button>
          </div>
        )}
      </Dialog>
      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit student">
        <StudentForm classes={classes} initial={student} onSubmit={save} submitLabel="Save changes" />
      </Dialog>
    </>
  );
}
