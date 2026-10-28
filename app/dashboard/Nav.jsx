"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, LayoutGrid, Users, FileText, Settings, Menu, Blocks } from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs";
import { StudentSearch, useAccount } from "./ui";
import { SpaceTabs } from "./Workspace";
import Logo from "../_brand/Logo";

const ITEMS = [
  { href: "/dashboard", label: "Today", icon: Sun },
  { href: "/dashboard/classes", label: "Classes", icon: LayoutGrid },
  { href: "/dashboard/students", label: "Students", icon: Users },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/apps", label: "Apps", icon: Blocks },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function isCurrent(path, href) {
  return href === "/dashboard" ? path === href : path.startsWith(href);
}

export function SideNav() {
  const path = usePathname();
  const { user, guest, name } = useAccount();
  return (
    <nav className="r-side" aria-label="Main">
      <Link href="/dashboard" className="r-brand" aria-label="Here. today"><Logo onDark height={36} /></Link>
      <div className="r-side-space"><SpaceTabs /></div>
      <div className="r-side-search"><StudentSearch dark /></div>
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={isCurrent(path, href) ? "page" : undefined}>
          <Icon size={18} aria-hidden="true" /> {label}
        </Link>
      ))}
      <div className="r-side-foot">
        <p className="r-side-user">{guest ? "Demo, no account" : name || user?.email || "Signed in"}</p>
        <div className="r-row" style={{ gap: 16 }}>
          <Link className="r-side-signout" href="/help">Help</Link>
          {guest ? <a className="r-side-signout" href="/demo/end">End demo</a>
            : <LogoutLink postLogoutRedirectURL="/signed-out" className="r-side-signout">Sign out</LogoutLink>}
        </div>
      </div>
    </nav>
  );
}

// Phones get four plain choices. Students, Settings and Help live under More.
const PHONE = [
  { href: "/dashboard", label: "Today", icon: Sun },
  { href: "/dashboard/classes", label: "Classes", icon: LayoutGrid },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/more", label: "More", icon: Menu, also: ["/dashboard/students", "/dashboard/settings", "/dashboard/apps"] },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="r-bottom" aria-label="Main">
      {PHONE.map(({ href, label, icon: Icon, also = [] }) => (
        <Link key={href} href={href} aria-current={isCurrent(path, href) || also.some((a) => path.startsWith(a)) ? "page" : undefined}>
          <Icon size={22} aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
