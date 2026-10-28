// Turns a pasted YouTube or Spotify link into an embed address. Anything else is refused,
// so the Toolkit can only ever load those two sites in its frame.
export function mediaEmbed(input) {
  let u;
  try { u = new URL(String(input || "").trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const id = (s) => (/^[A-Za-z0-9_-]{6,64}$/.test(s || "") ? s : null);
  if (host === "youtu.be") return yt(id(u.pathname.slice(1)));
  if (host === "youtube.com" || host === "music.youtube.com") {
    if (u.pathname === "/watch") return yt(id(u.searchParams.get("v")), id(u.searchParams.get("list")));
    if (u.pathname === "/playlist") return yt(null, id(u.searchParams.get("list")));
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([^/]+)/);
    if (m) return yt(id(m[2]));
  }
  if (host === "open.spotify.com") {
    const m = u.pathname.replace(/^\/intl-[a-z]+/, "").match(/^\/(playlist|album|track|episode|show|artist)\/([A-Za-z0-9]{10,40})/);
    if (m) return { kind: "spotify", src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, height: m[1] === "track" || m[1] === "episode" ? 152 : 352 };
  }
  return null;
}

function yt(video, list) {
  if (!video && !list) return null;
  const src = video
    ? `https://www.youtube-nocookie.com/embed/${video}${list ? `?list=${list}` : ""}`
    : `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`;
  return { kind: "youtube", src, height: null };
}
