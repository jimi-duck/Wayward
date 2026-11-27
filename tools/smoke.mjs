// Browser smoke test: starts each mode at desktop and phone size, in English and German,
// and fails on any console error, page error or crash card. Needs `npm run build` first.
// It serves dist/ itself with the headers public/_headers gives Cloudflare (the Content
// Security Policy among them), so a policy that blocks the game fails here first.
// Run: node tools/smoke.mjs [outDir] [--quick] [--draw]   (software WebGL is fine; it checks crashes, not speed)
// --quick: desktop English and phone German only (what CI runs). --draw: draw for real, for screenshots worth looking at.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2);
const quick = args.includes('--quick');
const draw = args.includes('--draw');
const out = args.find((a) => !a.startsWith('--')) ?? 'smoke-out';
mkdirSync(out, { recursive: true });

/** public/_headers as Cloudflare reads it: a path pattern, then indented `Name: value` lines. */
function headerRules() {
  const rules = [];
  for (const line of readFileSync('public/_headers', 'utf8').split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) { rules.push({ re: new RegExp('^' + line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'), headers: [] }); continue; }
    const i = line.indexOf(':');
    rules.at(-1)?.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
  }
  return rules;
}
const RULES = headerRules();
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join('dist', path));
  if (!file.startsWith('dist') || !existsSync(file) || statSync(file).isDirectory()) file = existsSync(join(file, 'index.html')) ? join(file, 'index.html') : 'dist/index.html';
  for (const r of RULES) if (r.re.test(path)) for (const [k, v] of r.headers) res.setHeader(k, v);
  res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;

const SIZES = { desktop: { width: 1280, height: 720 }, phone: { width: 568, height: 320 } };
const MODES = [
  ['title', ''],
  ['story', ''], ['classic', 'classic'], ['arcade', ''], ['dev', 'dev'],
];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const bad = [];
for (const [size, vp] of Object.entries(SIZES)) for (const lang of ['en', 'de']) for (const [mode, q] of MODES) {
  if (quick && (size === 'desktop') !== (lang === 'en')) continue;
  const tag = `${mode}-${size}-${lang}`;
  const ctx = await browser.newContext({ viewport: vp, hasTouch: size === 'phone', isMobile: size === 'phone' });
  // software WebGL draws a frame in seconds, so by default every draw is a no-op (as tools/frame-bench.mjs does):
  // shaders still compile and link, and all the game's code runs; --draw draws for real (for the screenshots)
  if (!draw) await ctx.addInitScript(() => { for (const n of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements', 'clear', 'blitFramebuffer']) WebGL2RenderingContext.prototype[n] = function () {}; });
  const page = await ctx.newPage(); page.setDefaultTimeout(60000);
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  // a blocked script, style or image (the Content Security Policy) shows as a console error too; this names it
  page.on('requestfailed', (r) => errs.push('request failed: ' + r.url().slice(0, 120) + ' ' + (r.failure()?.errorText ?? '')));
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
server.close();
for (const [tag, errs] of bad) console.log('\n' + tag + '\n  ' + errs.join('\n  '));
process.exit(bad.length ? 1 : 0);
