import type { WebGLRenderer } from 'three';
import type { QualityGovernor } from '../render/quality';
import type { Object3D } from 'three';
import type { PerfLayer } from '../render/sector';
import { DrawProfile } from './profile';

// The phone readout (`?perf`): what a frame costs on the device in hand, and switches that take one layer
// out at a time, so a phone can say where its time goes. The cloud has no GPU; this is how we measure one.
// A dev tool, English only, never on unless asked for: nothing here changes the game.
//
// Frame: the interval between frames (what the eye sees), its average and worst over two seconds.
// CPU: our own work in the frame (simulation excluded), as JavaScript sees it.
// GPU: the scene's draw time from a GPU timer, where the browser offers one (most Android Chrome; not iOS Safari).

const WINDOW = 2;
const LAYERS: ReadonlyArray<[PerfLayer, string]> = [
  ['post', 'Post'], ['shadow', 'Shadow'], ['sky', 'Sky'], ['far', 'Stars'], ['rocks', 'Rocks'], ['debris', 'Debris'], ['hud', 'HUD'], ['half', '½ res'],
];
const TIERS = ['low', 'phone', 'medium', 'high'] as const;
const AUTO = 'auto';
const TEST = 'test';
const PROFILE = 'profile';
/** The self-test: each state held this long, the first part of it not counted (a resize or a layer change settles). */
const TEST_HOLD = 3;
const TEST_SKIP = 0.8;
/**
 * What the self-test takes out: nothing, then each layer on its own, then every layer at once ("bare"), then no picture
 * at all ("empty": a clear and the page). If even "empty" is slow, the time is the browser's, not the game's.
 */
const SINGLE: readonly PerfLayer[] = ['post', 'shadow', 'sky', 'far', 'rocks', 'debris', 'hud', 'half'];
const TEST_STEPS: ReadonlyArray<{ label: string; off: readonly PerfLayer[] }> = [
  { label: 'all', off: [] },
  ...SINGLE.map((l) => ({ label: `-${LAYERS.find(([id]) => id === l)![1]}`, off: [l] })),
  { label: 'bare', off: SINGLE },
  { label: 'empty', off: ['scene', 'hud'] },
];

interface TimerExt { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }

export interface PerfHooks {
  readonly renderer: WebGLRenderer;
  readonly quality: QualityGovernor;
  readonly off: Set<PerfLayer>;
  /** The scene, for the per-draw profile. */
  scene(): Object3D;
  /** Pin a tier (0 low, 1 phone, 2 medium, 3 high), or `null` to hand it back to the governor. */
  pin(index: number | null): void;
  /** Re-size the drawing buffer (after ½ res is switched). */
  fit(): void;
  /** Lift the even-30 cap while the Test measures (true), or put it back as the governor has it (false). */
  uncap(on: boolean): void;
}

export class PerfReadout {
  private readonly text: HTMLElement;
  private readonly buttons = new Map<string, HTMLButtonElement>();
  private readonly frames: number[] = [];
  private cpuSum = 0;
  private cpuN = 0;
  private gpuSum = 0;
  private gpuN = 0;
  private since = 0;
  private last = 0;
  private cpuStart = 0;
  private readonly gl: WebGL2RenderingContext;
  private readonly ext: TimerExt | null;
  private readonly pending: WebGLQuery[] = [];
  private query: WebGLQuery | null = null;
  /** The self-test in progress: the step, when it began, and the frame intervals counted so far. */
  private test: { step: number; at: number; frames: number[]; out: string[]; pinned: boolean } | null = null;
  /** The last self-test's line, kept under the readout. */
  private tested = '';
  /** The per-draw GPU profile in progress, or the last one. */
  private profile: DrawProfile | null = null;
  private readonly gpuName: string;
  /** The browser's own build (arm or x86, from client hints): an x86 Chrome on an Apple chip runs translated, and slow. */
  private arch = '';

  constructor(private readonly el: HTMLElement, private readonly hooks: PerfHooks) {
    this.gl = hooks.renderer.getContext() as WebGL2RenderingContext;
    this.ext = this.gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExt | null;
    // which GPU the browser drew with (a browser that fell back to software says so here)
    const info = this.gl.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL: number } | null;
    this.gpuName = String((info ? this.gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : this.gl.getParameter(this.gl.RENDERER)) ?? '?').replace(/^ANGLE \((.*)\)$/, '$1').slice(0, 80) + ` · msaa ${this.gl.getContextAttributes()?.antialias ? 'on' : 'off'}`;
    const hints = (navigator as Navigator & { userAgentData?: { getHighEntropyValues(h: string[]): Promise<{ architecture?: string; bitness?: string }> } }).userAgentData;
    hints?.getHighEntropyValues(['architecture', 'bitness']).then((h) => { if (h.architecture) this.arch = ` · browser ${h.architecture}${h.bitness ? `-${h.bitness}` : ''}`; }).catch(() => {});
    el.hidden = false;
    el.classList.add('pf');
    el.replaceChildren();
    this.text = document.createElement('div');
    this.text.className = 'pf-text';
    el.append(this.text);
    const row = (items: ReadonlyArray<[string, string]>, press: (id: string) => void) => {
      const r = document.createElement('div');
      r.className = 'pf-row';
      for (const [id, label] of items) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.addEventListener('click', () => { press(id); this.paint(); this.restart(); });
        this.buttons.set(id, b);
        r.append(b);
      }
      el.append(r);
    };
    // a tier button pins that tier for the session (the governor stops judging); Auto hands it back
    row([[TEST, 'Test'], [PROFILE, 'Profile'], [AUTO, 'Auto'], ...TIERS.map((n) => [n, n[0]!.toUpperCase() + n.slice(1)] as [string, string])], (id) => {
      if (id === TEST) this.startTest();
      else if (id === PROFILE) { if (this.ext && !this.profile?.running) this.profile = new DrawProfile(this.gl, this.ext, hooks.scene); }
      else hooks.pin(id === AUTO ? null : TIERS.indexOf(id as typeof TIERS[number]));
    });
    row(LAYERS, (id) => this.toggle(id as PerfLayer));
    // taps here are for the readout, never the flight controls underneath
    for (const type of ['pointerdown', 'pointerup', 'touchstart'] as const) el.addEventListener(type, (e) => e.stopPropagation());
    this.paint();
  }

  /** Just before the frame's own work. */
  begin(): void {
    this.cpuStart = performance.now();
    // count every pass of the frame (shadow, scene, post), not only the last one drawn
    const info = this.hooks.renderer.info;
    info.autoReset = false;
    info.reset();
    this.collect();
    // the profile times each draw itself; a frame query around them would nest, which the extension does not allow
    if (this.profile?.running) { this.profile.frame(); return; }
    if (this.ext && !this.query && this.pending.length < 4) {
      this.query = this.gl.createQuery();
      if (this.query) this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.query);
    }
  }

  /** Just after it. Intervals are the wall clock's, not the game's (which clamps a long frame). */
  end(): void {
    const now = performance.now();
    const dt = this.last ? (now - this.last) / 1000 : 0;
    this.last = now;
    if (this.ext && this.query) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.pending.push(this.query);
      this.query = null;
    }
    this.cpuSum += performance.now() - this.cpuStart;
    this.cpuN++;
    if (dt > 0 && dt < 1) this.frames.push(dt);
    if (this.test) this.testFrame(now, dt);
    if (!this.since) this.since = now;
    if (now - this.since >= WINDOW * 1000) this.report();
  }

  /** Read back finished GPU timings; a disjoint (the GPU was interrupted) throws the lot away. */
  private collect(): void {
    if (!this.ext || !this.pending.length) return;
    const gl = this.gl;
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT) as boolean;
    while (this.pending.length) {
      const q = this.pending[0]!;
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
      if (!disjoint) { this.gpuSum += ns / 1e6; this.gpuN++; }
      gl.deleteQuery(q);
      this.pending.shift();
    }
  }

  /** A switch was pressed: the next readout measures only the new state. */
  private restart(): void {
    this.frames.length = 0;
    this.cpuSum = this.cpuN = this.gpuSum = this.gpuN = 0;
    this.since = performance.now();
    this.text.textContent += '\n(measuring…)';
  }

  private report(): void {
    const f = this.frames.sort((a, b) => a - b);
    const n = f.length || 1;
    const mean = f.reduce((s, v) => s + v, 0) / n;
    const worst = f[f.length - 1] ?? 0;
    const slow = f.filter((v) => v > 1 / 50).length;
    const r = this.hooks.renderer, info = r.info.render, c = r.domElement, q = this.hooks.quality;
    const off = [...this.hooks.off].join(' ') || 'none';
    this.text.textContent = [
      f.length ? `fps ${(1 / mean).toFixed(0)} · frame ${ms(mean)} · worst ${ms(worst)} · slow ${Math.round((slow / n) * 100)}%` : 'frames over 1 s: too slow to time',
      `cpu ${(this.cpuSum / (this.cpuN || 1)).toFixed(1)}ms · gpu ${this.ext ? (this.gpuN ? `${(this.gpuSum / this.gpuN).toFixed(1)}ms` : '…') : 'n/a'}`,
      `tier ${q.tier.name} ${q.pinned ? 'pinned' : 'auto'} · ${c.width}×${c.height} @${r.getPixelRatio().toFixed(2)}${q.scale < 1 ? ` (size ${q.scale})` : ''}`,
      `draws ${info.calls} · tris ${(info.triangles / 1000).toFixed(0)}k · off ${off}`,
      this.gpuName + this.arch,
      ...(this.test ? [`testing… ${this.test.out.join(' · ')}`] : this.tested ? [this.tested] : []),
      ...(this.profile ? [this.profile.running ? 'profiling…' : this.profile.result] : this.ext ? [] : ['profile: no GPU timer in this browser']),
    ].join('\n');
    this.frames.length = 0;
    this.cpuSum = this.cpuN = this.gpuSum = this.gpuN = 0;
    this.since = performance.now();
    this.paint();
  }

  /**
   * Test: the whole frame, then each layer off in turn and the picture at half size, about three seconds each, on the
   * tier in use (held still meanwhile). One line of frame rates says where the time goes on this device: a layer whose
   * removal lifts the rate is the cost; nothing lifting it but the HUD or half size says pixels or the page.
   */
  private startTest(): void {
    if (this.test) return;
    const pinned = this.hooks.quality.pinned;
    // the size and tier in use, held still, and no frame cap, so each step reads what this picture really costs
    this.hooks.quality.freeze(true);
    this.hooks.uncap(true);
    for (const l of [...this.hooks.off]) this.toggle(l);
    this.test = { step: 0, at: performance.now(), frames: [], out: [], pinned };
  }

  private testFrame(now: number, dt: number): void {
    const t = this.test!;
    const age = (now - t.at) / 1000;
    if (age > TEST_SKIP && dt > 0 && dt < 1) t.frames.push(dt);
    if (age < TEST_HOLD) return;
    const mean = t.frames.reduce((a, b) => a + b, 0) / (t.frames.length || 1);
    t.out.push(`${TEST_STEPS[t.step]!.label} ${t.frames.length ? (1 / mean).toFixed(0) : '?'}`);
    t.step++;
    const next = TEST_STEPS[t.step];
    this.only(next?.off ?? []);
    if (next === undefined) {
      this.tested = `test (fps): ${t.out.join(' · ')}`;
      this.test = null;
      this.hooks.quality.freeze(t.pinned);
      this.hooks.uncap(false);
      this.paint();
      return;
    }
    t.at = performance.now();
    t.frames = [];
  }

  /** Exactly these layers out, the rest back in. */
  private only(want: readonly PerfLayer[]): void {
    for (const l of [...this.hooks.off]) if (!want.includes(l)) this.toggle(l);
    for (const l of want) if (!this.hooks.off.has(l)) this.toggle(l);
  }

  /** Take a layer out, or put it back, as its button does. */
  private toggle(l: PerfLayer): void {
    const off = this.hooks.off;
    if (off.has(l)) off.delete(l); else off.add(l);
    if (l === 'hud') document.documentElement.classList.toggle('perf-nohud', off.has('hud'));
    if (l === 'half') this.hooks.fit();
    this.paint();
  }

  private paint(): void {
    const q = this.hooks.quality, tier = q.tier.name;
    this.buttons.get(AUTO)?.classList.toggle('on', !q.pinned);
    this.buttons.get(TEST)?.classList.toggle('on', !!this.test);
    for (const n of TIERS) this.buttons.get(n)?.classList.toggle('on', q.pinned && n === tier);
    for (const [l] of LAYERS) this.buttons.get(l)?.classList.toggle('on', this.hooks.off.has(l));
  }
}

function ms(s: number): string {
  return `${(s * 1000).toFixed(1)}ms`;
}
