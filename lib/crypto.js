// Encryption for connection keys. AES-256-GCM with a fresh random IV for every value,
// so the database alone never reveals a usable token. The key lives only in the
// CONNECTIONS_KEY environment variable (32 random bytes, base64).
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function key() {
  const raw = process.env.CONNECTIONS_KEY?.trim();
  if (!raw) throw new Error("CONNECTIONS_KEY is not set.");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("CONNECTIONS_KEY must be 32 bytes in base64.");
  return k;
}

const b64 = (buf) => buf.toString("base64url");

export function encrypt(text) {
  if (text == null) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]);
  return `v1.${b64(iv)}.${b64(cipher.getAuthTag())}.${b64(data)}`;
}

export function decrypt(value) {
  if (value == null) return null;
  const [v, iv, tag, data] = String(value).split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Unreadable stored value.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

/** A signature bound to this server's key, for short-lived values such as OAuth state. */
export function sign(text) {
  return b64(createHmac("sha256", key()).update(`here-sign:${text}`).digest());
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function randomToken(bytes = 32) {
  return b64(randomBytes(bytes));
}
