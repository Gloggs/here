"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { api, qs } from "@/lib/client";
import { Panel, ConfirmButton } from "../../ui";

/** The account's behaviour list, shared by every group. */
function BehaviourEditor() {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/api/behaviours").then(setList).catch((e) => toast.error(e.message)); }, []);
  if (!list) return null;
  const update = (i, patch) => setList((l) => l.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  return (
    <Panel title="Behaviours for points" pad>
      <p className="r-muted" style={{ marginTop: 0 }}>These are the same in every group. Keep the list short so giving a point stays quick.</p>
      <ul className="r-blist">
        {list.map((b, i) => (
          <li key={i}>
            <div className="r-seg" role="group" aria-label="Worth">
              <button className="is-present" aria-pressed={b.value === 1} onClick={() => update(i, { value: 1 })}>+1</button>
              <button className="is-absent" aria-pressed={b.value === -1} onClick={() => update(i, { value: -1 })}>-1</button>
            </div>
            <input className="r-input" maxLength={40} value={b.name} onChange={(e) => update(i, { name: e.target.value })} aria-label="Behaviour name" />
            <button className="r-icon-btn" onClick={() => setList((l) => l.filter((_, j) => j !== i))} aria-label={`Remove ${b.name}`} data-tip="Remove"><X size={18} /></button>
          </li>
        ))}
      </ul>
      <div className="r-row" style={{ marginTop: 12 }}>
        {list.length < 12 ? <button className="r-btn r-btn-ghost" onClick={() => setList((l) => [...l, { name: "", value: 1 }])}><Plus size={18} aria-hidden="true" /> Add behaviour</button> : null}
        <button className="r-btn" disabled={busy} onClick={async () => {
          setBusy(true);
          try { setList(await api.put("/api/behaviours", { list: list.map((b) => ({ ...b, name: b.name.trim() })).filter((b) => b.name) })); toast.success("Behaviours saved."); }
          catch (e) { toast.error(e.message); }
          finally { setBusy(false); }
        }}>Save behaviours</button>
      </div>
    </Panel>
  );
}

export default function ClassSettings({ cls, onRenamed }) {
  const router = useRouter();
  const [name, setName] = useState(cls.name);
  const [goal, setGoal] = useState({ pct: cls.goalPct ?? "", reward: cls.goalReward ?? "" });
  const [busy, setBusy] = useState(false);
  const word = cls.kind === "team" ? "group" : "class";

  async function put(body, done) {
    setBusy(true);
    try { await api.put("/api/classes", { id: cls.id, ...body }); toast.success(done); onRenamed?.(); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  }
  async function remove() {
    try {
      await api.del(`/api/classes?${qs({ id: cls.id, withStudents: cls.students ? 1 : undefined })}`);
      toast.success(`${cls.name} deleted.`);
      router.push("/dashboard/classes");
    } catch (err) { toast.error(err.message); }
  }

  return (
    <div className="r-body" style={{ maxWidth: 720 }}>
      <Panel title="Name and type" pad>
        <form className="r-form" onSubmit={(e) => { e.preventDefault(); put({ name: name.trim() }, "Name saved."); }}>
          <div className="r-row">
            <input className="r-input" style={{ flex: 1, minWidth: 180 }} maxLength={30} value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
            <button className="r-btn" disabled={busy || !name.trim() || name.trim() === cls.name}>Save name</button>
          </div>
        </form>
        <p className="r-muted" style={{ margin: "16px 0 8px" }}>A class opens on its register. A team, such as colleagues or a project group, opens on its tasks.</p>
        <div className="r-seg" role="group" aria-label="Type">
          <button className="is-on" aria-pressed={cls.kind !== "team"} onClick={() => put({ kind: "class" }, "Now a class.")}>Class</button>
          <button className="is-on" aria-pressed={cls.kind === "team"} onClick={() => put({ kind: "team" }, "Now a team.")}>Team</button>
        </div>
      </Panel>

      <Panel title="Weekly goal" pad>
        <p className="r-muted" style={{ marginTop: 0 }}>A target the whole {word} works towards together, with a reward when it is reached. It shows on the Points tab.</p>
        <form className="r-form" onSubmit={(e) => { e.preventDefault(); put({ goalPct: goal.pct === "" ? null : Number(goal.pct), goalReward: goal.reward.trim() || null }, "Goal saved."); }}>
          <div className="r-dates">
            <label className="r-label">Attendance goal (%)<input className="r-input" type="number" min="50" max="100" inputMode="numeric" value={goal.pct} onChange={(e) => setGoal({ ...goal, pct: e.target.value })} placeholder="For example, 96" /></label>
            <label className="r-label">Reward (optional)<input className="r-input" maxLength={60} value={goal.reward} onChange={(e) => setGoal({ ...goal, reward: e.target.value })} placeholder="For example, film on Friday" /></label>
          </div>
          <div className="r-row">
            <button className="r-btn" disabled={busy}>Save goal</button>
            {cls.goalPct ? <button type="button" className="r-btn r-btn-ghost" onClick={() => { setGoal({ pct: "", reward: "" }); put({ goalPct: null, goalReward: null }, "Goal removed."); }}>Remove goal</button> : null}
          </div>
        </form>
      </Panel>

      <BehaviourEditor />

      <Panel title={`Delete ${word}`} pad>
        <p className="r-muted" style={{ marginTop: 0 }}>
          {cls.students ? `This removes the ${word}, its ${cls.students} members and everything recorded for them: marks, photos, points and tasks.` : `This ${word} has nobody in it.`}
        </p>
        <ConfirmButton label={`Delete ${cls.name}`} title={`Delete this ${word}?`} confirmLabel="Delete for good"
          message={cls.students ? `${cls.name}, its ${cls.students} members and everything recorded for them will be removed. This cannot be undone.` : `${cls.name} will be removed.`}
          onConfirm={remove} />
      </Panel>
    </div>
  );
}
