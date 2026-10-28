import { cookies } from "next/headers";
import Link from "next/link";
import { Search } from "lucide-react";
import { SideNav, BottomNav } from "./Nav";
import { OfflineBar, SandboxBar } from "./ui";
import { Workspace, SpaceTabs } from "./Workspace";
import Logo from "../_brand/Logo";
import { getUserId } from "@/lib/auth";
import { SPACE_COOKIE } from "@/lib/guest";
import { eq } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { PROFILES } from "@/utils/schema";

async function displayName(userId) {
  if (!userId) return null;
  try {
    const [p] = await db.select({ name: PROFILES.displayName }).from(PROFILES).where(eq(PROFILES.ownerId, userId)).limit(1);
    return p?.name || null;
  } catch { return null; } // table not created yet
}

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  // Middleware has already checked there is a user or a demo guest.
  const userId = await getUserId();
  const guest = !userId;
  const name = await displayName(userId);
  const space = guest || cookies().get(SPACE_COOKIE)?.value === "sandbox" ? "sandbox" : "main";
  return (
    <Workspace space={space} guest={guest} name={name}>
      <div className="r-shell">
        <SideNav />
        <div className="r-main">
          <a className="r-skip" href="#main">Skip to content</a>
          <OfflineBar />
          <div className="r-topbar">
            <Link href="/dashboard" aria-label="Here. today"><Logo onDark height={28} /></Link>
            <SpaceTabs compact />
            <Link href="/dashboard/students" className="r-icon-btn r-topbar-btn" aria-label="Find a student"><Search size={18} aria-hidden="true" /></Link>
          </div>
          <SandboxBar />
          <div id="main" tabIndex={-1}>{children}</div>
        </div>
        <BottomNav />
      </div>
    </Workspace>
  );
}
