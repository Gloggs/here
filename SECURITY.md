# Security

## Reporting a problem

If you find a security issue, please do not open a public issue. Email michael@guilduk.com with steps to reproduce it. You will get a reply within a week.

## How the app protects data

- **Connected apps:** each account connects its own Zoho CRM. Connection keys are encrypted with AES-256-GCM before they are stored, the encryption key lives only in the server's environment, and keys are never sent to the browser. Every lookup uses the account id from the signed-in session. Connecting uses a one-time state value signed with the account id and checked on return, and only real Zoho addresses are accepted. Disconnecting or deleting an account cancels access with Zoho. The sandbox and the demo cannot connect apps. Notes sent to Zoho are built on the server from stored marks, so the browser cannot send anything else.
- **Headers:** a Content Security Policy allows only the site's own scripts, and frames from YouTube (privacy-enhanced mode) and Spotify. HSTS, no framing by other sites, no MIME sniffing and a strict referrer policy are set on every response.

- **Sign-in:** handled by Kinde. The app never sees or stores passwords.
- **Two checks on every request:** `middleware.js` turns away requests with no session, and each API route checks the session again (`lib/auth.js`).
- **Demo guests:** "Try it now" gives each visitor a random guest id in a signed, httpOnly cookie (HMAC-SHA256). It is treated exactly like an account id, so guests are as isolated as real users. Guests have lower limits, cannot upload photos, and their data is deleted after 24 hours or when they end the demo.
- **Account isolation:** every table has an `owner_id`, taken from the session on the server, and every query filters on it.
- **Input checks:** all input is validated on the server (`lib/validate.js`) with length and count limits, for example 50 classes, 500 students and 100 names per paste.
- **Safe exports:** CSV cells that start with `=`, `+`, `-` or `@` are escaped so spreadsheets do not run them as formulas.
- **Errors:** the browser only ever sees a generic message. Details go to the server log.
- **Headers:** security headers are set in `next.config.mjs`.
- **Secrets:** only in environment variables. `.env*` files are ignored by git, apart from `.env.example`, which holds no real values.
- **Your data:** Settings lets you download everything or delete it all.
