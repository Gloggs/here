"use client";
import { Star, ListChecks, Shuffle, Music, SlidersHorizontal } from "lucide-react";
import Toolkit from "./Toolkit";
import { openMedia } from "../../MediaDock";

// Progressive disclosure (docs/DESIGN.md): the register is the job, so the extras wait here, one tap away.
// Each row says what the tool is for in plain words, so nobody has to guess.
export default function ClassTools({ cls, tool, open, children }) {
  const team = cls.kind === "team";
  if (tool) {
    return (
      <div className="r-tools-view">
        <div className="r-body" style={{ paddingBottom: 0 }}>
          <button type="button" className="r-linkbtn r-tools-back" onClick={() => open(null)}>Back to {team ? "team" : "class"} tools</button>
        </div>
        {children}
      </div>
    );
  }
  const rows = [
    { key: "points", icon: Star, title: "Points", text: "Give points for good work or behaviour, and set a weekly goal." },
    ...(team ? [] : [{ key: "tasks", icon: ListChecks, title: "Tasks", text: "Set work, then mark who finished it and when." }]),
  ];
  return (
    <div className="r-body">
      <ul className="r-list r-panel r-tools-list">
        {rows.map(({ key, icon: Icon, title, text }) => (
          <li key={key}>
            <button type="button" className="r-row-link" onClick={() => open(key)}>
              <Icon size={20} aria-hidden="true" />
              <span className="r-grow">{title}<span className="r-muted r-block">{text}</span></span>
            </button>
          </li>
        ))}
        <li>
          <Toolkit cls={cls} trigger={({ onOpen }) => (
            <button type="button" className="r-row-link" onClick={onOpen}>
              <Shuffle size={20} aria-hidden="true" />
              <span className="r-grow">Pick a name, groups and timer<span className="r-muted r-block">Choose someone who is here today, make random groups, or time an activity.</span></span>
            </button>
          )} />
        </li>
        <li>
          <button type="button" className="r-row-link" onClick={openMedia}>
            <Music size={20} aria-hidden="true" />
            <span className="r-grow">Play music or a video<span className="r-muted r-block">A YouTube or Spotify link that keeps playing while you use the app.</span></span>
          </button>
        </li>
        <li>
          <button type="button" className="r-row-link" onClick={() => open("settings")}>
            <SlidersHorizontal size={20} aria-hidden="true" />
            <span className="r-grow">{team ? "Team settings" : "Class settings"}<span className="r-muted r-block">Rename, change the attendance goal, or delete.</span></span>
          </button>
        </li>
      </ul>
    </div>
  );
}
