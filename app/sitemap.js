const SITE = process.env.KINDE_SITE_URL || "https://here.guilduk.com";

export default function sitemap() {
  return ["", "/help", "/privacy", "/terms"].map((path) => ({ url: `${SITE}${path}`, changeFrequency: "monthly" }));
}
