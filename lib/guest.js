// No-sign-up demo accounts. A guest gets a random id in a signed, httpOnly cookie,
// used as owner_id exactly like a Kinde user id, so every existing privacy rule
// applies. Guest data is deleted after 24 hours. Uses Web Crypto so the same code
// runs in middleware (edge) and in route handlers (Node).

export const GUEST_COOKIE = "here_guest";
export const GUEST_TTL_MS = 24 * 60 * 60 * 1000;

const enc = new TextEncoder();
let keyPromise = null;

function key() {
  const secret = process.env.GUEST_SECRET || process.env.KINDE_CLIENT_SECRET;
  if (!secret) throw new Error("No secret available to sign guest sessions.");
  keyPromise ??= crypto.subtle.importKey("raw", enc.encode(`here-guest:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return keyPromise;
}

function b64url(buf) {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(text) {
  return b64url(await crypto.subtle.sign("HMAC", await key(), enc.encode(text)));
}

// Each account has two spaces: its real register and a sandbox for practising.
// The sandbox is simply a second owner id, so it is isolated by the same rules.
export const SPACE_COOKIE = "here_space";
export const SANDBOX_SUFFIX = "::sandbox";

export function isSandbox(ownerId) {
  return typeof ownerId === "string" && (ownerId.endsWith(SANDBOX_SUFFIX) || isGuest(ownerId));
}

export function isGuest(ownerId) {
  return typeof ownerId === "string" && ownerId.startsWith("guest_");
}

/** When a guest id was made, from the timestamp inside it. */
export function guestCreatedAt(ownerId) {
  const m = /^guest_([0-9a-z]+)_/.exec(ownerId || "");
  return m ? parseInt(m[1], 36) : null;
}

export function newGuestId() {
  const r = crypto.getRandomValues(new Uint8Array(9));
  return `guest_${Date.now().toString(36)}_${[...r].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export async function guestCookieValue(id) {
  return `${id}.${await sign(id)}`;
}

/** Returns the guest id if the cookie is genuine and not expired, otherwise null. */
export async function verifyGuest(value) {
  try {
    if (typeof value !== "string" || value.length > 200) return null;
    const dot = value.lastIndexOf(".");
    const id = value.slice(0, dot), sig = value.slice(dot + 1);
    if (!isGuest(id) || !sig) return null;
    const expected = await sign(id);
    if (expected.length !== sig.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    if (diff !== 0) return null;
    const made = guestCreatedAt(id);
    return made && Date.now() - made < GUEST_TTL_MS ? id : null;
  } catch {
    return null;
  }
}

/** Smaller limits for guests, so the demo cannot be used to fill the database. */
export function limitsFor(ownerId) {
  if (isGuest(ownerId)) return { classes: 5, students: 60, tasks: 50, photos: false };
  if (isSandbox(ownerId)) return { classes: 10, students: 120, tasks: 100, photos: true };
  return { classes: 50, students: 500, tasks: 1000, photos: true };
}
