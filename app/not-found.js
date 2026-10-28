import Link from "next/link";

export const metadata = { title: "Page not found | Here." };

export default function NotFound() {
  return (
    <main style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="r-panel" style={{ maxWidth: 440, width: "100%" }}>
        <div className="r-head"><h1 className="r-title">Page not found</h1></div>
        <div className="r-panel-pad">
          <p style={{ marginTop: 0 }}>That page does not exist. It may have moved when the app was updated.</p>
          <div className="r-row">
            <Link className="r-btn" href="/dashboard">Go to today</Link>
            <Link className="r-btn r-btn-ghost" href="/">Home page</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
