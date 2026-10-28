"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronUp, TriangleAlert } from "lucide-react";
import { api, qs, localIso, shiftIso, shortDate } from "@/lib/client";
import { taskStats, taskWeeks, TASK_CODES } from "@/lib/insights";
import { weekStart } from "@/lib/register";
import { Panel, Dialog, Loading, Avatar, Bar, ConfirmButton } from "../../ui";
import WeeklyChart from "../../WeeklyChart";

const WORD = { done: "Done", late: "Late", missed: "Not done" };

function fridayOf(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(y, m - 1, d).getDay();
  return shiftIso(iso, (5 - wd + 7) % 7);
}

function TaskForm({ initial, onSubmit, submitLabel }) {
  const [f, setF] = useState({ title: "", due: fridayOf(localIso()), notes: "", ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form className="r-form" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError("");
      try { await onSubmit({ title: f.title.trim(), due: f.due, notes: f.notes?.trim() || null }); }
      catch (err) { setError(err.message); setBusy(false); }
    }}>
      {error ? <p className="r-error" role="alert">{error}</p> : null}
      <label className="r-label">Task<input className="r-input" maxLength={80} required autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="For example, Week 3 report" /></label>
      <label className="r-label">Due<input className="r-input" type="date" required value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></label>
      <label className="r-label">Notes (optional)<input className="r-input" maxLength={300} value={f.notes || ""} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="What needs handing in" /></label>
      <button className="r-btn r-btn-wide" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
    </form>
  );
}

/** One task, opened to record each member's result and share of the work. */
function TaskCard({ task, students, today, onMark, onClear, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const marks = new Map(task.marks.map((m) => [m.studentId, m]));
  const done = task.marks.filter((m) => m.status !== "missed").length;
  const overdue = task.due < today;
  return (
    <li className={`r-task${open ? " is-open" : ""}`}>
      <button className="r-task-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="r-grow">
          <span className="r-task-title">{task.title}</span>
          <span className="r-muted r-block">Due {shortDate(task.due)}. {done} of {students.length} done{overdue && task.marks.length < students.length ? `. ${students.length - task.marks.length} not marked` : ""}</span>
        </span>
        <span style={{ width: 72 }}><Bar value={students.length ? (done / students.length) * 100 : 0} /></span>
        {open ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
      </button>
      {open ? (
        <div className="r-task-body">
          {task.notes ? <p className="r-muted" style={{ margin: "0 0 8px" }}>{task.notes}</p> : null}
          <ul className="r-list">
            {students.map((s) => {
              const m = marks.get(s.id);
              return (
                <li key={s.id} className="r-task-row">
                  <Avatar s={s} size={32} />
                  <span className="r-grow">{s.name}</span>
                  {m && m.status !== "missed" ? (
                    <label className="r-share" data-tip="Share of the work">
                      <input type="number" min="0" max="100" inputMode="numeric" defaultValue={m.share ?? ""} placeholder="%" aria-label={`${s.name} share of the work, percent`}
                        onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== (m.share ?? null)) onMark(task, s.id, m.status, v); }} />
                      <span aria-hidden="true">%</span>
                    </label>
                  ) : null}
                  <div className="r-seg" role="group" aria-label={`${s.name} result`}>
                    {["done", "late", "missed"].map((st) => (
                      <button key={st} className={`is-${st === "done" ? "present" : st === "late" ? "late" : "absent"}`} aria-pressed={m?.status === st}
                        aria-label={WORD[st]} data-tip={WORD[st]} onClick={() => (m?.status === st ? onClear(task, s.id) : onMark(task, s.id, st, m?.share ?? null))}>
                        {TASK_CODES[st]}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="r-row" style={{ marginTop: 12 }}>
            <button className="r-btn r-btn-ghost" onClick={() => onEdit(task)}>Edit task</button>
            <ConfirmButton className="r-btn r-btn-ghost" label="Delete task" title={`Delete ${task.title}?`} confirmLabel="Delete task"
              message="The task and everyone's result for it will be removed." onConfirm={() => onDelete(task)} />
          </div>
        </div>
      ) : null}
    </li>
  );
}

export default function Tasks({ classId, className }) {
  const today = localIso();
  const [tasks, setTasks] = useState(null);
  const [students, setStudents] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => Promise.all([api.get(`/api/tasks?${qs({ classId })}`), api.get(`/api/student?${qs({ class: className })}`)])
    .then(([t, s]) => { setTasks(t); setStudents(s); }).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => (tasks ? taskStats(tasks, students, today) : []), [tasks, students, today]);
  const weeks = useMemo(() => (tasks ? taskWeeks(tasks, students.length, today, weekStart) : []), [tasks, students, today]);
  const flags = stats.filter((s) => s.flag);

  function patch(taskId, studentId, mark) {
    setTasks((ts) => ts.map((t) => t.id !== taskId ? t : { ...t, marks: [...t.marks.filter((m) => m.studentId !== studentId), ...(mark ? [{ studentId, ...mark }] : [])] }));
  }
  async function onMark(task, studentId, status, share) {
    const before = task.marks.find((m) => m.studentId === studentId);
    patch(task.id, studentId, { status, share: status === "missed" ? null : share });
    try { await api.post("/api/tasks/marks", { taskId: task.id, studentId, status, share }); }
    catch (e) { toast.error(e.message); patch(task.id, studentId, before || null); }
  }
  async function onClear(task, studentId) {
    const before = task.marks.find((m) => m.studentId === studentId);
    patch(task.id, studentId, null);
    try { await api.del(`/api/tasks/marks?${qs({ taskId: task.id, studentId })}`); }
    catch (e) { toast.error(e.message); patch(task.id, studentId, before); }
  }

  if (!tasks) return <Loading />;
  const upcoming = tasks.filter((t) => t.due >= today);
  const past = tasks.filter((t) => t.due < today).reverse();

  return (
    <div className="r-body">
      <div className="r-section-head">
        <h2 className="r-h2">Tasks</h2>
        <button className="r-btn" onClick={() => setAdding(true)} disabled={!students.length}><Plus size={18} aria-hidden="true" /> New task</button>
      </div>
      {!students.length ? <div className="r-empty-block"><p>Add people to this group first, then set tasks and record who did what.</p><Link className="r-btn" href={`/dashboard/classes/${classId}?tab=students`}>Add people</Link></div> : null}
      {students.length && !tasks.length ? (
        <div className="r-empty-block">
          <p>Set a task, such as homework, a project or a weekly report. Then mark each person done, late or not done, and their share of the work. Over time this builds a picture of who is doing what.</p>
          <button className="r-btn" onClick={() => setAdding(true)}>Set the first task</button>
        </div>
      ) : null}

      {tasks.length ? (
        <>
          {flags.length ? (
            <div className="r-note-strong" role="status">
              <TriangleAlert size={18} aria-hidden="true" />
              <span>{flags.map((f) => `${f.name}: ${f.flag.toLowerCase()}`).join(". ")}.</span>
            </div>
          ) : null}
          <div className="r-grid2">
            <Panel title="Who did what">
              <div className="r-table-wrap" style={{ border: 0 }}>
                <table className="r-table">
                  <thead><tr><th>Person</th><th>Completed</th><th>On time</th><th>Share of work</th><th style={{ minWidth: 90 }}></th></tr></thead>
                  <tbody>
                    {[...stats].sort((a, b) => (b.workload ?? -1) - (a.workload ?? -1)).map((s) => (
                      <tr key={s.studentId}>
                        <td><Link href={`/dashboard/students/${s.studentId}`}>{s.name}</Link>{s.flag ? <span className="r-flag" style={{ marginLeft: 8 }} aria-label={s.flag} /> : null}</td>
                        <td>{s.completion === null ? "None yet" : `${s.completion}%`}</td>
                        <td>{s.onTime === null ? "None yet" : `${s.onTime}%`}</td>
                        <td>{s.workload === null ? "None" : `${s.workload}%`}</td>
                        <td><Bar value={s.workload ? Math.min(100, s.workload * (students.length || 1) / 2) : 0} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="r-muted r-small" style={{ padding: "0 16px 12px", margin: 0 }}>Share of work adds up each person&apos;s percentages across all tasks. With {students.length} people an even split is about {students.length ? Math.round(100 / students.length) : 0}% each.</p>
            </Panel>
            <Panel title="Completed by week">
              <div className="r-panel-pad"><WeeklyChart weeks={weeks} threshold={80} lineLabel="target" label="task completion" empty="Results appear here once tasks are due." /></div>
            </Panel>
          </div>
          {upcoming.length ? <><h2 className="r-h2">Coming up</h2><ul className="r-tasks">{upcoming.map((t) => <TaskCard key={t.id} task={t} students={students} today={today} onMark={onMark} onClear={onClear} onEdit={setEditing} onDelete={async (x) => { await api.del(`/api/tasks?${qs({ id: x.id })}`); toast.success("Task deleted."); load(); }} />)}</ul></> : null}
          {past.length ? <><h2 className="r-h2">Past tasks</h2><ul className="r-tasks">{past.map((t) => <TaskCard key={t.id} task={t} students={students} today={today} onMark={onMark} onClear={onClear} onEdit={setEditing} onDelete={async (x) => { await api.del(`/api/tasks?${qs({ id: x.id })}`); toast.success("Task deleted."); load(); }} />)}</ul></> : null}
        </>
      ) : null}

      <Dialog open={adding} onClose={() => setAdding(false)} title="New task">
        <TaskForm submitLabel="Set task" onSubmit={async (v) => { await api.post("/api/tasks", { ...v, classId }); toast.success("Task set."); setAdding(false); load(); }} />
      </Dialog>
      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Edit task">
        {editing ? <TaskForm initial={editing} submitLabel="Save task" onSubmit={async (v) => { await api.put("/api/tasks", { ...v, id: editing.id }); toast.success("Task saved."); setEditing(null); load(); }} /> : null}
      </Dialog>
    </div>
  );
}
