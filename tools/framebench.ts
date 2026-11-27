// The frame bench's in-page half (docs/PERF.md, pass 17). The dev server serves this file; tools/frame-bench.mjs
// imports it into the running game and calls `bench`. The scripted pilot (tools/pilot.ts) flies the live world,
// and every simulated step is drawn as one frame through the game's own Sector and HUD, so a frame here is the
// game's frame at 60 fps. Each part of the frame is timed on the main thread:
//
//   step   World.step (the simulation)
//   react  Sector.react and Hud.events (what a frame does with the step's events)
//   prep   Sector.frame minus the renderer (scene updates: transforms, effects, the camera)
//   draw   WebGLRenderer.render and the post chain, as three.js submits them (all passes)
//   hud    Hud.update (the DOM)
//
// With `stub` the GPU's draw and clear calls are no-ops, so a software renderer's fill time does not hide the
// JavaScript: three.js still sorts, culls, uploads uniforms and binds state as it would on a phone. Times are this
// machine's CPU, not a phone's; the counts (draws, programs, garbage) carry over.
import { flySteps } from './pilot';
import type { World } from '../src/sim/world';
import type { WebGLRenderer } from 'three';

interface Handle {
  world: World;
  sector: { frame(w: World, alpha: number, dt: number, uiDt?: number): void; react(e: unknown[]): number; console: unknown; covered: boolean; blind: boolean };
  hud: { update(w: World, s: unknown, dt: number): void; events(e: unknown[], w: World): void };
  renderer: WebGLRenderer;
  loop: { stop(): void; paused: boolean };
}

export interface BenchOptions {
  /** Simulated seconds to fly (one frame per step). */
  seconds: number;
  seed: number;
  /** No-op the GPU draw and clear calls (the driver can also do this from page start). */
  stub: boolean;
  /** Wait for the browser's next frame after each one, so its style, layout and paint run as in play (and can be traced). */
  paced: boolean;
  /** Count draws whose material had to change program (three.js's getProgram on the frame's path), by material. */
  switches?: boolean;
  /** Time the frame's GPU work with EXT_disjoint_timer_query_webgl2 (software GL here: it scales with pixels shaded, it is not a phone's time). */
  gpu?: boolean;
  /** Frames to read back (the canvas's pixels, base64 RGBA), for an A/B check that a change leaves the picture as it was. */
  shots?: number[];
}

export interface FrameRow { gpu?: number; step: number; react: number; prep: number; draw: number; hud: number; total: number; calls: number; tris: number; programs: number; events: string }

const now = () => performance.now();
const nextFrame = () => new Promise<number>((r) => requestAnimationFrame(r));

export async function bench(o: BenchOptions): Promise<{ lastDraws: string[]; shots: Array<{ frame: number; w: number; h: number; rgba: string }>; rows: FrameRow[]; heap: number[]; wall: number; restarts: number; switched: string[] }> {
  const W = (window as unknown as { wayward: Handle }).wayward;
  const { sector, hud, renderer, loop } = W;
  loop.stop();
  loop.paused = false;
  sector.console = null; sector.covered = false; sector.blind = false;
  const gl = renderer.getContext() as WebGL2RenderingContext & Record<string, unknown>;
  const kept: Array<[string, unknown]> = [];
  if (o.stub) for (const n of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements', 'clear', 'blitFramebuffer']) {
    kept.push([n, gl[n]]);
    gl[n] = () => {};
  }
  const info = renderer.info;
  info.autoReset = false;
  // the renderer's own time, counted once however deep the post chain calls it
  const render = renderer.render.bind(renderer);
  let depth = 0, drawMs = 0;
  renderer.render = (scene, camera) => {
    if (depth++ === 0) { const t0 = now(); try { render(scene, camera); } finally { drawMs += now() - t0; depth--; } }
    else { try { render(scene, camera); } finally { depth--; } }
  };
  const switched = new Map<string, number>();
  const rbd = renderer.renderBufferDirect;
  if (o.switches) {
    renderer.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
      const props = renderer.properties.get(material) as { currentProgram?: unknown };
      const before = props.currentProgram;
      rbd.call(renderer, camera, scene, geometry, material, object, group);
      if (before !== undefined && props.currentProgram !== before) {
        const rt = renderer.getRenderTarget() as { width?: number; isWebGLCubeRenderTarget?: boolean } | null;
        const path: string[] = []; for (let p = object.parent; p && path.length < 3; p = p.parent) path.push(p.name || p.type);
        const k = `${material.type}${material.name ? ' ' + material.name : ''} on ${object.type}${object.name ? ' ' + object.name : ''}${(object as { isInstancedMesh?: boolean }).isInstancedMesh ? ' (instanced)' : ''} [${path.join('<')}] into ${rt ? (rt.isWebGLCubeRenderTarget ? 'cube' : 'target ' + rt.width) : 'canvas'} ${material.uuid.slice(0, 4)} scene ${scene ? scene.uuid.slice(0, 4) : "-"} cam ${camera.type} obj ${object.uuid.slice(0, 4)} geo ${Object.keys(geometry.attributes).join(',')} side ${material.side} rs ${object.receiveShadow}`;
        switched.set(k, (switched.get(k) ?? 0) + 1);
      }
    };
  }
  const ext = o.gpu ? gl.getExtension('EXT_disjoint_timer_query_webgl2') as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null : null;
  const pending: Array<[WebGLQuery, number]> = [];
  const poll = () => {
    while (pending.length && gl.getQueryParameter(pending[0]![0], gl.QUERY_RESULT_AVAILABLE)) {
      const [q, i] = pending.shift()!;
      if (!gl.getParameter(ext!.GPU_DISJOINT_EXT) && rows[i]) rows[i]!.gpu = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
      gl.deleteQuery(q);
    }
  };
  let finishMs = 0;
  const shots: Array<{ frame: number; w: number; h: number; rgba: string }> = [];
  // --draws: every draw of the run's last frame, by object, material and pass
  const lastDraws: string[] = [];
  let drawLog: string[] | null = null;
  const rbd2 = renderer.renderBufferDirect;
  renderer.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    if (drawLog) {
      const rt = renderer.getRenderTarget() as { width?: number } | null;
      const path: string[] = []; for (let p: import('three').Object3D | null = object; p && path.length < 3; p = p.parent) path.push(p.name || p.type);
      const n = (object as { count?: number }).count;
      drawLog.push(`${camera.type === 'OrthographicCamera' && rt && (rt.width ?? 0) >= 512 ? 'shadow' : 'main'} ${path.join('<')} ${material.type}${material.name ? ' ' + material.name : ''}${n !== undefined ? ' count ' + n : ''} ${material.transparent ? 'T' : ''}`);
    }
    rbd2.call(renderer, camera, scene, geometry, material, object, group);
  };
  const rows: FrameRow[] = [];
  const heap: number[] = [];
  const mem = () => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0;
  let stepMs = 0, restarts = 0;
  const t0 = now();
  const frames = Math.round(o.seconds * 60);
  try {
    while (rows.length < frames) {
      const w = (window as unknown as { wayward: Handle }).wayward.world;
      if (w.phase === 'over') { w.restart({ survival: w.survival.id, mode: w.mode, carry: null }); restarts++; }
      const step = w.step.bind(w);
      // a person presses for a torpedo; the pilot holds the key down, which would ask for one (and flash the empty rack) every step
      let torpAt = -1;
      w.step = (dt, input) => {
        if (input.torpedo && w.arms.rack === 0) { if (w.runTime - torpAt < 0.5) input.torpedo = false; else torpAt = w.runTime; }
        const a = now(); step(dt, input); stepMs += now() - a;
      };
      let last: World['phase'] | null = null;
      try {
        const g = flySteps(w, o.seed + restarts, { kind: 'random' }, {
          maxTime: w.runTime + (frames - rows.length) / 60 + 1,
          breakout: w.mode === 'breakout',
          watch: (world, events) => {
            performance.mark('bench-frame');
            const a = now();
            const evs = events as unknown[];
            sector.react(evs);
            hud.events(evs, world);
            const b = now();
            info.reset();
            drawMs = 0;
            drawLog = rows.length === frames - 1 ? lastDraws : null;
            const q = ext ? gl.createQuery() : null;
            if (q) gl.beginQuery(ext!.TIME_ELAPSED_EXT, q);
            // no timer here (software GL): the frame's wall time to gl.finish, the queue drained first, is the raster's time
            const px = new Uint8Array(4);
            const sync = () => { renderer.setRenderTarget(null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
            if (o.gpu && !ext) sync();
            const g0 = now();
            sector.frame(world, 1, 1 / 60, 1 / 60);
            if (o.gpu && !ext) { sync(); finishMs = now() - g0; }
            if (q) { gl.endQuery(ext!.TIME_ELAPSED_EXT); pending.push([q, rows.length]); poll(); }
            if (o.shots?.includes(rows.length)) {
              renderer.setRenderTarget(null);
              const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, buf = new Uint8Array(W * H * 4);
              gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
              let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
              shots.push({ frame: rows.length, w: W, h: H, rgba: btoa(bin) });
            }
            const c = now();
            hud.update(world, sector, 1 / 60);
            const d = now();
            rows.push({
              ...(o.gpu && !ext ? { gpu: finishMs } : {}),
              step: stepMs, react: b - a, prep: c - b - drawMs, draw: drawMs, hud: d - c, total: stepMs + (d - a),
              calls: info.render.calls, tris: info.render.triangles, programs: info.programs?.length ?? 0,
              events: events.length ? [...new Set(events.map((e) => e.type))].join(',') : '',
            });
            if (rows.length % 60 === 0) heap.push(mem());
            stepMs = 0;
            last = world.phase;
          },
        });
        for (;;) {
          if (g.next().done || rows.length >= frames) break;
          if (o.paced) await nextFrame();
        }
      } finally { delete (w as Partial<World>).step; }
      if (w.phase !== 'over' && rows.length < frames) { console.warn('bench: the pilot stopped in', last, w.phase); break; }
    }
    if (ext) for (let i = 0; i < 400 && pending.length; i++) { await nextFrame(); poll(); }
  } finally {
    renderer.render = render;
    renderer.renderBufferDirect = rbd;
    info.autoReset = true;
    for (const [n, f] of kept) gl[n] = f;
  }
  return { lastDraws, shots, rows, heap, wall: now() - t0, restarts, switched: [...switched].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${(n / Math.max(1, rows.length)).toFixed(2)}/frame ${k}`) };
}

/** Materials that change program between draws (several programs live, or their version moves), after a bench run. */
export function programs(): string[] {
  const W = (window as unknown as { wayward: { sector: { scene: import('three').Scene }; renderer: WebGLRenderer } }).wayward;
  const out: string[] = [];
  const seen = new Set<unknown>();
  W.sector.scene.traverse((o) => {
    const mats = (o as unknown as { material?: unknown }).material;
    for (const m of (Array.isArray(mats) ? mats : mats ? [mats] : []) as import('three').Material[]) {
      if (seen.has(m)) continue;
      seen.add(m);
      const p = W.renderer.properties.get(m) as { programs?: Map<string, unknown> };
      if ((p.programs?.size ?? 0) > 1 || m.version > 2) out.push(`${m.type} ${m.name || o.name || o.type} programs ${p.programs?.size ?? 0} version ${m.version}`);
    }
  });
  return out;
}

/** Materials shared by objects that need different programs (instancing, receiveShadow, vertex alpha): three.js relinks them on every switch. */
export function sharedPrograms(): string[] {
  const W = (window as unknown as { wayward: { sector: { scene: import('three').Scene } } }).wayward;
  const by = new Map<import('three').Material, Set<string>>();
  const who = new Map<import('three').Material, string[]>();
  W.sector.scene.traverse((o) => {
    const mats = (o as unknown as { material?: unknown }).material;
    const g = (o as unknown as { geometry?: import('three').BufferGeometry }).geometry;
    for (const m of (Array.isArray(mats) ? mats : mats ? [mats] : []) as import('three').Material[]) {
      const k = `inst ${!!(o as { isInstancedMesh?: boolean }).isInstancedMesh} recv ${o.receiveShadow} alpha ${g?.attributes.color?.itemSize === 4} tan ${!!g?.attributes.tangent} icol ${!!(o as { instanceColor?: unknown }).instanceColor}`;
      if (!by.has(m)) { by.set(m, new Set()); who.set(m, []); }
      by.get(m)!.add(k);
      const path: string[] = []; for (let p: import('three').Object3D | null = o; p && path.length < 4; p = p.parent) path.push(p.name || p.type);
      who.get(m)!.push(`${path.join('<')} {${k}}`);
    }
  });
  const out: string[] = [];
  for (const [m, ks] of by) if (ks.size > 1) out.push(`${m.type} ${m.uuid.slice(0, 4)} ${m.name}: ${[...new Set(who.get(m))].slice(0, 6).join(' | ')}`);
  return out;
}

/** What the scene holds: objects, lights (a visible light is in every lit shader's loop, at any intensity), and how many matrices update each frame. */
export function sceneStats(): string[] {
  const W = (window as unknown as { wayward: { sector: { scene: import('three').Scene } } }).wayward;
  let objects = 0, auto = 0, visible = 0;
  const lights: string[] = [];
  W.sector.scene.traverse((o) => {
    objects++;
    if (o.matrixAutoUpdate) auto++;
    let v = true; for (let p: import('three').Object3D | null = o; p; p = p.parent) if (!p.visible) { v = false; break; }
    if (v) visible++;
    const l = o as unknown as { isLight?: boolean; type: string; intensity: number; distance?: number; castShadow?: boolean };
    if (l.isLight && v) lights.push(`${l.type} i=${l.intensity.toFixed(2)} d=${l.distance ?? '-'}${l.castShadow ? ' shadow' : ''} ${o.parent?.name || o.parent?.type || ''}`);
  });
  const n = new Map<string, number>(); for (const l of lights) n.set(l, (n.get(l) ?? 0) + 1);
  return [`objects ${objects}, visible ${visible}, matrixAutoUpdate ${auto}`, `visible lights ${lights.length}:`, ...[...n].map(([k, c]) => `  ${c}x ${k}`)];
}
