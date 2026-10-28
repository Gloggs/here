"use client";
import Link from "next/link";

// Shown if a page crashes. The real error goes to the console, not the screen.
export default function Error({ error, reset }) {
  if (typeof console !== "undefined") console.error(error);
  return (
    <main style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="r-panel" style={{ maxWidth: 440, width: "100%" }}>
        <div className="r-head"><h1 className="r-title">Something went wrong</h1></div>
        <div className="r-panel-pad">
          <p style={{ marginTop: 0 }}>This page hit a problem. Your marks are saved as you tap, so nothing you entered before this should be lost.</p>
          <div className="r-row">
            <button className="r-btn" onClick={() => reset()}>Try again</button>
            <Link className="r-btn r-btn-ghost" href="/dashboard">Go to today</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
