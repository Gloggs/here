"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Sun, LayoutGrid, Users, FileText, Blocks, Settings, CircleHelp, Plus, Download, Upload, ClipboardCheck, Music, ArrowLeftRight, RefreshCw, UserRound, CornerDownLeft, Wrench } from "lucide-react";
import { api } from "@/lib/client";
import { useCrm } from "@/lib/crm-client";
import { useSpace } from "./Workspace";
import { openMedia } from "./MediaDock";
import { ImportDialog } from "./apps/CrmPanel";

// One box to reach everything: pages, classes, students and actions, opened with Ctrl K
// (or Cmd K) from anywhere in the app, or from the search box in the sidebar. Plain / is
// left alone because the register uses it to mark a student present.

export const OPEN_COMMAND = "here:command";
export const OPEN_IMPORT = "here:import";
export const openCommand = () => window.dispatchEvent(new Event(OPEN_COMMAND));
/** Opens the import dialog from anywhere. Pass a class name to import straight into it. */
export const openImport = (className) => window.dispatchEvent(new CustomEvent(OPEN_IMPORT, { detail: { className } }));

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** The search box in the sidebar and on phones. It opens the palette rather than searching on its own. */
export function CommandButton({ dark = false, label = "Search or jump to" }) {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(isMac()), []);
  return (
    <button type="button" className={`r-cmd-btn${dark ? " is-dark" : ""}`} onClick={openCommand} aria-label={`${label} (${mac ? "Cmd" : "Ctrl"} K)`}>
      <Search size={16} aria-hidden="true" /><span className="r-grow">{label}</span><kbd>{mac ? "⌘" : "Ctrl"} K</kbd>
    </button>
  );
}

function score(item, words) {
  if (!words.length) return item.rank ?? 0;
  const hay = `${item.label} ${item.hint || ""} ${item.keywords || ""}`.toLowerCase();
  if (!words.every((w) => hay.includes(w))) return -1;
  return (item.label.toLowerCase().startsWith(words[0]) ? 20 : 0) + (item.rank ?? 0);
}

export function CommandPalette() {
  const router = useRouter();
  const { space, guest, switchTo } = useSpace();
  const sandbox = space === "sandbox";
  const { crm, status } = useCrm(sandbox);
  const ref = useRef(null);
  const input = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [data, setData] = useState(null);

  useEffect(() => {
    function onKey(e) {
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey) && !e.altKey) { e.preventDefault(); setOpen((o) => !o); }
    }
    const show = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND, show);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(OPEN_COMMAND, show); };
  }, []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      if (!d.open) d.showModal();
      setQ(""); setActive(0);
      setTimeout(() => input.current?.focus(), 0);
      Promise.all([api.get("/api/classes"), api.get("/api/student")]).then(([classes, students]) => setData({ classes, students })).catch(() => setData({ classes: [], students: [] }));
    } else if (d.open) d.close();
  }, [open]);

  const crmName = crm.name;
  const crmReady = status?.connected && status?.current;

  const items = useMemo(() => {
    const go = (href) => () => router.push(href);
    const list = [
      { group: "Pages", label: "Today", hint: "Registers to take and who needs attention", icon: Sun, run: go("/dashboard"), rank: 9, keywords: "home dashboard" },
      { group: "Pages", label: "Classes", icon: LayoutGrid, run: go("/dashboard/classes"), rank: 8, keywords: "groups teams" },
      { group: "Pages", label: "Students", icon: Users, run: go("/dashboard/students"), rank: 7, keywords: "pupils people learners" },
      { group: "Pages", label: "Reports", hint: "Summaries and spreadsheets", icon: FileText, run: go("/dashboard/reports"), rank: 6, keywords: "export csv print download" },
      { group: "Pages", label: "Apps", hint: `${sandbox ? "Sample CRM" : "Zoho CRM"}, WhatsApp, YouTube, Spotify`, icon: Blocks, run: go("/dashboard/apps"), rank: 5, keywords: "zoho crm integrations connect" },
      { group: "Pages", label: "Settings", icon: Settings, run: go("/dashboard/settings"), rank: 4, keywords: "name theme dark account delete" },
      { group: "Pages", label: "Help", icon: CircleHelp, run: go("/help"), rank: 1, keywords: "codes how" },

      { group: "Actions", label: "New class", icon: Plus, run: go("/dashboard/classes?new=1"), rank: 15, keywords: "create add group" },
      { group: "Actions", label: "Add students", hint: "Paste names from a spreadsheet", icon: Plus, run: go("/dashboard/students?add=1"), rank: 14, keywords: "new pupils" },
      { group: "Actions", label: `Import students from ${crmName}`, hint: sandbox ? "Made-up contacts, to try it out" : "Pick Contacts, filtered by tag", icon: Upload, rank: 16, keywords: "zoho crm import contacts",
        run: () => (crmReady ? openImport() : router.push("/dashboard/apps")) },
      { group: "Actions", label: "Check-ins to approve", hint: `Students who need a call, as ${crmName} tasks`, icon: ClipboardCheck, rank: 13, keywords: "zoho tasks absent risk follow up",
        run: go("/dashboard/apps#checkins") },
      { group: "Actions", label: `Update attendance fields in ${crmName}`, hint: "Every linked student", icon: RefreshCw, rank: 12, keywords: "zoho sync push",
        run: async () => {
          if (!crmReady) { router.push("/dashboard/apps"); return; }
          try { const r = await crm.updateFields(); toast.success(`Updated ${r.updated} contact${r.updated === 1 ? "" : "s"} in ${crmName}.`); } catch (e) { toast.error(e.message); }
        } },
      { group: "Actions", label: "Play music or a video", hint: "YouTube or Spotify, keeps playing between pages", icon: Music, run: () => openMedia(), rank: 11, keywords: "spotify youtube media player" },
      { group: "Actions", label: "Download a report", icon: Download, run: go("/dashboard/reports"), rank: 10, keywords: "csv export print" },
      guest ? null : { group: "Actions", label: sandbox ? "Back to my register" : "Open the sandbox", hint: sandbox ? "Your real classes" : "Practice data, kept apart", icon: ArrowLeftRight, run: () => switchTo(sandbox ? "main" : "sandbox"), rank: 9, keywords: "space switch practice demo" },
      sandbox ? { group: "Actions", label: "Sandbox tools", hint: "Fill in today, simulate a bad week, reset", icon: Wrench, run: go("/dashboard/settings"), rank: 8, keywords: "reset sample" } : null,
    ].filter(Boolean);

    for (const c of data?.classes || []) {
      list.push({ group: "Classes", label: c.name, hint: `${c.students} ${c.students === 1 ? "student" : "students"}. Take the register`, icon: LayoutGrid, run: go(`/dashboard/classes/${c.id}`), rank: 3, keywords: "register class" });
    }
    for (const s of data?.students || []) {
      list.push({ group: "Students", label: s.name, hint: s.className, icon: UserRound, run: go(`/dashboard/students/${s.id}`), rank: 0, keywords: "student", onlyWhenTyping: true });
    }
    return list;
  }, [data, sandbox, guest, crm, crmName, crmReady, router, switchTo]);

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = useMemo(() => {
    const scored = items.filter((i) => words.length || !i.onlyWhenTyping).map((i) => ({ i, s: score(i, words) })).filter((x) => x.s >= 0);
    const order = ["Actions", "Pages", "Classes", "Students"];
    const groups = order.map((g) => ({ g, rows: scored.filter((x) => x.i.group === g).sort((a, b) => b.s - a.s).slice(0, g === "Students" ? 8 : g === "Classes" ? 6 : 10).map((x) => x.i) })).filter((x) => x.rows.length);
    return groups;
  }, [items, words.join(" ")]); // eslint-disable-line react-hooks/exhaustive-deps
  const flat = shown.flatMap((g) => g.rows);

  function choose(item) {
    setOpen(false);
    item?.run();
  }
  function onKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(flat[active]); }
  }
  useEffect(() => { document.getElementById(`cmd-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active]);

  let n = -1;
  return (
    <dialog ref={ref} className="r-cmd" aria-label="Search and actions" onClose={() => setOpen(false)}
      onClick={(e) => { if (e.target === ref.current) setOpen(false); }}>
      {open ? (
        <div className="r-cmd-box">
          <div className="r-cmd-input">
            <Search size={18} aria-hidden="true" />
            <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKeyDown}
              placeholder="Find a student, a class, or something to do" aria-label="Search" role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-activedescendant={flat.length ? `cmd-${active}` : undefined} autoComplete="off" spellCheck={false} />
            <kbd>Esc</kbd>
          </div>
          <div id="cmd-list" className="r-cmd-list" role="listbox">
            {flat.length === 0 ? (
              <p className="r-cmd-empty">{data ? `Nothing called “${q.trim()}”. Try a student's first name, a class, or a word like “import” or “report”.` : "Loading…"}</p>
            ) : shown.map(({ g, rows }) => (
              <div key={g} role="group" aria-label={g}>
                <p className="r-cmd-group">{g}</p>
                {rows.map((item) => {
                  n++;
                  const idx = n, Icon = item.icon;
                  return (
                    <button key={`${g}-${item.label}-${idx}`} id={`cmd-${idx}`} type="button" role="option" aria-selected={idx === active}
                      className="r-cmd-item" onMouseMove={() => setActive(idx)} onClick={() => choose(item)}>
                      <Icon size={18} aria-hidden="true" />
                      <span className="r-grow">{item.label}{item.hint ? <span className="r-muted r-block r-small">{item.hint}</span> : null}</span>
                      {idx === active ? <CornerDownLeft size={16} aria-hidden="true" className="r-muted" /> : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="r-cmd-foot r-muted r-small">Arrow keys to move, Enter to open. Press {isMac() ? "⌘" : "Ctrl"} K anywhere to come back here.</p>
        </div>
      ) : null}
    </dialog>
  );
}

/** Hosts the import dialog for the whole app, so any page or the palette can open it. */
export function ImportHost() {
  const router = useRouter();
  const { space, refresh } = useSpace();
  const { crm, status } = useCrm(space === "sandbox");
  const [target, setTarget] = useState(null); // { className } while open

  useEffect(() => {
    const onOpen = (e) => setTarget({ className: e.detail?.className || null });
    window.addEventListener(OPEN_IMPORT, onOpen);
    return () => window.removeEventListener(OPEN_IMPORT, onOpen);
  }, []);

  useEffect(() => {
    if (!target || !status) return;
    if (!status.connected) { toast.message("Connect Zoho CRM first. It takes a minute."); router.push("/dashboard/apps"); setTarget(null); }
    else if (!status.current) { toast.message("Zoho needs one more permission to import. Press Update permissions."); router.push("/dashboard/apps"); setTarget(null); }
  }, [target, status, router]);

  if (!target || !status?.connected || !status.current) return null;
  return <ImportDialog crm={crm} fixedClass={target.className} onClose={() => setTarget(null)} onDone={() => { setTarget(null); refresh(); }} />;
}

/** The magnifying glass in the phone top bar. */
export function TopbarSearch() {
  return <button type="button" className="r-icon-btn r-topbar-btn" onClick={openCommand} aria-label="Search or jump to"><Search size={18} aria-hidden="true" /></button>;
}
