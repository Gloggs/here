// What a stranger does first: open the demo, read the guide once, take a register, find help.
// Each test starts its own private demo, so they never share data.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function startDemo(page, { skipGuide = true } = {}) {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  if (skipGuide) {
    const skip = page.getByRole("button", { name: "Skip the guide" });
    await skip.click();
    await expect(skip).toBeHidden();
  }
}

test("the guide shows once ever, and lives in Settings afterwards", async ({ page }) => {
  await startDemo(page, { skipGuide: false });
  const dialog = page.getByRole("dialog", { name: "How here works" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 3; i++) await dialog.getByRole("button", { name: "Next" }).click();
  await dialog.getByRole("button", { name: "Start using here" }).click();
  await expect(dialog).toBeHidden();

  // A new device for the same account: the account remembers, so the guide stays away
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("dialog", { name: "How here works" })).toBeHidden();

  // Help is always in Settings, with the guide one tap away
  await page.goto("/dashboard/settings#help");
  await expect(page.getByRole("heading", { name: "Help: how to use here" })).toBeVisible();
  await page.getByRole("button", { name: "Show the guide again" }).click();
  await expect(page.getByRole("dialog", { name: "How here works" })).toBeVisible();
});

// Keystroke-Level Model budget (docs/DESIGN.md): from Today, a register of 12 with one late arrival is
// three taps. If a change adds a tap, this test fails and the change has to justify it.
test("a register takes three taps from Today, and ends with the stamp", async ({ page }) => {
  await startDemo(page);
  let taps = 0;
  const tap = async (locator) => { await locator.click(); taps += 1; };

  await tap(page.getByRole("link", { name: "Take the register" }));
  await expect(page.getByText(/0 of 12 marked/)).toBeVisible();
  await tap(page.getByRole("button", { name: "Late" }).first());
  await tap(page.getByRole("button", { name: /Mark the other 11 present/ }));

  await expect(page.getByText(/Register complete in/)).toBeVisible();
  await expect(page.locator(".r-stamp")).toBeVisible();
  expect(taps).toBeLessThanOrEqual(3);
});

test("Today leads with the register, and the extras wait in Class tools", async ({ page }) => {
  await startDemo(page);
  const order = await page.locator(".r-body > section h2").allTextContents();
  expect(order[0]).toMatch(/Sample 10B|Every register is taken/);
  await expect(page.getByText("Getting started")).toHaveCount(0);

  await page.getByRole("link", { name: "Take the register" }).click();
  const tabs = page.getByRole("navigation", { name: "Class sections" }).getByRole("button");
  await expect(tabs).toHaveText([/Register/, /Month/, /Students/, /Class tools/]);
  await tabs.filter({ hasText: "Class tools" }).click();
  for (const name of ["Points", "Tasks", "Pick a name, groups and timer", "Play music or a video", "Class settings"]) {
    await expect(page.getByRole("button", { name: new RegExp(`^${name}`) })).toBeVisible();
  }
});

const SCREENS = [
  ["Today", "/dashboard"],
  ["Classes", "/dashboard/classes"],
  ["Students", "/dashboard/students"],
  ["Reports", "/dashboard/reports"],
  ["Settings", "/dashboard/settings"],
];

for (const theme of ["light", "dark"]) {
  test(`main screens pass automatic accessibility checks (${theme})`, async ({ page }) => {
    await startDemo(page);
    await page.evaluate((t) => localStorage.setItem("theme", t), theme);
    const failures = [];
    for (const [name, url] of SCREENS) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      for (const v of violations.filter((v) => ["serious", "critical"].includes(v.impact))) {
        failures.push(`${name}: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (overflow) failures.push(`${name}: the page scrolls sideways`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
}
