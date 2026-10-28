"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Upload } from "lucide-react";
import { api } from "@/lib/client";
import { PageHead, Dialog, Loading, AddStudentsForm, StudentRow, useAccount } from "../ui";
import { openImport } from "../Command";
import StudentForm from "./StudentForm";

function Students() {
  const router = useRouter();
  const params = useSearchParams();
  const { sandbox } = useAccount();
  const crmName = sandbox ? "the sample CRM" : "Zoho";
  const [classes, setClasses] = useState(null);
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(null); // "many" | "one" | null
  const [error, setError] = useState("");

  async function load() {
    try {
      const [c, s] = await Promise.all([api.get("/api/classes"), api.get("/api/student")]);
      setClasses(c); setStudents(s);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (params.get("add")) { setAdding("many"); router.replace("/dashboard/students", { scroll: false }); }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => students.filter((s) =>
    (!filter || s.className === filter) && (!search || s.name.toLowerCase().includes(search.trim().toLowerCase()))), [students, filter, search]);

  if (error) return <><PageHead title="Students" /><div className="r-body"><p className="r-error">{error}</p></div></>;
  if (!classes) return <><PageHead title="Students" /><Loading /></>;

  return (
    <>
      <PageHead back={{ href: "/dashboard/more", label: "More", phoneOnly: true }} title="Students" sub={`${students.length} ${students.length === 1 ? "student" : "students"} in ${classes.length} ${classes.length === 1 ? "class" : "classes"}`}>
        {classes.length ? <>
          <button className="r-btn r-btn-ghost" onClick={() => openImport()}><Upload size={18} aria-hidden="true" /> Import from {sandbox ? "sample CRM" : "Zoho"}</button>
          <button className="r-btn r-btn-light" onClick={() => setAdding("many")}><Plus size={18} aria-hidden="true" /> Add students</button>
        </> : null}
      </PageHead>
      <div className="r-body">
        {!classes.length ? (
          <div className="r-empty-block">
            <p>Students belong to a class. Create your first class and add students in the same step.</p>
            <Link className="r-btn" href="/dashboard/classes">Create a class</Link>
          </div>
        ) : (
          <section className="r-panel">
            <div className="r-row r-panel-pad r-toolbar">
              <input className="r-input" type="search" style={{ flex: 2, minWidth: 180 }} placeholder="Search by name" aria-label="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="r-select" style={{ flex: 1, minWidth: 150 }} aria-label="Filter by class" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="">All classes</option>
                {classes.map((c) => <option key={c.id} value={c.name}>{c.name} ({c.students})</option>)}
              </select>
            </div>
            {shown.length === 0 ? (
              <div className="r-empty-block">
                <p>{students.length ? "Nobody matches that search." : "No students yet."}</p>
                {!students.length ? <button className="r-btn" onClick={() => setAdding("many")}>Add students</button> : null}
              </div>
            ) : (
              <ul className="r-list">{shown.map((s) => <StudentRow key={s.id} s={s} />)}</ul>
            )}
          </section>
        )}
      </div>
      <Dialog open={adding === "many"} onClose={() => setAdding(null)} title="Add students">
        <AddStudentsForm classes={classes} autoFocus onDone={(r) => { toast.success(`Added ${r.added} ${r.added === 1 ? "student" : "students"}.`); setAdding(null); load(); }} />
        <p className="r-muted r-small" style={{ marginBottom: 0 }}>Need a contact number or address? <button className="r-linkbtn" onClick={() => setAdding("one")}>Add one student with details</button></p>
        <p className="r-muted r-small" style={{ marginBottom: 0 }}>Already in {crmName}? <button className="r-linkbtn" onClick={() => { setAdding(null); openImport(); }}>Import them instead</button>, already linked to their contacts.</p>
      </Dialog>
      <Dialog open={adding === "one"} onClose={() => setAdding(null)} title="Add a student">
        <StudentForm classes={classes} submitLabel="Add student" onSubmit={async (v) => { await api.post("/api/student", v); toast.success(`${v.name} added.`); setAdding(null); load(); }} />
      </Dialog>
    </>
  );
}

export default function StudentsPage() {
  return <Suspense fallback={<Loading />}><Students /></Suspense>;
}
