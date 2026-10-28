"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Upload } from "lucide-react";
import { api, qs } from "@/lib/client";
import { AddStudentsForm, Dialog, Loading, StudentRow, useAccount } from "../../ui";
import { openImport } from "../../Command";

export default function ClassStudents({ className, onChange }) {
  const [students, setStudents] = useState(null);
  const [adding, setAdding] = useState(false);
  const { sandbox } = useAccount();
  const load = () => api.get(`/api/student?${qs({ class: className })}`).then(setStudents).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, [className]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="r-body">
      <section className="r-panel">
        <div className="r-panel-head">
          <h2 className="r-panel-title">{students ? `${students.length} ${students.length === 1 ? "student" : "students"}` : "Students"}</h2>
          <span className="r-row" style={{ gap: 8 }}>
            <button className="r-btn r-btn-ghost" onClick={() => openImport(className)}><Upload size={18} aria-hidden="true" /> Import from {sandbox ? "sample CRM" : "Zoho"}</button>
            <button className="r-btn" onClick={() => setAdding(true)}><Plus size={18} aria-hidden="true" /> Add students</button>
          </span>
        </div>
        {!students ? <Loading /> : students.length === 0 ? (
          <div className="r-empty-block">
            <p>Nobody in {className} yet. Paste the names from a spreadsheet and they all go in at once.</p>
            <button className="r-btn" onClick={() => setAdding(true)}>Add students</button>
          </div>
        ) : (
          <ul className="r-list">{students.map((s) => <StudentRow key={s.id} s={s} showClass={false} />)}</ul>
        )}
      </section>
      <Dialog open={adding} onClose={() => setAdding(false)} title={`Add students to ${className}`}>
        <AddStudentsForm fixedClass={className} autoFocus
          onDone={(r) => { toast.success(`Added ${r.added} ${r.added === 1 ? "student" : "students"}.`); setAdding(false); load(); onChange?.(); }} />
      </Dialog>
    </div>
  );
}
