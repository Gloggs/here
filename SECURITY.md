# Security

## Reporting a problem

If you find a security issue, please do not open a public issue. Contact Michael Ijisonuwe through the details on his GitHub profile, with steps to reproduce it. You will get a reply within a week.

## How the app protects data

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
