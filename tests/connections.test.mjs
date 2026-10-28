import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

process.env.CONNECTIONS_KEY = randomBytes(32).toString("base64");
const { encrypt, decrypt } = await import("../lib/crypto.js");
const { newState, checkState } = await import("../lib/oauth-state.js");
const { validAccountsServer, validApiDomain } = await import("../lib/providers/zoho.js");
const { mediaEmbed } = await import("../lib/media.js");
const { whatsappNumber, absenceMessage } = await import("../lib/notes.js");

test("tokens are encrypted, differ every time, and refuse tampering", () => {
  const a = encrypt("secret-token"), b = encrypt("secret-token");
  assert.notEqual(a, b);
  assert.ok(!a.includes("secret-token"));
  assert.equal(decrypt(a), "secret-token");
  const parts = a.split(".");
  parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("AA") ? "BB" : "AA");
  assert.throws(() => decrypt(parts.join(".")));
});

test("connect state only works for the same account, provider and moment", () => {
  const now = Date.now();
  const { state, cookie } = newState("kp_alice", "zoho", now);
  assert.equal(checkState(cookie, state, "kp_alice", "zoho", now + 1000), true);
  assert.equal(checkState(cookie, state, "kp_bob", "zoho", now + 1000), false, "another account cannot use it");
  assert.equal(checkState(cookie, "wrong", "kp_alice", "zoho", now + 1000), false);
  assert.equal(checkState(cookie, state, "kp_alice", "spotify", now + 1000), false);
  assert.equal(checkState(cookie, state, "kp_alice", "zoho", now + 11 * 60 * 1000), false, "expires after ten minutes");
  assert.equal(checkState(undefined, state, "kp_alice", "zoho", now), false);
});

test("only real Zoho addresses are trusted", () => {
  assert.ok(validAccountsServer("https://accounts.zoho.eu"));
  assert.ok(validAccountsServer("https://accounts.zoho.com"));
  assert.ok(!validAccountsServer("https://accounts.zoho.eu.evil.com"));
  assert.ok(!validAccountsServer("http://accounts.zoho.eu"));
  assert.ok(validApiDomain("https://www.zohoapis.eu"));
  assert.ok(!validApiDomain("https://zohoapis.eu@evil.com"));
});

test("media links: YouTube and Spotify only", () => {
  assert.equal(mediaEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ").src, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(mediaEmbed("https://youtu.be/dQw4w9WgXcQ").kind, "youtube");
  assert.equal(mediaEmbed("https://open.spotify.com/playlist/37i9dQZF1DX8NTLI2TtZa6?si=x").src, "https://open.spotify.com/embed/playlist/37i9dQZF1DX8NTLI2TtZa6");
  assert.equal(mediaEmbed("https://evil.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(mediaEmbed("javascript:alert(1)"), null);
  assert.equal(mediaEmbed("http://youtu.be/dQw4w9WgXcQ"), null);
});

test("WhatsApp numbers and absence messages", () => {
  assert.equal(whatsappNumber("07700 900123"), "447700900123");
  assert.equal(whatsappNumber("+44 7700 900123"), "447700900123");
  assert.equal(whatsappNumber(""), null);
  assert.match(absenceMessage("Amara Okafor", "10B", "Monday 2 November"), /^Hi, this is about Amara from 10B\./);
});
