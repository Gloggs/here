import Link from "next/link";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { ClipboardCheck, TriangleAlert, CalendarDays, FileSpreadsheet, Smartphone, Lock } from "lucide-react";
import DemoRegister from "./_landing/DemoRegister";
import Logo from "./_brand/Logo";
import { SiteFooter } from "./_landing/DocPage";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Here. | The class register that takes ten seconds",
  description: "Take attendance on your phone, spot students slipping below 90% and export reports. Private to your account.",
};

// The demo needs no account: /demo makes a private guest with the sample class.
const DEMO = "/demo";
const LOGIN = `/api/auth/login?post_login_redirect_url=${encodeURIComponent("/dashboard")}`;
const JOIN = `/api/auth/register?post_login_redirect_url=${encodeURIComponent("/dashboard")}`;

const STEPS = [
  ["Add your class", "Name it and paste the names straight from a spreadsheet. Thirty students take one paste."],
  ["Take the register", "Tap / present, L late or N absent, the same codes as a paper register. Pick a reason for absences, then mark everyone else present in one go."],
  ["Spot patterns early", "Anyone under 90% is flagged, with the days of the week they miss most."],
];

const FEATURES = [
  [Smartphone, "Made for your phone", "Big buttons, one hand, saves as you tap. Works just as well on a laptop."],
  [TriangleAlert, "Persistent absence flag", "Uses the 90% line schools work to, so you see who needs a conversation."],
  [ClipboardCheck, "Reasons, not just ticks", "Illness, appointment or holiday, plus a note. Missing reasons are chased for you."],
  [CalendarDays, "Month at a glance", "A grid of every mark this month. Tap any square to change it."],
  [FileSpreadsheet, "Reports to hand over", "Class summaries or every mark as a spreadsheet, for any date range."],
  [Lock, "Private by default", "Every account starts empty and nobody else can see your classes or marks."],
];

const NOTICES = {
  ended: "Your demo has ended and its data has been deleted. Thanks for trying Here.",
  busy: "The demo is very busy right now. Please try again in a few minutes, or create a free account.",
  error: "The demo could not start. Please try again in a moment.",
};

export default async function Home({ searchParams }) {
  const notice = NOTICES[searchParams?.demo];
  let signedIn = false;
  try { signedIn = await getKindeServerSession().isAuthenticated(); } catch { signedIn = false; }

  return (
    <div className="l-page">
      <header className="l-top">
        <Link href="/" className="l-logo" aria-label="Here. home"><Logo onDark height={32} /></Link>
        <nav className="l-top-nav" aria-label="Account">
          {signedIn ? <Link className="r-btn r-btn-light" href="/dashboard">Open your register</Link> : (
            <>
              <a className="l-top-link" href={LOGIN}>Sign in</a>
              <a className="r-btn r-btn-light" href={DEMO}>Try it now</a>
            </>
          )}
        </nav>
      </header>

      {notice ? <p className="l-notice" role="status">{notice}</p> : null}
      <section className="l-hero">
        <svg className="l-hero-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <rect x="1" y="1" width="62" height="62" fill="none" stroke="#332D2A" strokeWidth="0.5" />
          <path d="M38 12 L24 52" stroke="#3A3330" strokeWidth="7" strokeLinecap="square" />
          <rect x="44" y="45" width="8" height="8" fill="#3F2A20" />
        </svg>
        <div className="l-hero-copy">
          <h1 className="l-h1">The class register that takes ten seconds.</h1>
          <p className="l-lead">Take attendance on your phone, see who is slipping below 90% and hand over reports as a spreadsheet. Free to use, and private to your account.</p>
          <div className="r-row l-ctas">
            {signedIn ? <Link className="r-btn r-btn-light l-cta" href="/dashboard">Open your register</Link> : (
              <>
                <a className="r-btn r-btn-light l-cta" href={DEMO}>Try it now, no sign-up</a>
                <a className="r-btn r-btn-ghost l-cta" href={JOIN}>Create a free account</a>
              </>
            )}
          </div>
          <p className="l-small">{signedIn ? "Welcome back." : "The demo opens a full class straight away, with no email needed. When you want to keep your work, sign up with Google or a one-time email code."}</p>
        </div>
        <div className="l-hero-demo">
          <p className="l-try">Try it here. Tap / for present, L for late or N for absent.</p>
          <DemoRegister />
        </div>
      </section>

      <main>
        <section className="l-section">
          <h2 className="l-h2">How it works</h2>
          <ol className="l-steps">
            {STEPS.map(([t, d], i) => (
              <li key={t}>
                <span className="l-step-num">{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="l-section">
          <h2 className="l-h2">Everything a register needs, nothing it does not</h2>
          <div className="l-features">
            {FEATURES.map(([Icon, t, d]) => (
              <div key={t} className="l-feature">
                <Icon size={22} aria-hidden="true" />
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="l-band">
          <div>
            <h2 className="l-band-title">See it with a full class</h2>
            <p>Open the demo and a class of twelve students is waiting, with four weeks of marks, points and group tasks. No sign-up, and it clears itself after a day.</p>
          </div>
          <a className="r-btn r-btn-light l-cta" href={signedIn ? "/dashboard" : DEMO}>{signedIn ? "Open your register" : "Try it now"}</a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
