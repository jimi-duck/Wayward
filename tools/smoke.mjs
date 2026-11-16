// Browser smoke test: starts each mode at desktop and phone size, in English and German,
// and fails on any console error, page error or crash card. Needs `npm run build` first.
// Run: node tools/smoke.mjs [outDir]   (software WebGL is fine; it checks crashes, not speed)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] ?? 'smoke-out';
import { mkdirSync } from 'node:fs';
mkdirSync(out, { recursive: true });

const PORT = 4179;
const server = { kill() {} }; // expects the preview already running on :4179
const base = `http://localhost:${PORT}/`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 200)); }

const SIZES = { desktop: { width: 1280, height: 720 }, phone: { width: 568, height: 320 } };
const MODES = [
  ['title', ''],
  ['story', ''], ['classic', 'classic'], ['arcade', ''], ['dev', 'dev'],
];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const bad = [];
for (const [size, vp] of Object.entries(SIZES)) for (const lang of ['en', 'de']) for (const [mode, q] of MODES) {
  const tag = `${mode}-${size}-${lang}`;
  const ctx = await browser.newContext({ viewport: vp, hasTouch: size === 'phone', isMobile: size === 'phone' });
  const page = await ctx.newPage(); page.setDefaultTimeout(60000);
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  try {
    await page.goto(`${base}?quality=low&lang=${lang}${q ? '&' + q : ''}&debug=1`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    if (mode === 'story') { await page.click('#m-journey'); await page.waitForTimeout(400); await page.locator('#mods .st-row').first().click().catch(() => {}); }
    if (mode === 'classic') { await page.click('#m-journey'); await page.waitForTimeout(400); await page.locator('#mods .st-row').first().click().catch(() => {}); }
    if (mode === 'arcade') await page.click('#m-arcade');
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${out}/${tag}.png`, timeout: 90000 });
    if (await page.locator('#crash').count()) errs.push('crash card shown');
  } catch (e) { errs.push('script: ' + e.message.split('\n')[0]); }
  if (errs.length) bad.push([tag, errs]);
  console.log(errs.length ? 'FAIL' : 'ok  ', tag, errs.join(' | '));
  await ctx.close();
}
await browser.close();
server.kill();
for (const [tag, errs] of bad) console.log('\n' + tag + '\n  ' + errs.join('\n  '));
process.exit(bad.length ? 1 : 0);
