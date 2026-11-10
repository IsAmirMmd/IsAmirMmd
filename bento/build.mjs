// Renders the README's bento tiles (tiles.html) to PNGs in assets/bento/, at 2x.
//   node bento/build.mjs
// Each tile keeps its transparent margin, so the README can set them side by side.
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright"); // global install: require finds it
const here = import.meta.dirname;
const out = resolve(here, "../assets/bento");
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1200, height: 900 } });
await page.goto(`file://${resolve(here, "tiles.html")}`);
await page.evaluate(() => document.fonts.ready);
for (const id of await page.$$eval(".wrap", (els) => els.map((e) => e.id))) {
  await page.locator(`#${id}`).screenshot({ path: `${out}/${id}.png`, omitBackground: true });
}
// GitHub's dark theme: the ink tile gets a faint edge so it doesn't sink into the page.
await page.evaluate(() => document.querySelector("#now .tile").classList.add("dark"));
await page.locator("#now").screenshot({ path: `${out}/now-dark.png`, omitBackground: true });
await browser.close();
