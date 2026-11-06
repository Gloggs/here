// Renders the app icon (app/apple-icon.png) and the share image (app/opengraph-image.png) from the SVG mark,
// so they always match the logo. Run after changing the mark: node scripts/make-images.mjs
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const mark = readFileSync(new URL("../app/icon.svg", import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();

await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(`<style>html,body{margin:0}svg{display:block;width:180px;height:180px}</style>${mark}`);
writeFileSync(new URL("../app/apple-icon.png", import.meta.url), await page.screenshot());

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=block">
<style>
  html,body{margin:0;width:1200px;height:630px;background:#174131;color:#fff;font-family:"DM Sans",sans-serif}
  .wrap{box-sizing:border-box;height:100%;padding:72px 80px;display:grid;grid-template-columns:1fr 260px;gap:64px;align-items:center}
  h1{margin:0;font-weight:500;letter-spacing:-0.03em;font-size:76px;line-height:1.05}
  p{margin:28px 0 0;font-size:30px;line-height:1.4;color:#E0F0E7;max-width:24ch}
  svg{width:260px;height:260px;display:block}
</style></head><body><div class="wrap"><div><h1>The class register that takes ten seconds.</h1>
<p>See who to check on. Free, private, and yours.</p></div>${mark}</div></body></html>`);
await page.evaluate(() => document.fonts.ready);
writeFileSync(new URL("../app/opengraph-image.png", import.meta.url), await page.screenshot());
await browser.close();
console.log("icon and share image written");
