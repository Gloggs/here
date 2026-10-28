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
