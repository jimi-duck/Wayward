// Phone bench: draws and triangles a frame at a phone's size, for each quality tier, in Arcade and the Story's
// first system, from the `?perf` readout (docs/PERF.md pass 15). Software WebGL here, so frame times are not a
// phone's: the counts are what to compare between runs. Needs the preview running (`npm run build && npm run preview -- --port 4179`).
// Run: node tools/phone-bench.mjs [baseUrl]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] ?? 'http://localhost:4179/';
const TIERS = ['low', 'phone', 'medium', 'high'];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const rows = [];
for (const mode of ['arcade', 'story']) for (const tier of TIERS) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000);
  await page.goto(`${base}?perf&quality=${tier}&lang=en`);
  await page.waitForTimeout(3000);
  const click = (sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);
  if (mode === 'arcade') { await click('#m-arcade'); await page.waitForTimeout(800); await page.evaluate(() => document.querySelectorAll('#mods .st-row')[1]?.click()); await page.waitForTimeout(2500); await click('#p-go'); }
  else { await click('#m-journey'); await page.waitForTimeout(800); await click('#mods .st-row'); }
  // the readout fills in after its first two-second window; the Story's first system takes longer to build than Arcade
  let text = '', m = null;
  for (let t = 0; t < 40 && !m; t++) {
    await page.waitForTimeout(t === 0 ? 10000 : 1000);
    text = await page.evaluate(() => document.getElementById('debug')?.innerText ?? '');
    m = /draws (\d+) · tris (\d+)k/.exec(text);
  }
  const size = /(\d+×\d+ @[\d.]+)/.exec(text);
  rows.push([mode, tier, size?.[1] ?? '?', m?.[1] ?? '?', m ? `${m[2]}k` : '?']);
  console.log(rows.at(-1).join(' · '));
  await ctx.close();
}
await browser.close();
console.log('\n| Mode | Tier | Drawing size | Draws | Triangles |\n|---|---|---|---|---|');
for (const r of rows) console.log(`| ${r.join(' | ')} |`);
