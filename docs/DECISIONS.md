# Decisions

Short records of the choices that shaped the app, and why.

## 1. Every row belongs to an account

**Choice:** an `owner_id` column on every table, filled from the session on the server, and a filter on every query.
**Why:** anyone can sign in and try the app, so one visitor must never see another's students. Doing it in one place (`lib/data.js`, `lib/marks.js`) keeps it hard to forget.

## 2. Hosted sign-in with Kinde

**Choice:** Kinde with Google and one-time email codes.
**Why:** no passwords to store or reset, and recruiters can get in with one click.

## 3. Plain CSS instead of a component library

**Choice:** one stylesheet (`app/globals.css`) with design tokens, and small React components.
**Why:** the design rules (sharp corners, no shadows, instant hovers) fight most libraries' defaults. Plain CSS is smaller and easier to read.

## 4. Optimistic marking

**Choice:** the register updates before the server replies, and rolls back on failure.
**Why:** a teacher taps thirty names in a row. Waiting for each request would make the register feel slow.

## 5. Paper register codes

**Choice:** `/`, `L` and the absence codes `I`, `M`, `H` and `N`.
**Why:** teachers in England already read registers this way. The stored values stay as words, so the codes are only a display layer.

## 6. Pure, tested maths

**Choice:** date and percentage logic lives in `lib/register.js` with no imports, covered by `node --test`.
**Why:** this is where small mistakes would change the numbers people act on. Pure functions are quick to test and need no packages in CI.

## 7. Photos kept in Postgres, small and private

**Choice:** the browser crops and resizes each photo to a 320px square (about 10 to 20 KB) and re-encodes it, which also drops the camera's location data. The server checks the file type, size and consent, then stores it in its own table. It is served only through an API route that checks the account.
**Why:** no extra storage service or keys to manage, every photo is private by default, and deleting a student or the account removes their photo in the same place as everything else.

## 8. Celebrate, do not rank attendance

**Choice:** points can be ranked, but attendance is only celebrated: full weeks, punctuality and improvement, plus a goal the whole class shares.
**Why:** a pupil off with illness, a disability or caring duties should never appear at the bottom of a leaderboard.

## 9. Groups can be classes or teams

**Choice:** the same group holds an attendance register and tasks. A team opens on its tasks.
**Why:** the same idea, a list of people and who did what, works for a class register, homework, or six colleagues sharing work across a week.

## 10. A demo with no sign-up

**Choice:** `/demo` creates a guest id, signs it into a cookie and loads the sample class. The guest id is used as `owner_id`, so nothing else in the app needed to change. Expired guests are swept away whenever a new demo starts.
**Why:** most people will not create an account for an app they have never seen. Recruiters can try everything in one click, and the privacy rules stay the same for everyone.

## 11. SQL migrations run by hand

**Choice:** numbered SQL files in `drizzle/`, written to be safe to run twice.
**Why:** a small app with one database does not need a migration service, and the SQL is easy to review.

## 12. The sandbox is a second account, not a flag on rows

**Problem:** Sample data mixed into a real register is confusing. People were unsure what was real, and removing it later meant hunting for `is_sample` rows.

**Choice:** Every signed-in user has two spaces, like two desktops. The sandbox uses the owner id `<user id>::sandbox`, picked by an httpOnly cookie that `getOwnerId()` reads. Because every query already filters by owner id, the sandbox is isolated by the same rule that keeps accounts apart, with no schema change. Sandbox tools (`/api/sandbox`) refuse to run anywhere else, so a real register can never be reset or filled with made-up marks. Demo guests are always in a sandbox.

**Trade-off:** Deleting an account has to remember both ids. That lives in one place, `/api/account`.

## 13. Each account connects its own apps, with encrypted keys

**Problem:** Linking a CRM such as Zoho is useful, but every account has its own Zoho and its own pupils. One shared integration would mix people's data.

**Choice:** Each user connects their own Zoho through OAuth. The keys Zoho returns are encrypted with AES-256-GCM and stored against that account's id only. The browser never sees them, the connect step is protected by a signed one-time state, and disconnecting cancels access with Zoho. Only three narrow scopes are requested: read Contacts, create notes and read the organisation name. WhatsApp, email, YouTube and Spotify need no connection at all, so they carry no stored keys.

**Trade-off:** Zoho runs separate regions, so the region Zoho reports on return is checked against a list of real Zoho addresses before any key is exchanged.

## 14. The CRM only ever receives what the server builds, and nothing without a press

**Problem:** Once Here. can write to a CRM, a forged request or a stale page could put the wrong thing in someone's records.

**Choice:** Notes, field values and Tasks are built on the server from stored marks. The browser sends only ids. Imports read the contacts from Zoho again instead of trusting names from the page. A suggested check-in is worked out again when it is approved, so a stale or forged approval creates nothing. Suggestions are never created automatically, and a dealt-with one stays quiet for 14 days.

**Trade-off:** Zoho's permissions grew (update Contacts, create Tasks), so older connections show an Update permissions button and keep their links when they reconnect. The sample CRM keeps its state in the browser, so it never touches a real account and cannot leak between accounts.
