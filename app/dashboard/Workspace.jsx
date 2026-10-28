"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client";
import MediaDock from "./MediaDock";
import { CommandPalette, ImportHost } from "./Command";

// Two spaces, like two desktops: the real register and a sandbox full of practice data.
// The server keeps them apart (each is its own owner id); this file makes switching
// between them feel like sliding to another screen.

const SpaceContext = createContext({ space: "main", guest: false, switchTo: () => {}, refresh: () => {} });
export const useSpace = () => useContext(SpaceContext);

const JOIN = "/api/auth/register?post_login_redirect_url=%2Fdashboard";
const OUT_MS = 280;

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Workspace({ space, guest, name, children }) {
  const router = useRouter();
  const params = useSearchParams();
  const [generation, setGeneration] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [motion, setMotion] = useState("");
  const pending = useRef(null);

  // The server sends the new space: remount the pages so they load its data, then slide in.
  useEffect(() => {
    if (!pending.current) return;
    const dir = pending.current;
    pending.current = null;
    setGeneration((g) => g + 1);
    setMotion(reducedMotion() ? "" : `is-enter-${dir}`);
    setSwitching(false);
    window.scrollTo(0, 0);
    const t = setTimeout(() => setMotion(""), 500);
    return () => clearTimeout(t);
  }, [space]);

  const switchTo = useCallback(async (target) => {
    if (target === space || switching) return;
    if (guest) { window.location.href = JOIN; return; }
    setSwitching(true);
    // The sandbox sits to the right of the real register, as desktop 2 sits to the right of desktop 1.
    const toRight = target === "sandbox";
    if (!reducedMotion()) setMotion(toRight ? "is-leave-left" : "is-leave-right");
    try {
      await Promise.all([api.post("/api/space", { space: target }), new Promise((r) => setTimeout(r, reducedMotion() ? 0 : OUT_MS))]);
      pending.current = toRight ? "right" : "left";
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setMotion("");
      setSwitching(false);
      toast.error(e.message);
    }
  }, [space, guest, switching, router]);

  // /dashboard?space=sandbox (used by /demo for signed-in visitors).
  useEffect(() => {
    const want = params.get("space");
    if (want === "sandbox" || want === "main") {
      router.replace("/dashboard");
      if (want !== space) switchTo(want);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl + Alt + left or right arrow switches space, like moving between desktops.
  useEffect(() => {
    function onKey(e) {
      if (!e.ctrlKey || !e.altKey || guest) return;
      if (e.key === "ArrowRight") switchTo("sandbox");
      if (e.key === "ArrowLeft") switchTo("main");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [switchTo, guest]);

  const refresh = useCallback(() => setGeneration((g) => g + 1), []);

  return (
    <SpaceContext.Provider value={{ space, guest, name, switchTo, refresh, switching }}>
      <div className={`r-space ${motion}`} data-space={space} key={generation}>{children}</div>
      <MediaDock />
      <CommandPalette />
      <ImportHost />
    </SpaceContext.Provider>
  );
}

/** The two tabs, like sheets in a spreadsheet. Used in the sidebar and the phone top bar. */
export function SpaceTabs({ compact = false }) {
  const { space, guest, switchTo, switching } = useSpace();
  const tabs = [["main", compact ? "Mine" : "My register"], ["sandbox", "Sandbox"]];
  return (
    <div className={`r-spacetabs${compact ? " is-compact" : ""}`} role="group" aria-label="Space">
      {tabs.map(([id, label]) => (
        <button key={id} type="button" aria-pressed={space === id} disabled={switching}
          title={guest && id === "main" ? "Create a free account to keep a real register" : id === "sandbox" ? "Practice data. Ctrl + Alt + right arrow" : "Your real classes. Ctrl + Alt + left arrow"}
          onClick={() => switchTo(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

const TOOLS = [
  { action: "fill-today", label: "Fill in today's register", hint: "Random marks for every student, so Today and Reports have something new." },
  { action: "bad-week", label: "Simulate a bad week", hint: "Three students miss most of the last five school days. Watch them get flagged." },
  { action: "add-students", label: "Add five students", hint: "More names to practise marking, points and tasks with." },
  { action: "reset", label: "Reset to the sample class", hint: "Start again with twelve students and four weeks of marks.", danger: true },
  { action: "clear", label: "Empty the sandbox", hint: "Practise setting up a class from nothing.", danger: true },
];

/** The sandbox's own tools. Shown in the sandbox bar and on the Settings page. */
export function SandboxTools({ onDone }) {
  const { refresh } = useSpace();
  const [busy, setBusy] = useState("");
  async function run(action) {
    setBusy(action);
    try {
      const r = await api.post("/api/sandbox", { action });
      toast.success(r.message);
      onDone?.();
      refresh();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(""); }
  }
  return (
    <ul className="r-tools">
      {TOOLS.map((t) => (
        <li key={t.action}>
          <span className="r-grow"><b>{t.label}</b><span className="r-muted r-block">{t.hint}</span></span>
          <button type="button" className={`r-btn${t.danger ? " r-btn-ghost" : ""}`} disabled={!!busy} onClick={() => run(t.action)}>
            {busy === t.action ? "Working…" : t.danger ? (t.action === "reset" ? "Reset" : "Empty") : "Run"}
          </button>
        </li>
      ))}
    </ul>
  );
}
