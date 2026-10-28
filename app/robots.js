const SITE = process.env.KINDE_SITE_URL || "https://webattendancesystem.vercel.app";

export default function robots() {
  return {
    rules: { userAgent: "*", allow: ["/", "/help", "/privacy", "/terms"], disallow: ["/dashboard", "/api", "/demo"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
