"use client";
import { useState } from "react";
import { shortDate } from "@/lib/client";

/**
 * Weekly attendance as bars from 0 to 100%, with the 90% line marked.
 * Weeks below the line use clay and are named in the legend, so colour is never the only cue.
 */
export default function WeeklyChart({ weeks, threshold = 90, lineLabel = "persistent absence line", label = "attendance", empty = "No marks in this range yet." }) {
  const [hover, setHover] = useState(null);
  if (!weeks.length) return <p className="r-empty">{empty}</p>;
  const W = 640, H = 220, padL = 36, padB = 28, padT = 12;
  const plotW = W - padL - 8, plotH = H - padB - padT;
  const step = plotW / weeks.length;
  const barW = Math.max(6, Math.min(48, step - 6));
  const y = (v) => padT + plotH - (v / 100) * plotH;
  const every = Math.ceil(weeks.length / 8); // keep date labels from colliding

  return (
    <figure className="r-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weekly ${label} for ${weeks.length} weeks`}>
        {[0, 50, 100].map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} className="r-chart-grid" />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" className="r-chart-axis">{t}%</text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const x = padL + i * step + (step - barW) / 2;
          const low = w.pct < threshold;
          return (
            <g key={w.start} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
              <rect x={padL + i * step} y={padT} width={step} height={plotH} fill="transparent" />
              <rect x={x} y={y(w.pct)} width={barW} height={Math.max(1, y(0) - y(w.pct))} className={low ? "r-chart-bar is-low" : "r-chart-bar"} />
              {i % every === 0 ? <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="r-chart-axis">{shortDate(w.start).replace(/^\w+ /, "")}</text> : null}
            </g>
          );
        })}
        <line x1={padL} x2={W - 8} y1={y(threshold)} y2={y(threshold)} className="r-chart-line" />
        <text x={padL - 6} y={y(threshold) + 4} textAnchor="end" className="r-chart-axis">{threshold}%</text>
        {hover !== null ? (() => {
          const w = weeks[hover];
          const x = Math.min(W - 150, Math.max(padL, padL + hover * step + step / 2 - 70));
          return (
            <g pointerEvents="none">
              <rect x={x} y={padT} width={140} height={44} className="r-chart-tip" />
              <text x={x + 10} y={padT + 18} className="r-chart-tip-text">Week of {shortDate(w.start).replace(/^\w+ /, "")}</text>
              <text x={x + 10} y={padT + 36} className="r-chart-tip-text r-strong">{w.pct}% · {w.marked} marks</text>
            </g>
          );
        })() : null}
      </svg>
      <figcaption className="r-legend">
        <span><i style={{ background: "var(--ink)" }} />At or above {threshold}%</span>
        <span><i style={{ background: "#A15C38" }} />Below {threshold}%</span>
        <span><i className="r-legend-dash" />{threshold}% {lineLabel}</span>
      </figcaption>
      <table className="sr-only">
        <caption>Weekly {label}</caption>
        <thead><tr><th>Week starting</th><th>Percentage</th><th>Marks</th></tr></thead>
        <tbody>{weeks.map((w) => <tr key={w.start}><td>{w.start}</td><td>{w.pct}%</td><td>{w.marked}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
