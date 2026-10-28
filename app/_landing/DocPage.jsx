import Link from "next/link";
import Logo from "../_brand/Logo";

/** Plain reading page for policies and help, with the site header and footer. */
export default function DocPage({ title, updated, children }) {
  return (
    <div className="l-page">
      <header className="l-top">
        <Link href="/" className="l-logo" aria-label="Here. home"><Logo onDark height={32} /></Link>
        <nav className="l-top-nav" aria-label="Site"><Link className="l-top-link" href="/dashboard">Open the app</Link></nav>
      </header>
      <main className="l-doc">
        <h1 className="l-h2" style={{ marginBottom: 8 }}>{title}</h1>
        {updated ? <p className="r-muted" style={{ marginTop: 0 }}>Last updated {updated}</p> : null}
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="l-foot">
      <span>Built by Michael Ijisonuwe with Next.js, Postgres and Kinde.</span>
      <nav className="r-row" aria-label="Footer" style={{ gap: 16 }}>
        <Link href="/help">Help</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </nav>
    </footer>
  );
}
