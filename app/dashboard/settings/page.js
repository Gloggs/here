"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { api } from "@/lib/client";
import Link from "next/link";
import { PageHead, Panel, ConfirmButton, useAccount } from "../ui";
import { useSpace, SandboxTools } from "../Workspace";

export default function SettingsPage() {
  const { user, guest, sandbox, name } = useAccount();
  const { switchTo } = useSpace();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setMounted(true), []);

  const router = useRouter();
  const [draft, setDraft] = useState(null);
  async function saveName(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.put("/api/profile", { name: draft });
      toast.success(r.name ? "Name saved." : "Using the name from your sign-in.");
      setDraft(null);
      router.refresh();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  }

  async function removeOldSample() {
    setBusy(true);
    try { const r = await api.del("/api/sample"); toast.success(r.removed ? "Sample data removed from your register." : "There was no sample data in your register."); }
    catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHead back={{ href: "/dashboard/more", label: "More", phoneOnly: true }} title="Settings" />
      <div className="r-body" style={{ maxWidth: 720 }}>
        {guest ? (
          <Panel title="Guest demo" pad>
            <p style={{ marginTop: 0 }}>You are trying Here. without an account. Everything works, but it is wiped after 24 hours and photos are turned off.</p>
            <div className="r-row">
              <a className="r-btn" href="/api/auth/register?post_login_redirect_url=%2Fdashboard">Create a free account</a>
              <a className="r-btn r-btn-ghost" href="/demo/end">End demo now</a>
            </div>
          </Panel>
        ) : (
        <Panel title="Account" pad>
          <form onSubmit={saveName} className="r-name-form">
            <label className="r-label" htmlFor="display-name" style={{ marginBottom: 6 }}>Your name</label>
            <div className="r-row" style={{ gap: 8 }}>
              <input id="display-name" className="r-input r-grow" maxLength={60} autoComplete="name"
                value={draft ?? name} onChange={(e) => setDraft(e.target.value)} placeholder="How the app greets you" />
              <button className="r-btn" disabled={busy || draft === null || draft.trim() === name}>Save</button>
            </div>
            <p className="r-muted r-small" style={{ margin: "6px 0 0" }}>Shown in the greeting and the sidebar. Leave it empty to use the name from your sign-in.</p>
          </form>
          <p className="r-muted" style={{ margin: "16px 0" }}>Signed in as {user?.email}</p>
          <p className="r-muted">Your classes, students and marks belong to this account only. Nobody else who signs in can see them.</p>
          <LogoutLink postLogoutRedirectURL="/signed-out" className="r-btn r-btn-ghost">Sign out</LogoutLink>
        </Panel>
        )}

        <Panel title="Appearance" pad>
          <div className="r-seg" role="group" aria-label="Theme">
            {[["light", "Light"], ["dark", "Dark"], ["system", "Match device"]].map(([id, label]) => (
              <button key={id} className="is-on" aria-pressed={mounted && theme === id} onClick={() => setTheme(id)}>{label}</button>
            ))}
          </div>
        </Panel>

        {sandbox ? (
          <Panel title="Sandbox tools" pad>
            <p className="r-muted" style={{ marginTop: 0 }}>You are in the sandbox. Everything here is practice data, kept apart from {guest ? "real accounts" : "your real register"}.</p>
            <SandboxTools />
            {guest ? null : <button className="r-btn r-btn-ghost" style={{ marginTop: 16 }} onClick={() => switchTo("main")}>Back to my register</button>}
          </Panel>
        ) : (
          <Panel title="Sandbox" pad>
            <p className="r-muted" style={{ marginTop: 0 }}>A second space with a sample class of 12 students and four weeks of marks. Try anything there first. It never touches your real classes.</p>
            <div className="r-row">
              <button className="r-btn" onClick={() => switchTo("sandbox")}>Open the sandbox</button>
              <ConfirmButton className="r-btn r-btn-ghost" label="Remove old sample data" title="Remove the sample class from your register?" confirmLabel="Remove sample class"
                message="Older versions put the sample class in your real register. This removes it and its 12 students. Your own classes are not touched." onConfirm={removeOldSample} />
            </div>
          </Panel>
        )}

        {sandbox ? null : <Panel title="Your data" pad>
          <p className="r-muted" style={{ marginTop: 0 }}>Download a complete copy of everything in your account, or remove it all. Deleting cannot be undone. Read the <Link href="/privacy">privacy page</Link> for details.</p>
          <div className="r-row">
            <a className="r-btn r-btn-ghost" href="/api/account/export" download>Download all my data</a>
            <ConfirmButton label="Delete all my data" title="Delete everything?" confirmLabel="Delete everything"
              message="Every class, student, mark and day off in this account, and everything in your sandbox, will be removed straight away. This cannot be undone. Download a copy first if you might need it."
              onConfirm={async () => { try { await api.del("/api/account"); toast.success("All your data has been deleted."); window.location.href = "/dashboard"; } catch (e) { toast.error(e.message); } }} />
          </div>
        </Panel>}

        <Panel title="How it works" pad>
          <ul className="r-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Take the register on any device. Each tap saves straight away.</li>
            <li>Late counts as in. Absent asks for a reason so you can spot patterns.</li>
            <li>Students below 90% are flagged. That is the line the DfE uses for persistent absence.</li>
            <li>Add half terms and bank holidays as days off so they do not count.</li>
            <li>Download a summary or every mark as a spreadsheet from Reports.</li>
          </ul>
          <p style={{ marginBottom: 0 }}><Link href="/help">Read the full help page</Link></p>
        </Panel>
      </div>
    </>
  );
}
