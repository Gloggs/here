import Logo from "../_brand/Logo";

export const metadata = { title: "Signed out | Here." };

export default function SignedOut() {
  return (
    <main style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="r-panel" style={{ maxWidth: 420, width: "100%" }}>
        <div className="r-head"><Logo onDark height={32} /><h1 className="r-title" style={{ marginTop: 20 }}>Signed out</h1></div>
        <div className="r-panel-pad">
          <p style={{ marginTop: 0 }}>You have signed out. You can close this window.</p>
          <div className="r-row">
            <a className="r-btn" href="/api/auth/login?post_login_redirect_url=/dashboard">Sign in again</a>
            <a className="r-btn r-btn-ghost" href="/">Home page</a>
          </div>
        </div>
      </div>
    </main>
  );
}
