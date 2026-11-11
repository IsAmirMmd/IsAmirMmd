// Renders the README's bento tiles (tiles.html) to PNGs in assets/bento/, at 2x.
//   node bento/build.mjs
// Each tile keeps its transparent margin, so the README can set them side by side.
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const { chromium } = createRequire(import.meta.url)("playwright"); // global install: require finds it
const here = import.meta.dirname;
// Bump the folder when tiles change: GitHub caches an image by its path.
const out = resolve(here, "../assets/bento/v2");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1200, height: 900 } });
await page.goto(`file://${resolve(here, "tiles.html")}`);
await page.evaluate(() => document.fonts.ready);
// The stats tiles' numbers, when bento/stats.mjs has fetched them.
const statsFile = resolve(here, "src/stats.json");
if (existsSync(statsFile)) await page.evaluate(fillStats, JSON.parse(readFileSync(statsFile, "utf8")));
for (const id of await page.$$eval(".wrap", (els) => els.map((e) => e.id))) {
  await page.locator(`#${id}`).screenshot({ path: `${out}/${id}.png`, omitBackground: true });
}
// GitHub's dark theme: the ink tiles get a faint edge so they don't sink into the page.
for (const id of ["now", "music"]) {
  await page.evaluate((i) => document.querySelector(`#${i} .tile`).classList.add("dark"), id);
  await page.locator(`#${id}`).screenshot({ path: `${out}/${id}-dark.png`, omitBackground: true });
}
await browser.close();

// Runs in the page: writes the numbers into [data-stat] and draws the year's squares.
function fillStats(s) {
  const n = (v) => Number(v).toLocaleString("en-US");
  const d = (iso, year) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year && { year: "numeric" }), timeZone: "UTC" });
  const range = (r) => (r.length ? `${d(r.start)} – ${d(r.end, true)}` : "Starts with the next commit");
  const set = (key, text) => (document.querySelector(`[data-stat="${key}"]`).textContent = text);
  set("total", n(s.total));
  set("since", `since ${d(s.since, true)}`);
  set("current", n(s.current.length));
  set("currentRange", range(s.current));
  set("longest", n(s.longest.length));
  set("longestRange", range(s.longest));
  set("views", n(s.views));
  // Four shades by the quartiles of the active days, as GitHub's own calendar does.
  const busy = s.lastYear.filter(Boolean).sort((a, b) => a - b);
  const q = [0.25, 0.5, 0.75].map((p) => busy[Math.floor(p * (busy.length - 1))] ?? 0);
  const level = (c) => (!c ? 0 : 1 + q.filter((x) => c > x).length);
  document.querySelector('[data-stat="heat"]').innerHTML = s.lastYear.map((c) => `<b class="l${level(c)}"></b>`).join("");
}
