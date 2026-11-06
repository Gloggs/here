import Link from "next/link";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import DemoRegister from "./_landing/DemoRegister";
import Logo from "./_brand/Logo";
import { SiteFooter } from "./_landing/DocPage";
import ClearDevice from "./_brand/ClearDevice";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Here. | The class register that takes ten seconds",
  description: "For Saturday schools, faith classes, tuition, youth groups and adult learning. Take the register on your phone, even with no signal, and see who to check on.",
};

// The demo needs no account: /demo makes a private guest with the sample class.
const DEMO = "/demo";
const LOGIN = `/api/auth/login?post_login_redirect_url=${encodeURIComponent("/dashboard")}`;
const JOIN = `/api/auth/register?post_login_redirect_url=${encodeURIComponent("/dashboard")}`;

const STEPS = [
  ["Add your class", "Name it and paste the names straight from a spreadsheet. Thirty students take one paste."],
  ["Take the register", "Tap / present, L late or N absent, the same codes as a paper register. Pick a reason for absences, then mark everyone else present in one go."],
  ["See who to check on", "Anyone below 90%, or with an absence that has no reason, appears first thing on Today, with the days they miss most."],
];

const FEATURES = [
  ["Works with no signal", "Marks are saved on your phone and sent when you are back online. Works just as well on a laptop."],
  ["Who to check on", "Uses the 90% line schools work to, so you know who needs a conversation."],
  ["Reports to hand over", "Class summaries or every mark as a spreadsheet, for any date range."],
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
      {searchParams?.demo === "ended" ? <ClearDevice /> : null}
      <section className="l-hero">
        <div className="l-hero-copy">
          <h1 className="l-h1">The class register that takes ten seconds.</h1>
          <p className="l-lead">For Saturday schools, faith classes, tuition, youth groups and adult learning. Take the register on your phone, even with no signal, and see who to check on. Free, and private to your account.</p>
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
            {STEPS.map(([t, d]) => (
              <li key={t}>
                <h3>{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="l-section">
          <h2 className="l-h2">Everything a register needs, nothing it does not</h2>
          <div className="l-features">
            {FEATURES.map(([t, d]) => (
              <div key={t} className="l-feature">
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="l-section l-works" aria-labelledby="works">
          <h2 id="works" className="l-h2">Works with the tools you already use</h2>
          <ul className="l-works-list">
            <li><b>Zoho CRM</b><span>Import students, send attendance back</span></li>
            <li><b>WhatsApp</b><span>Ask a parent about an absence</span></li>
            <li><b>Email</b><span>The same note, by email</span></li>
            <li><b>YouTube</b><span>Play a clip in class</span></li>
            <li><b>Spotify</b><span>Music for group work</span></li>
          </ul>
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
