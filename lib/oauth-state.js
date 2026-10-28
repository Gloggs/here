// One-time state for connecting an app. The state is random, stored in a short-lived
// httpOnly cookie signed together with the account id and provider, and must match
// what the provider sends back. This stops anyone tricking a signed-in user into
// linking someone else's account, or replaying an old link.
import { randomToken, safeEqual, sign } from "./crypto.js";

export const STATE_COOKIE = "here_oauth";
export const STATE_TTL_S = 600;

export function newState(ownerId, provider, now = Date.now()) {
  const state = randomToken(24);
  const payload = `${provider}.${state}.${now}`;
  return { state, cookie: `${payload}.${sign(`${ownerId}|${payload}`)}` };
}

/** True only if the cookie was made for this account and provider, is fresh, and matches. */
export function checkState(cookie, returned, ownerId, provider, now = Date.now()) {
  if (typeof cookie !== "string" || typeof returned !== "string" || cookie.length > 400) return false;
  const parts = cookie.split(".");
  if (parts.length !== 4) return false;
  const [p, state, made, sig] = parts;
  if (p !== provider || !safeEqual(state, returned)) return false;
  if (!(now - Number(made) >= 0 && now - Number(made) < STATE_TTL_S * 1000)) return false;
  return safeEqual(sig, sign(`${ownerId}|${p}.${state}.${made}`));
}
