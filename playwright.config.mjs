// End-to-end tests: a real browser against the built app and a throwaway Postgres (see docs/TESTING.md).
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const env = {
  DATABASE_URL: "postgres://postgres:postgres@db.local:5432/main", // the host is ignored: neon-local answers every query
  NEON_LOCAL_SQL_URL: "http://127.0.0.1:4445/sql",
  KINDE_CLIENT_ID: "e2e", KINDE_CLIENT_SECRET: "e2e-not-a-secret", KINDE_ISSUER_URL: "https://example.kinde.com",
  KINDE_SITE_URL: `http://localhost:${PORT}`, KINDE_POST_LOGIN_REDIRECT_URL: `http://localhost:${PORT}/dashboard`,
  KINDE_POST_LOGOUT_REDIRECT_URL: `http://localhost:${PORT}`, GUEST_SECRET: "e2e-guest-secret-0123456789abcdef0123456789", // gitleaks:allow (dummy value for the browser tests)
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "laptop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } },
  ],
  webServer: [
    { command: "node scripts/neon-local.mjs", url: "http://127.0.0.1:4445/", reuseExistingServer: !process.env.CI, env: { PG_URL: process.env.PG_URL || "postgres://postgres:postgres@127.0.0.1:6543/main" } },
    { command: `npx next start -p ${PORT}`, url: `http://localhost:${PORT}/`, reuseExistingServer: !process.env.CI, env, timeout: 120_000 },
  ],
});
