"use client";
import { useEffect, useRef, useState } from "react";
import { Music, Minus, X, PictureInPicture2, ExternalLink } from "lucide-react";
import { mediaEmbed } from "@/lib/media";

// One media player for the whole app. It lives in the dashboard layout, so it keeps
// playing while you move between pages. It can shrink to a small button, or pop out
// into its own always-on-top window where the browser supports it.

const KEY = "here_media";
export const OPEN_MEDIA = "here:open-media";

/** Opens the player from anywhere, e.g. a button on Today or in a class's Tools. */
export function openMedia() {
  window.dispatchEvent(new Event(OPEN_MEDIA));
}

function spotifyLink(src) {
  return src.replace("https://open.spotify.com/embed/", "https://open.spotify.com/");
}

export default function MediaDock() {
  const [view, setView] = useState("closed"); // closed | open | mini | popped
  const [link, setLink] = useState("");
  const [embed, setEmbed] = useState(null);
  const [error, setError] = useState("");
  const [canPop, setCanPop] = useState(false);
  const pip = useRef(null);

  useEffect(() => {
    try { const saved = localStorage.getItem(KEY); if (saved) setLink(saved); } catch {}
    setCanPop(typeof window !== "undefined" && "documentPictureInPicture" in window);
    const open = () => setView((v) => (v === "popped" ? v : "open"));
    window.addEventListener(OPEN_MEDIA, open);
    return () => window.removeEventListener(OPEN_MEDIA, open);
  }, []);

  function play(e) {
    e.preventDefault();
    const m = mediaEmbed(link);
    if (!m) { setError("Paste a link from YouTube or Spotify."); return; }
    setError(""); setEmbed(m);
    try { localStorage.setItem(KEY, link.trim()); } catch {}
  }

  function stop() {
    pip.current?.close();
    setEmbed(null); setView("closed");
  }

  // A floating window that stays above other apps, such as slides on the board.
  async function popOut() {
    if (!embed || !window.documentPictureInPicture) return;
    try {
      const w = await window.documentPictureInPicture.requestWindow({ width: 420, height: embed.kind === "youtube" ? 260 : 152 });
      pip.current = w;
      w.document.body.style.cssText = "margin:0;background:#262220";
      const f = w.document.createElement("iframe");
      f.src = embed.src;
      f.allow = "autoplay; encrypted-media; fullscreen";
      f.style.cssText = "border:0;width:100%;height:100vh;display:block";
      w.document.body.append(f);
      setView("popped");
      w.addEventListener("pagehide", () => { pip.current = null; setView("mini"); });
    } catch { /* the browser said no; keep the docked player */ }
  }

  const playing = !!embed && view !== "popped";
  return (
    <div className={`r-dock is-${view}`}>
      {view === "open" ? (
        <section className="r-dock-panel" aria-label="Media player">
          <div className="r-dock-head">
            <b>Media</b>
            <span className="r-row" style={{ gap: 4 }}>
              {canPop && embed ? <button className="r-icon-btn" onClick={popOut} aria-label="Pop out into a floating window" data-tip="Pop out"><PictureInPicture2 size={18} /></button> : null}
              <button className="r-icon-btn" onClick={() => setView(embed ? "mini" : "closed")} aria-label="Minimise" data-tip="Minimise"><Minus size={18} /></button>
              <button className="r-icon-btn" onClick={stop} aria-label="Stop and close" data-tip="Stop and close"><X size={18} /></button>
            </span>
          </div>
          <form className="r-row r-dock-form" onSubmit={play}>
            <input className="r-input r-grow" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a YouTube or Spotify link" aria-label="YouTube or Spotify link" inputMode="url" />
            <button className="r-btn">Play</button>
          </form>
          {error ? <p className="r-error" style={{ margin: "0 12px 12px" }}>{error}</p> : null}
          {!embed ? <p className="r-muted r-small r-dock-hint">Music for group work, a countdown video, or a clip for the lesson. It keeps playing while you use the rest of the app.</p> : null}
          {embed?.kind === "spotify" ? <p className="r-muted r-small r-dock-hint">Spotify plays 30-second previews unless you are signed in to Spotify in this browser and it allows Spotify&apos;s cookies. <a href={spotifyLink(embed.src)} target="_blank" rel="noopener noreferrer">Open in Spotify <ExternalLink size={12} aria-hidden="true" /></a></p> : null}
        </section>
      ) : null}
      {playing ? (
        <div className={`r-dock-player${view === "open" ? "" : " is-hidden"}`} style={embed.kind === "spotify" ? { height: 152 } : undefined}>
          <iframe src={embed.src} title={embed.kind === "youtube" ? "YouTube video" : "Spotify player"}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        </div>
      ) : null}
      {view !== "open" ? (
        <button className={`r-dock-btn${embed ? " is-playing" : ""}`} onClick={() => setView("open")} aria-label={embed ? "Show the media player" : "Open the media player"} data-tip={embed ? "Playing. Show player" : "Media player"}>
          <Music size={20} aria-hidden="true" />{embed ? <span className="r-dock-dot" aria-hidden="true" /> : null}
        </button>
      ) : null}
    </div>
  );
}
