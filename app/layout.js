import { DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

// DM Sans, the Guild UK typeface. next/font downloads it at build time and serves it from this site, with no request to Google.
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });

export const metadata = {
  metadataBase: new URL(process.env.KINDE_SITE_URL || "https://here.guilduk.com"),
  title: "Here.",
  description: "A simple, private class register: mark attendance, spot patterns and export reports.",
  applicationName: "Here.",
  appleWebApp: { capable: true, title: "Here.", statusBarStyle: "black-translucent" },
  openGraph: { type: "website", siteName: "Here.", title: "Here. The class register that takes ten seconds",
    description: "Take attendance on your phone, spot students slipping below 90% and export reports." },
  twitter: { card: "summary_large_image" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#174131" },
    { media: "(prefers-color-scheme: dark)", color: "#0A110D" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" className={dmSans.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Toaster position="top-center" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
