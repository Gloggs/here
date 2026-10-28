// Zoho CRM. Each user connects their own Zoho, in whichever region it lives.
// Only these scopes are asked for: read contacts, add notes, read the organisation name.
export const ZOHO_SCOPES = ["ZohoCRM.modules.contacts.READ", "ZohoCRM.modules.notes.CREATE", "ZohoCRM.org.READ"];
const DEFAULT_ACCOUNTS = "https://accounts.zoho.eu";

// Zoho sends back which region the account is in. Only real Zoho hosts are accepted,
// so a forged value cannot make the server send secrets somewhere else.
export function validAccountsServer(url) {
  return typeof url === "string" && /^https:\/\/accounts\.zoho(cloud)?\.(com|eu|in|com\.au|jp|com\.cn|sa|ca|uk)$/.test(url);
}
export function validApiDomain(url) {
  return typeof url === "string" && /^https:\/\/(www\.)?zohoapis\.(com|eu|in|com\.au|jp|com\.cn|sa|ca|uk)$/.test(url);
}

function creds() {
  // Trimmed, because a stray space or line break pasted into the settings breaks sign-in.
  const id = process.env.ZOHO_CLIENT_ID?.trim(), secret = process.env.ZOHO_CLIENT_SECRET?.trim();
  if (!id || !secret) throw new Error("Zoho is not set up on this server.");
  return { id, secret };
}

export function redirectUri() {
  return `${process.env.KINDE_SITE_URL || "http://localhost:3000"}/api/connect/zoho/callback`;
}

export function authorizeUrl(state) {
  const q = new URLSearchParams({
    scope: ZOHO_SCOPES.join(","), client_id: creds().id, response_type: "code",
    access_type: "offline", prompt: "consent", redirect_uri: redirectUri(), state,
  });
  return `${DEFAULT_ACCOUNTS}/oauth/v2/auth?${q}`;
}

async function tokenCall(accounts, params) {
  if (!validAccountsServer(accounts)) throw new Error("Unknown Zoho region.");
  const res = await fetch(`${accounts}/oauth/v2/token`, { method: "POST", body: new URLSearchParams(params), cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error || !json.access_token) throw new Error(`Zoho did not accept the request${json.error ? ` (${json.error})` : ""}.`);
  return json;
}

export async function exchangeCode(code, accounts) {
  const { id, secret } = creds();
  const t = await tokenCall(accounts, { grant_type: "authorization_code", client_id: id, client_secret: secret, redirect_uri: redirectUri(), code });
  if (!validApiDomain(t.api_domain)) throw new Error("Zoho returned an unexpected address.");
  return { accessToken: t.access_token, refreshToken: t.refresh_token || null, apiDomain: t.api_domain, expiresAt: new Date(Date.now() + (t.expires_in || 3600) * 1000), accounts };
}

export async function refresh(refreshToken, accounts) {
  const { id, secret } = creds();
  const t = await tokenCall(accounts, { grant_type: "refresh_token", client_id: id, client_secret: secret, refresh_token: refreshToken });
  return { accessToken: t.access_token, expiresAt: new Date(Date.now() + (t.expires_in || 3600) * 1000) };
}

export async function revoke(token, accounts) {
  if (!token || !validAccountsServer(accounts)) return;
  await fetch(`${accounts}/oauth/v2/token/revoke?${new URLSearchParams({ token })}`, { method: "POST", cache: "no-store" }).catch(() => {});
}

export async function api(conn, path, init = {}) {
  if (!validApiDomain(conn.apiDomain)) throw new Error("Zoho address is not valid.");
  const res = await fetch(`${conn.apiDomain}/crm/v7${path}`, {
    ...init, cache: "no-store",
    headers: { Authorization: `Zoho-oauthtoken ${conn.accessToken}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (res.status === 204) return {};
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Zoho said no (${json.code || res.status}).`);
  return json;
}

export async function orgName(conn) {
  try { return (await api(conn, "/org")).org?.[0]?.company_name || "Zoho CRM"; } catch { return "Zoho CRM"; }
}
