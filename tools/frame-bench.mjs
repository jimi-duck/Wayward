// Frame bench (docs/PERF.md, pass 17): the game's CPU cost a frame, part by part, in a busy Arcade run and the Story's
// first system, flown by the scripted pilot and drawn through the real renderer and HUD at 60 frames a second.
// Starts its own dev server. Software WebGL here, so the GPU's draws are stubbed (see tools/framebench.ts); what is
// left is the main thread's work: simulation, scene updates, three.js's submission, the HUD, and garbage collection.
//
// Run: node tools/frame-bench.mjs [--secs 90] [--mode arcade,story] [--size desktop,phone] [--tier high]
//                                 [--profile out.cpuprofile] [--json out.json] [--nostub]
// Also: --alloc out.heapprofile (game garbage), --burst (frames back to back), --why (what restyled the page),
// --switches / --programs / --scene / --draws (three.js state), --gpu (software raster time, needs --nostub),
// --freeze --shots 20,44 --shotdir dir (identical frames to compare pixels before and after a change).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const flag = (k) => process.argv.includes(`--${k}`);
const SECS = Number(arg('secs', 90));
const MODES = arg('mode', 'arcade,story').split(',');
const SIZES = arg('size', 'desktop,phone').split(',');
const TIER = arg('tier', '');
const PROFILE = arg('profile', '');
const ALLOC = arg('alloc', '');
const JSON_OUT = arg('json', '');
const SEED = Number(arg('seed', 7));
const STUB = !flag('nostub');
/** --burst: frames back to back in one task (no paint between); the default waits for the browser's frame after each. */
const PACED = !flag('burst');
const PORT = Number(arg('port', 5231));

const VIEWS = {
  desktop: { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, tier: 'high' },
  phone: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, tier: 'phone' },
};

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
const base = `http://localhost:${PORT}/`;
for (let i = 0; i < 150; i++) { try { if ((await fetch(base)).ok) break; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 200)); }

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const q = (s, p) => s[Math.min(s.length - 1, Math.floor(s.length * p))];
const out = [];
try {
  for (const size of SIZES) for (const mode of MODES) {
    const v = VIEWS[size];
    const tier = TIER || v.tier;
    const ctx = await browser.newContext({ viewport: v.viewport, deviceScaleFactor: v.deviceScaleFactor, isMobile: !!v.isMobile, hasTouch: !!v.hasTouch });
    // a trained pilot: no lesson in the way
    // the pilot reads process.env; with STUB every draw and clear is a no-op from the first frame (tools/framebench.ts)
    await ctx.addInitScript((stub) => {
      globalThis.process = { env: {} };
      // one sequence of Math.random for every run, so a before and an after fly the same sky, field and fights
      let r = 0x2f6b1d;
      Math.random = () => { r = (r + 0x6d2b79f5) | 0; let t = Math.imul(r ^ (r >>> 15), 1 | r); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      if (!stub) return;
      for (const P of [WebGL2RenderingContext.prototype]) for (const n of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements', 'clear', 'blitFramebuffer']) P[n] = function () {};
    }, STUB);
    const page = await ctx.newPage();
    page.setDefaultTimeout(600000);
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(`${base}?debug=1&quality=${tier}&lang=en`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.wayward, null, { timeout: 120000 });
    await page.waitForTimeout(6000);
    // --freeze: no frame is drawn between the page's warm-up and the bench, so two runs draw the same frames from the same state
    if (flag('freeze')) await page.evaluate(() => window.wayward.loop.stop());
    await page.evaluate((m) => {
      const w = window.wayward;
      if (m === 'arcade') { w.launch('arcade'); w.world.restart({ survival: w.world.survival.id, mode: 'arcade', carry: null }); }
      else w.launch('breakout');
    }, mode);
    if (!flag('freeze')) await page.waitForTimeout(3000);
    const cdp = await ctx.newCDPSession(page);
    await page.evaluate(() => import('/tools/framebench.ts').then((m) => { window.__bench = m; }));
    await page.evaluate(() => window.gc?.());
    const events = [];
    cdp.on('Tracing.dataCollected', (d) => events.push(...d.value));
    await cdp.send('Tracing.start', { categories: `toplevel,disabled-by-default-v8.gc,v8,devtools.timeline,blink.user_timing${flag('why') ? ',disabled-by-default-devtools.timeline.invalidationTracking' : ''}`, transferMode: 'ReportEvents' });
    if (PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
    if (ALLOC) { await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.startSampling', { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true }); }
    const res = await page.evaluate((o) => window.__bench.bench(o), { seconds: SECS, seed: SEED, stub: false, paced: PACED, switches: flag('switches'), gpu: flag('gpu'), shots: arg('shots', '').split(',').filter(Boolean).map(Number) });
    if (flag('scene')) console.log((await page.evaluate(() => window.__bench.sceneStats())).join('\n'));
    if (flag('switches')) console.log((await page.evaluate(() => window.__bench.sharedPrograms())).join('\n'));
    if (flag('programs')) console.log((await page.evaluate(() => window.__bench.programs())).join('\n'));
    if (PROFILE) { const { profile } = await cdp.send('Profiler.stop'); writeFileSync(PROFILE.replace('.cpuprofile', `-${size}-${mode}.cpuprofile`), JSON.stringify(profile)); }
    if (res.shots?.length) mkdirSync(arg('shotdir', '/tmp'), { recursive: true });
    for (const sh of res.shots ?? []) writeFileSync(`${arg('shotdir', '/tmp')}/${size}-${mode}-f${sh.frame}-${sh.w}x${sh.h}.rgba`, Buffer.from(sh.rgba, 'base64'));
    let gameAlloc = null;
    if (ALLOC) {
      const { profile } = await cdp.send('HeapProfiler.stopSampling');
      writeFileSync(ALLOC.replace('.json', `-${size}-${mode}.json`), JSON.stringify(profile));
      // the game's own garbage: everything not allocated in the pilot's code (tools/)
      let game = 0; const walk = (n) => { if (!n.callFrame.url.includes('/tools/')) game += n.selfSize; for (const c of n.children) walk(c); };
      walk(profile.head);
      gameAlloc = game;
    }
    const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end');
    await done;
    // garbage: what each young-generation collection freed; pause: every collection's time on the main thread
    let gcMs = 0, gcN = 0, freed = 0, majorN = 0, majorMs = 0, worstGc = 0;
    for (const e of events) {
      if (e.ph !== 'X') continue;
      if (e.name === 'MinorGC' || e.name === 'MajorGC') {
        const ms = e.dur / 1000;
        gcMs += ms; gcN++; worstGc = Math.max(worstGc, ms);
        if (e.name === 'MajorGC') { majorN++; majorMs += ms; }
        const a = e.args?.usedHeapSizeBefore, b = e.args?.usedHeapSizeAfter;
        if (a && b && a > b) freed += a - b;
      }
    }
    // the browser's own work each frame on the main thread, between one frame's mark and the next: every task, and of it
    // style and layout (with how many layouts: more than one is a forced, thrashing layout) and paint
    const main = events.find((e) => e.ph === 'M' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain');
    const marks = events.filter((e) => e.name === 'bench-frame' && (!main || e.tid === main.tid)).map((e) => e.ts).sort((a, b) => a - b);
    const per = marks.map(() => ({ busy: 0, style: 0, layout: 0, layouts: 0, paint: 0, styled: 0, why: new Map() }));
    const at = (ts) => { let lo = 0, hi = marks.length - 1; if (ts < marks[0]) return -1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (marks[m] <= ts) lo = m; else hi = m - 1; } return lo; };
    if (main) for (const e of events) {
      if (e.tid !== main.tid || e.ph !== 'X') continue;
      const i = at(e.ts); if (i < 0) continue;
      const ms = e.dur / 1000, f = per[i];
      if (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask' || e.name === 'ThreadPool_RunTask') f.busy += ms;
      else if (e.name === 'UpdateLayoutTree') { f.style += ms; f.styled += e.args?.elementCount ?? 0; }
      else if (e.name === 'Layout') { f.layout += ms; f.layouts++; }
      else if (e.name === 'Paint' || e.name === 'PrePaint' || e.name === 'Layerize' || e.name === 'Commit') f.paint += ms;
    }
    // --why: what dirtied the style (the invalidation tracking events), per frame
    if (main && flag('why')) for (const e of events) {
      if (e.tid !== main.tid || !/Invalidat/.test(e.name)) continue;
      const i = at(e.ts); if (i < 0) continue;
      const d = e.args?.data ?? {};
      const k = `${e.name.replace('InvalidationTracking', '')} ${d.reason ?? d.changedClass ?? d.changedId ?? d.changedAttribute ?? d.changedPseudo ?? ''} ${(d.nodeName ?? '').slice(0, 60)}`;
      per[i].why.set(k, (per[i].why.get(k) ?? 0) + 1);
    }
    if (flag('why') && main) { let n = 0; for (const e of events) if (e.tid === main.tid && /Invalidat|ScheduleStyle/.test(e.name) && /HTML/.test(JSON.stringify(e.args)) && n++ < 6) console.log('  RAW', e.name, JSON.stringify(e.args).slice(0, 900)); }
    res.rows.forEach((r, i) => Object.assign(r, per[i] ?? {}));
    const rows = res.rows.slice(Math.min(120, Math.floor(res.rows.length / 4)));
    const stat = (k) => { const s = rows.map((r) => r[k]).sort((a, b) => a - b); const mean = s.reduce((a, b) => a + b, 0) / s.length; return { mean, p50: q(s, 0.5), p99: q(s, 0.99), p999: q(s, 0.999), max: s[s.length - 1] }; };
    const parts = Object.fromEntries(['step', 'react', 'prep', 'draw', 'hud', 'total', 'style', 'layout', 'layouts', 'paint', 'busy'].map((k) => [k, stat(k)]));
    const secs = res.rows.length / 60;
    const r = {
      size, mode, tier, frames: res.rows.length, restarts: res.restarts, wallS: res.wall / 1000, parts,
      over8: rows.filter((x) => x.total > 8).length, over16: rows.filter((x) => x.total > 16.7).length,
      calls: stat('calls'), tris: stat('tris'), programs: Math.max(...res.rows.map((x) => x.programs)),
      over16busy: rows.filter((x) => x.busy > 16.7).length,
      gameMBs: gameAlloc === null ? null : gameAlloc / 1e6 / secs,
      gc: { n: gcN, ms: gcMs, major: majorN, majorMs, worst: worstGc, mbPerSec: freed / 1e6 / secs },
      heapMB: { start: res.heap[0] / 1e6, end: res.heap.at(-1) / 1e6, max: Math.max(...res.heap) / 1e6 },
      compiles: rows.map((x, i) => [x, i]).filter(([x]) => x.events.includes('compile:')).map(([x, i]) => `frame ${i} ${x.total.toFixed(1)}ms ${x.events.split(',').filter((e) => e.startsWith('compile:')).join(' ')}`),
      worst: [...rows].sort((a, b) => b.total - a.total).slice(0, 6).map((x) => `${x.total.toFixed(1)}ms (busy ${(x.busy ?? 0).toFixed(1)} step ${x.step.toFixed(1)} react ${x.react.toFixed(1)} prep ${x.prep.toFixed(1)} draw ${x.draw.toFixed(1)} hud ${x.hud.toFixed(1)}) ${x.events}`),
      errors: errs,
    };
    out.push(r);
    const f = (s) => `mean ${s.mean.toFixed(2)} p50 ${s.p50.toFixed(2)} p99 ${s.p99.toFixed(2)} max ${s.max.toFixed(1)}`;
    console.log(`\n== ${size} ${mode} (${tier}) ${r.frames} frames, ${r.restarts} restarts, wall ${r.wallS.toFixed(0)} s`);
    for (const k of Object.keys(parts)) console.log(`  ${k.padEnd(6)} ${f(parts[k])}`);
    { const g = res.rows.map((x) => x.gpu).filter((x) => x !== undefined).slice(10).sort((a, b) => a - b); if (g.length) { r.gpu = { n: g.length, p50: q(g, 0.5), mean: g.reduce((a, b) => a + b, 0) / g.length }; console.log(`  gpu (software) median ${r.gpu.p50.toFixed(1)} ms, mean ${r.gpu.mean.toFixed(1)} ms over ${g.length} frames`); } }
    if (gameAlloc !== null) console.log(`  game garbage (pilot excluded) ${r.gameMBs.toFixed(2)} MB/s`);
    console.log(`  frames >8ms ${r.over8}  main thread >16.7ms ${r.over16busy}  JS >16.7ms ${r.over16}  draws ${r.calls.mean.toFixed(0)} (max ${r.calls.max})  tris ${(r.tris.mean / 1000).toFixed(0)}k  programs ${r.programs}`);
    console.log(`  gc ${gcN}x ${gcMs.toFixed(0)} ms (major ${majorN}x ${majorMs.toFixed(0)} ms, worst ${worstGc.toFixed(1)} ms)  garbage ${r.gc.mbPerSec.toFixed(2)} MB/s  heap ${r.heapMB.start.toFixed(0)}->${r.heapMB.end.toFixed(0)} MB (max ${r.heapMB.max.toFixed(0)})`);
    for (const w of r.worst) console.log(`  worst ${w}`);
    for (const c of r.compiles) console.log(`  linked in play: ${c}`);
    for (const x of [...rows].sort((a, b) => b.style - a.style).slice(0, 4)) console.log(`  style ${x.style.toFixed(1)}ms over ${x.styled} elements, events ${x.events || '-'}${flag('why') ? '\n    ' + [...x.why].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${n}x ${k}`).join('\n    ') : ''}`);
    if (flag('why')) {
      const all = new Map(); for (const x of rows) for (const [k, n] of x.why) all.set(k, (all.get(k) ?? 0) + n);
      console.log('  invalidations over the run:\n    ' + [...all].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => `${(n / rows.length).toFixed(2)}/frame ${k}`).join('\n    '));
    }
    if (flag('draws')) { const m = new Map(); for (const d of res.lastDraws) m.set(d, (m.get(d) ?? 0) + 1); console.log(`  draws of the last frame (${res.lastDraws.length}):\n    ` + [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n}x ${k}`).join('\n    ')); }
    if (res.switched?.length) console.log('  program switches:\n    ' + res.switched.slice(0, 20).join('\n    '));
    if (errs.length) console.log('  ERRORS', errs.slice(0, 5));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
