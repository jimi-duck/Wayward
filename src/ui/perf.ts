import type { WebGLRenderer } from 'three';
import type { QualityGovernor } from '../render/quality';
import type { PerfLayer } from '../render/sector';

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

interface TimerExt { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }

export interface PerfHooks {
  readonly renderer: WebGLRenderer;
  readonly quality: QualityGovernor;
  readonly off: Set<PerfLayer>;
  /** Pin a tier (0 low, 1 phone, 2 medium, 3 high). */
  pin(index: number): void;
  /** Re-size the drawing buffer (after ½ res is switched). */
  fit(): void;
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

  constructor(private readonly el: HTMLElement, private readonly hooks: PerfHooks) {
    this.gl = hooks.renderer.getContext() as WebGL2RenderingContext;
    this.ext = this.gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExt | null;
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
    row(TIERS.map((n) => [n, n[0]!.toUpperCase() + n.slice(1)] as [string, string]), (id) => hooks.pin(TIERS.indexOf(id as typeof TIERS[number])));
    row(LAYERS, (id) => {
      const l = id as PerfLayer;
      if (hooks.off.has(l)) hooks.off.delete(l); else hooks.off.add(l);
      if (l === 'hud') document.documentElement.classList.toggle('perf-nohud', hooks.off.has('hud'));
      if (l === 'half') hooks.fit();
    });
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
    const r = this.hooks.renderer, info = r.info.render, c = r.domElement;
    const off = [...this.hooks.off].join(' ') || 'none';
    this.text.textContent = [
      f.length ? `fps ${(1 / mean).toFixed(0)} · frame ${ms(mean)} · worst ${ms(worst)} · slow ${Math.round((slow / n) * 100)}%` : 'frames over 1 s: too slow to time',
      `cpu ${(this.cpuSum / (this.cpuN || 1)).toFixed(1)}ms · gpu ${this.ext ? (this.gpuN ? `${(this.gpuSum / this.gpuN).toFixed(1)}ms` : '…') : 'n/a'}`,
      `tier ${this.hooks.quality.tier.name} · ${c.width}×${c.height} @${r.getPixelRatio().toFixed(2)}`,
      `draws ${info.calls} · tris ${(info.triangles / 1000).toFixed(0)}k · off ${off}`,
    ].join('\n');
    this.frames.length = 0;
    this.cpuSum = this.cpuN = this.gpuSum = this.gpuN = 0;
    this.since = performance.now();
    this.paint();
  }

  private paint(): void {
    const tier = this.hooks.quality.tier.name;
    for (const n of TIERS) this.buttons.get(n)?.classList.toggle('on', n === tier);
    for (const [l] of LAYERS) this.buttons.get(l)?.classList.toggle('on', this.hooks.off.has(l));
  }
}

function ms(s: number): string {
  return `${(s * 1000).toFixed(1)}ms`;
}
