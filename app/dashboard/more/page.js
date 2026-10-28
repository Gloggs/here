"use client";
import Link from "next/link";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs";
import { Users, Settings, CircleHelp, LogOut, ChevronRight, Shield, Blocks } from "lucide-react";
import { PageHead, useAccount } from "../ui";

const LINKS = [
  { href: "/dashboard/students", label: "Students", hint: "Everyone in every class", icon: Users },
  { href: "/dashboard/apps", label: "Apps", hint: "Zoho CRM, WhatsApp, YouTube, Spotify", icon: Blocks },
  { href: "/dashboard/settings", label: "Settings", hint: "Theme, sandbox, your data", icon: Settings },
  { href: "/help", label: "Help", hint: "How it works and register codes", icon: CircleHelp },
  { href: "/privacy", label: "Privacy", hint: "What is stored and why", icon: Shield },
];

export default function More() {
  const { user, guest } = useAccount();
  return (
    <>
      <PageHead title="More" sub={guest ? "Guest demo" : user?.email} />
      <div className="r-body">
        <ul className="r-list r-panel r-more">
          {LINKS.map(({ href, label, hint, icon: Icon }) => (
            <li key={href}>
              <Link className="r-row-link" href={href}>
                <Icon size={20} aria-hidden="true" />
                <span className="r-grow">{label}<span className="r-muted r-block">{hint}</span></span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            </li>
          ))}
          <li>
            {guest ? (
              <a href="/demo/end" className="r-row-link"><LogOut size={20} aria-hidden="true" /><span className="r-grow">End demo<span className="r-muted r-block">Deletes the demo data now</span></span></a>
            ) : (
              <LogoutLink postLogoutRedirectURL="/signed-out" className="r-row-link">
                <LogOut size={20} aria-hidden="true" />
                <span className="r-grow">Sign out</span>
              </LogoutLink>
            )}
          </li>
        </ul>
      </div>
    </>
  );
}
