import Logo from "../_brand/Logo";

export const metadata = { title: "No signal | Here." };

// Shown by the service worker when a page has never been opened on this phone and there is no signal.
export default function Offline() {
  return (
    <main style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="r-panel" style={{ maxWidth: 420, width: "100%" }}>
        <div className="r-head"><Logo onDark height={32} /><h1 className="r-title" style={{ marginTop: 20 }}>No signal</h1></div>
        <div className="r-panel-pad">
          <p style={{ marginTop: 0 }}>This page has not been opened on this phone yet, so it needs a connection the first time.</p>
          <p>Registers you have opened before still work with no signal. Marks are saved on this phone and sent when you are back online.</p>
          <a className="r-btn" href="/dashboard">Go to Today</a>
        </div>
      </div>
    </main>
  );
}
