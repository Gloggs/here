"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { zohoAdapter, demoAdapter } from "@/lib/crm-client";
import { PageHead, Panel, Loading, ConfirmButton, useAccount } from "../ui";
import CrmPanel from "./CrmPanel";
import SampleCrm from "./SampleCrm";

const ERRORS = {
  sandbox: "Apps can only be connected to your real register, not the sandbox or the demo.",
  declined: "Zoho was not connected because access was not approved.",
  state: "That connection link had expired or did not match. Please try again.",
  setup: "Zoho is not set up on this server yet.",
  failed: "Zoho could not be connected. Please try again.",
};

function Apps() {
  const router = useRouter();
  const params = useSearchParams();
  const { sandbox } = useAccount();
  const [data, setData] = useState(null);
  const load = () => api.get("/api/connections").then(setData).catch((e) => toast.error(e.message));

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const err = params.get("error"), ok = params.get("connected");
    if (err) toast.error(ERRORS[err] || ERRORS.failed);
    if (ok) toast.success("Zoho CRM is connected.");
    if (err || ok) router.replace("/dashboard/apps");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const zoho = data?.connections.find((c) => c.provider === "zoho");
  const zohoCrm = useMemo(() => zohoAdapter(), []);
  const demoCrm = useMemo(() => demoAdapter(), []);
  const [seen, setSeen] = useState(0);

  return (
    <>
      <PageHead back={{ href: "/dashboard/more", label: "More", phoneOnly: true }} title="Apps" sub="Connect the tools you already use. Each one is private to your account." />
      <div className="r-body" style={{ maxWidth: 820 }}>
        {!data ? <Loading rows={3} /> : (
          <>
            {sandbox ? (
              <Panel title="Sample CRM" pad>
                <p style={{ marginTop: 0 }}>A made-up CRM built into Here., so you can try everything the Zoho connection does without connecting anything: import students from contacts, link a student, send an attendance note, update fields and approve check-in tasks.</p>
                <p className="r-muted r-small">It lives in this browser only. Switch to My register to connect a real Zoho CRM.</p>
                <CrmPanel crm={demoCrm} onChange={() => setSeen((n) => n + 1)} />
                <SampleCrm version={seen} />
              </Panel>
            ) : (
              <Panel title="Zoho CRM" pad>
                <p style={{ marginTop: 0 }}>Bring students in from your own Zoho, link each one to a Contact, then send attendance back as a note, as fields Zoho can report on, or as a check-in task you approve.</p>
                <p className="r-muted r-small">Here. can read and update your Contacts and add notes and tasks. It cannot see deals, emails or anything else, and it only writes to Zoho when you press a button.</p>
                {!data.allowed ? <p className="r-muted" style={{ marginBottom: 0 }}>Switch to My register to connect apps. The sandbox and the demo never connect to real accounts.</p>
                  : zoho ? (
                    <>
                      <div className="r-row">
                        <span className="r-grow">Connected to <b>{zoho.label || "Zoho CRM"}</b></span>
                        {zoho.scopeVersion < 2 ? <a className="r-btn" href="/api/connect/zoho">Update permissions</a> : null}
                        <ConfirmButton className="r-btn r-btn-ghost" label="Disconnect" title="Disconnect Zoho CRM?" confirmLabel="Disconnect"
                          message="Here. will cancel its access with Zoho and forget which students are linked to which Contacts. Nothing in Zoho is deleted."
                          onConfirm={async () => { try { await api.del("/api/connections?provider=zoho"); toast.success("Zoho CRM disconnected."); load(); } catch (e) { toast.error(e.message); } }} />
                      </div>
                      <CrmPanel crm={zohoCrm} current={zoho.scopeVersion >= 2} />
                    </>
                  ) : <a className="r-btn" href="/api/connect/zoho">Connect Zoho CRM</a>}
              </Panel>
            )}

            <Panel title="WhatsApp and email" pad>
              <p style={{ marginTop: 0 }}>Ask a parent or carer about an absence from the student&apos;s profile. The message opens in your own WhatsApp or email with a polite note filled in, so you can check it before sending.</p>
              <p className="r-muted r-small" style={{ marginBottom: 0 }}>Nothing to connect. Add a contact number to a student for WhatsApp.</p>
            </Panel>

            <Panel title="YouTube and Spotify" pad>
              <p style={{ marginTop: 0 }}>Play a video or a playlist from a class&apos;s Tools, next to the timer and the name picker. Paste any YouTube or Spotify link.</p>
              <p className="r-muted r-small" style={{ marginBottom: 0 }}>Nothing to connect. YouTube plays in privacy-enhanced mode.</p>
            </Panel>

            <p className="r-muted r-small">Coming later: Canva certificates, Google Classroom and Microsoft Teams. Read how connections are kept private on the <Link href="/privacy">privacy page</Link>.</p>
          </>
        )}
      </div>
    </>
  );
}

export default function AppsPage() {
  return <Suspense fallback={<Loading />}><Apps /></Suspense>;
}
