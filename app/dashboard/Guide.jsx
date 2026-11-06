"use client";
import { useEffect, useState } from "react";
import { api, flag } from "@/lib/client";
import { Dialog } from "./ui";

export const OPEN_GUIDE = "here:open-guide";

/** Opens the guide again, from Settings > Help. */
export function openGuide() {
  window.dispatchEvent(new Event(OPEN_GUIDE));
}

// Four short steps, shown once ever for each account (saved on the server, so a new phone does not show it again).
// After that the same steps live in Settings > Help. The words are also the ones the help page uses.
export const GUIDE_STEPS = [
  { title: "Take the register", text: "Today always shows the next register to take. Tap / for present, L for late or N for absent, the same marks as a paper register. Every tap saves straight away." },
  { title: "Mark the rest in one tap", text: "When most people are in, tap Mark the others present. The stamp shows when the register is finished." },
  { title: "See who to check on", text: "Anyone below 90% this year, or with an absence that has no reason, appears on Today, so you know who to talk to." },
  { title: "Everything else is one tap away", text: "Points, tasks, a name picker, groups, a timer and music are in Class tools. Reports make a spreadsheet. Help is always in Settings." },
];

export default function Guide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const show = () => { setStep(0); setOpen(true); };
    window.addEventListener(OPEN_GUIDE, show);
    // First visit only: this device already knows, or the account says it has seen it.
    if (!flag("guide-seen")) {
      api.get("/api/flags").then((r) => {
        if (r.seen.includes("guide")) flag("guide-seen", true);
        else show();
      }).catch(() => {});
    }
    return () => window.removeEventListener(OPEN_GUIDE, show);
  }, []);

  function close() {
    setOpen(false);
    flag("guide-seen", true);
    api.post("/api/flags", { name: "guide" }).catch(() => {});
  }

  const s = GUIDE_STEPS[step];
  const last = step === GUIDE_STEPS.length - 1;
  return (
    <Dialog open={open} onClose={close} title="How here works">
      <div className="r-guide" aria-live="polite">
        <p className="r-muted r-small" style={{ margin: 0 }}>Step {step + 1} of {GUIDE_STEPS.length}</p>
        <h3 className="r-guide-title">{s.title}</h3>
        <p className="r-guide-text">{s.text}</p>
        <div className="r-guide-foot">
          {step > 0 ? <button type="button" className="r-btn r-btn-ghost" onClick={() => setStep(step - 1)}>Back</button>
            : <button type="button" className="r-linkbtn" onClick={close}>Skip the guide</button>}
          <button type="button" className="r-btn" onClick={() => (last ? close() : setStep(step + 1))}>{last ? "Start using here" : "Next"}</button>
        </div>
      </div>
    </Dialog>
  );
}
