"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { PageHead, Panel, Loading, ConfirmButton, useAccount } from "../ui";

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

  return (
    <>
      <PageHead back={{ href: "/dashboard/more", label: "More", phoneOnly: true }} title="Apps" sub="Connect the tools you already use. Each one is private to your account." />
      <div className="r-body" style={{ maxWidth: 820 }}>
        {!data ? <Loading rows={3} /> : (
          <>
            <Panel title="Zoho CRM" pad>
              <p style={{ marginTop: 0 }}>Link a student to a Contact in your own Zoho, then add an attendance summary to that Contact with one tap from their profile.</p>
              <p className="r-muted r-small">Here. can read your Contacts and add notes. It cannot see deals, emails or anything else, and it only sends a note when you press Send.</p>
              {!data.allowed || sandbox ? <p className="r-muted" style={{ marginBottom: 0 }}>Switch to My register to connect apps. The sandbox and the demo never connect to real accounts.</p>
                : zoho ? (
                  <div className="r-row">
                    <span className="r-grow">Connected to <b>{zoho.label || "Zoho CRM"}</b></span>
                    <ConfirmButton className="r-btn r-btn-ghost" label="Disconnect" title="Disconnect Zoho CRM?" confirmLabel="Disconnect"
                      message="Here. will cancel its access with Zoho and forget which students are linked to which Contacts. Nothing in Zoho is deleted."
                      onConfirm={async () => { try { await api.del("/api/connections?provider=zoho"); toast.success("Zoho CRM disconnected."); load(); } catch (e) { toast.error(e.message); } }} />
                  </div>
                ) : <a className="r-btn" href="/api/connect/zoho">Connect Zoho CRM</a>}
            </Panel>

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
