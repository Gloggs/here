# Testing

Two kinds of test run on every pull request.

## Unit tests (`npm test`)

The attendance maths, dates, register codes, input checks, guest sessions, encryption and CRM rules. Pure functions, no packages, under a second.

## End-to-end tests (`npm run test:e2e`)

A real browser (Playwright) uses the built app the way a stranger would, at phone (390px) and laptop (1280px) sizes:

| Test | What it proves |
| --- | --- |
| The guide shows once ever | A new demo sees the four-step guide; after it, clearing the browser does not bring it back, because the account remembers. Help and "Show the guide again" are in Settings. |
| A register takes three taps | From Today: take the register, mark one late, mark the other 11 present. The stamp shows. If a change adds a tap, the test fails (see the speed budget in `DESIGN.md`). |
| Today leads with the register | The next register is the first thing on Today, there is no checklist, and the class page has four tabs with the extras in Class tools. |
| Accessibility, light and dark | axe checks every main screen against WCAG 2.2 AA and fails on any serious or critical problem. The page must never scroll sideways. |

### How the database works in tests

The app talks to Neon over HTTP in production. The tests use a throwaway Postgres instead, with `scripts/neon-local.mjs` standing in for Neon's SQL endpoint, so no real data or account is ever touched. The app only uses it when `NEON_LOCAL_SQL_URL` is set, which production never does.

### Run them on your computer

1. Start a throwaway Postgres on port 6543, for example with Docker:
   `docker run -d --name here-e2e -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=main -p 6543:5432 postgres:17`
2. Create the tables: run each file in `drizzle/` in order (for example `psql postgres://postgres:postgres@127.0.0.1:6543/main -f drizzle/0001_private_accounts.sql`, and so on).
3. `npx playwright install chromium`
4. Build with placeholder settings (the values in `playwright.config.mjs`), then `npm run test:e2e`. Playwright starts the stand-in and the app itself.

In GitHub Actions the same steps run against a Postgres service (`.github/workflows/ci.yml`), and a failed run uploads a trace you can open with `npx playwright show-trace`.

## Not covered automatically

Signing in with Kinde (Google or an email code), the Zoho connection, photos from a real camera, and real phones. These are checked by hand before a release.
