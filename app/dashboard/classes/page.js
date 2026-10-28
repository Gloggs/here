"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api, localIso, qs } from "@/lib/client";
import { PageHead, Dialog, Loading, ClassCard, NewClassForm } from "../ui";

export default function Classes() {
  const router = useRouter();
  const [classes, setClasses] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/api/overview?${qs({ date: localIso() })}`).then((d) => setClasses(d.classes)).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <PageHead title="Classes" sub={classes ? `${classes.length} ${classes.length === 1 ? "class" : "classes"}` : null}>
        <button className="r-btn r-btn-light" onClick={() => setAdding(true)}><Plus size={18} aria-hidden="true" /> New class</button>
      </PageHead>
      <div className="r-body">
        {error ? <p className="r-error">{error}</p> : !classes ? <Loading /> : (
          <div className="r-cards">
            {classes.map((c) => <ClassCard key={c.id} c={c} />)}
            <button className="r-card r-card-add" onClick={() => setAdding(true)}>
              <Plus size={22} aria-hidden="true" /><span>New class</span>
            </button>
          </div>
        )}
      </div>
      <Dialog open={adding} onClose={() => setAdding(false)} title="New class">
        <NewClassForm onDone={(cls, n) => {
          toast.success(n ? `${cls.name} created with ${n} students.` : `${cls.name} created.`);
          router.push(`/dashboard/classes/${cls.id}${n ? "" : "?tab=students"}`);
        }} />
      </Dialog>
    </>
  );
}
