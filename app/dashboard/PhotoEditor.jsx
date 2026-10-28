"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Upload, RotateCw, Trash2 } from "lucide-react";
import { api } from "@/lib/client";

const OUT = 320;   // saved photo is a 320px square
const VIEW = 280;  // size of the crop window on screen

/** Draws the chosen crop to a small square and returns a data URL (WebP, or JPEG on older Safari). */
function render(img, { x, y, zoom, rot }) {
  const c = document.createElement("canvas");
  c.width = OUT; c.height = OUT;
  const g = c.getContext("2d");
  const scale = OUT / VIEW;
  g.fillStyle = "#F7F1F0"; g.fillRect(0, 0, OUT, OUT);
  g.translate(OUT / 2 + x * scale, OUT / 2 + y * scale);
  g.rotate((rot * Math.PI) / 180);
  const base = Math.max(VIEW / (rot % 180 ? img.height : img.width), VIEW / (rot % 180 ? img.width : img.height));
  const w = img.width * base * zoom * scale, h = img.height * base * zoom * scale;
  g.drawImage(img, -w / 2, -h / 2, w, h);
  let url = c.toDataURL("image/webp", 0.82);
  if (!url.startsWith("data:image/webp")) url = c.toDataURL("image/jpeg", 0.85);
  return url;
}

/**
 * Take or upload a photo, then drag to position, zoom and rotate before saving.
 * Re-encoding through a canvas also drops the camera's hidden data, such as location.
 */
export default function PhotoEditor({ student, onSaved, onClose }) {
  const [src, setSrc] = useState(null);
  const [img, setImg] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, zoom: 1, rot: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef(null);
  const camera = useRef(null), file = useRef(null);

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose a photo.");
    if (f.size > 25 * 1024 * 1024) return toast.error("That photo is too large.");
    const url = URL.createObjectURL(f);
    const i = new Image();
    i.onload = () => { setImg(i); setSrc(url); setCrop({ x: 0, y: 0, zoom: 1, rot: 0 }); };
    i.onerror = () => toast.error("That photo could not be opened.");
    i.src = url;
  }

  async function save() {
    setBusy(true);
    try {
      const r = await api.put(`/api/student/${student.id}/photo`, { data: render(img, crop) });
      toast.success("Photo saved.");
      onSaved(r.photoAt);
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.del(`/api/student/${student.id}/photo`); toast.success("Photo removed."); onSaved(null); }
    catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  const base = img ? Math.max(VIEW / (crop.rot % 180 ? img.height : img.width), VIEW / (crop.rot % 180 ? img.width : img.height)) : 1;

  return (
    <div className="r-form">
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      <input ref={file} type="file" accept="image/*" hidden onChange={pick} />
      {!img ? (
        <>
          <p style={{ margin: 0 }}>Use a clear, front-facing photo so {student.name.split(" ")[0]} is easy to spot in the class grid.</p>
          <div className="r-row">
            <button className="r-btn" onClick={() => camera.current.click()}><Camera size={18} aria-hidden="true" /> Take photo</button>
            <button className="r-btn r-btn-ghost" onClick={() => file.current.click()}><Upload size={18} aria-hidden="true" /> Upload photo</button>
          </div>
          {student.photoAt ? <button className="r-btn r-btn-ghost" onClick={remove} disabled={busy}><Trash2 size={18} aria-hidden="true" /> Remove current photo</button> : null}
        </>
      ) : (
        <>
          <div className="r-crop" style={{ width: VIEW, height: VIEW }}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y }; }}
            onPointerMove={(e) => { if (!drag.current) return; const d = drag.current; setCrop((c) => ({ ...c, x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py })); }}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
            role="img" aria-label="Drag to position the photo">
            <img src={src} alt="" draggable={false} style={{
              width: img.width * base * crop.zoom, height: img.height * base * crop.zoom,
              transform: `translate(-50%, -50%) translate(${crop.x}px, ${crop.y}px) rotate(${crop.rot}deg)`,
            }} />
          </div>
          <p className="r-muted r-small" style={{ margin: 0 }}>Drag to move. The square is what will be saved.</p>
          <label className="r-label">Zoom
            <input type="range" min="1" max="3" step="0.01" value={crop.zoom} onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))} />
          </label>
          <div className="r-row">
            <button className="r-btn r-btn-ghost" onClick={() => setCrop((c) => ({ ...c, rot: (c.rot + 90) % 360 }))}><RotateCw size={18} aria-hidden="true" /> Rotate</button>
            <button className="r-btn r-btn-ghost" onClick={() => { setImg(null); setSrc(null); }}>Choose another</button>
          </div>
          <div className="r-row">
            <button className="r-btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save photo"}</button>
            <button className="r-btn r-btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}
