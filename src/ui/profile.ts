// ── what each thing on screen costs the GPU, on the device ────────────────────
// The ?perf Profile button: for a couple of seconds every draw is wrapped in a GPU timer query (EXT_disjoint_timer_query,
// which Chrome and Firefox offer; Safari does not), and the time is summed by what was drawn: the stone shader, the stars,
// the sky dome and so on. One line of the dearest few says what to rebuild on a browser that is slow at it (docs/PERF.md
// pass 25). Queries split the GPU's work, so the sums run high (far too high on Chrome on a Mac): shares are shown.

import { Material, ShaderMaterial, type Object3D } from 'three';

interface TimerExt { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }
type Hook = Object3D['onBeforeRender'];

/** Frames the profile records. */
const FRAMES = 90;

/** A short name for what a draw is: the shader's own cache key where it has one, else the kind of object and material. */
function label(o: Object3D): string {
  const raw = (o as Object3D & { material?: Material | Material[] }).material;
  const m = Array.isArray(raw) ? raw[0] : raw;
  if (!m) return o.type;
  if (m.customProgramCacheKey !== Material.prototype.customProgramCacheKey) {
    const key = m.customProgramCacheKey();
    if (key) return key.split('-').slice(0, 2).join('-');
  }
  if (m instanceof ShaderMaterial) {
    const u = Object.keys(m.uniforms).find((k) => /^u[A-Z]/.test(k));
    return `${o.type}:${u ?? m.type}`;
  }
  return `${o.type}:${m.type.replace('Material', '')}`;
}

export class DrawProfile {
  private frames = 0;
  private active: WebGLQuery | null = null;
  private readonly pending: Array<{ q: WebGLQuery; key: string }> = [];
  private readonly ms = new Map<string, number>();
  private readonly draws = new Map<string, number>();
  private readonly wrapped = new Map<Object3D, [Hook, Hook]>();
  /** The finished line, once every query has come back. */
  result = '';

  constructor(private readonly gl: WebGL2RenderingContext, private readonly ext: TimerExt, private readonly scene: () => Object3D) {}

  /** True while recording or waiting for the last results. */
  get running(): boolean {
    return this.frames < FRAMES || this.pending.length > 0;
  }

  /** Call once a frame, before the scene is drawn. */
  frame(): void {
    // a query that never comes back (a lost context, a driver that drops them) does not hold the readout for ever
    if (this.frames > FRAMES + 180) this.pending.length = 0;
    this.collect();
    if (this.frames++ < FRAMES) this.wrap();
    else this.unwrap();
    if (!this.running && !this.result) this.finish();
  }

  private wrap(): void {
    this.scene().traverse((o) => {
      if (this.wrapped.has(o)) return;
      const before = o.onBeforeRender, after = o.onAfterRender, key = label(o);
      this.wrapped.set(o, [before, after]);
      o.onBeforeRender = (...a) => {
        before.apply(o, a);
        if (this.active || this.frames > FRAMES) return;
        const q = this.gl.createQuery();
        if (!q) return;
        this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
        this.active = q;
        this.pending.push({ q, key });
        this.draws.set(key, (this.draws.get(key) ?? 0) + 1);
      };
      o.onAfterRender = (...a) => {
        if (this.active) { this.gl.endQuery(this.ext.TIME_ELAPSED_EXT); this.active = null; }
        after.apply(o, a);
      };
    });
  }

  private unwrap(): void {
    for (const [o, [before, after]] of this.wrapped) { o.onBeforeRender = before; o.onAfterRender = after; }
    this.wrapped.clear();
  }

  private collect(): void {
    const gl = this.gl;
    if (!this.pending.length) return;
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT) as boolean;
    while (this.pending.length) {
      const { q, key } = this.pending[0]!;
      if (q === this.active || !gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
      if (!disjoint) this.ms.set(key, (this.ms.get(key) ?? 0) + ns / 1e6);
      gl.deleteQuery(q);
      this.pending.shift();
    }
  }

  private finish(): void {
    // as shares of the whole: Chrome on an M1 summed 769 ms a frame for a 17 ms frame (each query splits the GPU's work
    // and is timed with its wait), so only the proportions mean anything (docs/PERF.md pass 26)
    const sum = [...this.ms.values()].reduce((a, b) => a + b, 0) || 1;
    const top = [...this.ms].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([k, v]) => `${k} ${Math.round((v / sum) * 100)}%/${Math.round((this.draws.get(k) ?? 0) / FRAMES)}`);
    this.result = `profile (share of gpu, draws a frame): ${top.join(' · ')}`;
  }
}
