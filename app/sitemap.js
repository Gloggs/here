const SITE = process.env.KINDE_SITE_URL || "https://webattendancesystem.vercel.app";

export default function sitemap() {
  return ["", "/help", "/privacy", "/terms"].map((path) => ({ url: `${SITE}${path}`, changeFrequency: "monthly" }));
}
