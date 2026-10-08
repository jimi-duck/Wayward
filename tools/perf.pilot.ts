import { appendFileSync } from 'node:fs';
import { PerformanceObserver, performance } from 'node:perf_hooks';
import { it } from 'vitest';
import { World } from '../src/sim/world';
import { fly } from './pilot';

// ── the simulation's cost report ──────────────────────────────────────────
// `npm run pilot:perf` flies the scripted pilot and times every World.step:
// the median, the 99th percentile and the worst step, with how many hulls and
// rocks were live, and how much garbage the run made. One step is 1/60 s, so
// a step over ~4 ms is a quarter of a 60 Hz frame spent on the sim alone.
// This is CPU time in Node; the renderer and the GPU are measured elsewhere.
// PERF_MIN sets the length of each flight in minutes.

const MINUTES = Number(process.env.PERF_MIN ?? 10);

function bench(label: string, make: (seed: number) => ReturnType<typeof fly>) {
  const times: number[] = [];
  const crowd: number[] = [];
  const orig = World.prototype.step;
  let gcMs = 0, gcN = 0;
  const obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) { gcMs += e.duration; gcN++; } });
  obs.observe({ entryTypes: ['gc'] });
  World.prototype.step = function (this: World, dt, input) {
    const t0 = performance.now();
    orig.call(this, dt, input);
    times.push(performance.now() - t0);
    crowd.push(this.aliens.length * 1000 + this.field.rocks.length);
  };
  const heap0 = process.memoryUsage().heapUsed;
  try { make(7); } finally { World.prototype.step = orig; }
  const heap1 = process.memoryUsage().heapUsed;
  // let the observer flush
  obs.disconnect();
  const sorted = [...times].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const over = (ms: number) => times.filter((x) => x > ms).length;
  const maxAliens = Math.max(...crowd.map((c) => Math.floor(c / 1000)));
  const maxRocks = Math.max(...crowd.map((c) => c % 1000));
  const line = `PERF ${label}: steps ${times.length} mean ${mean.toFixed(3)}ms p50 ${q(0.5).toFixed(3)} p99 ${q(0.99).toFixed(3)} p99.9 ${q(0.999).toFixed(3)} max ${sorted[sorted.length - 1]!.toFixed(2)}ms >2ms ${over(2)} >4ms ${over(4)} · peak hulls ${maxAliens} rocks ${maxRocks} · gc ${gcN}x ${gcMs.toFixed(0)}ms · heap Δ ${((heap1 - heap0) / 1e6).toFixed(1)}MB`;
  console.log(line);
  if (process.env.PERF_OUT) appendFileSync(process.env.PERF_OUT, line + '\n');
}

it('times the simulation', () => {
  bench('arcade', () => fly(7, { kind: 'random' }, { maxTime: MINUTES * 60 }));
  bench('arcade-raider', () => fly(11, { kind: 'random' }, { maxTime: MINUTES * 60, survival: 'raider' }));
  bench('story', () => fly(5, { kind: 'random' }, { maxTime: MINUTES * 60, breakout: true }));
}, 1_800_000);
