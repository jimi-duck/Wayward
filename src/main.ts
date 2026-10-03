import WebGL from 'three/addons/capabilities/WebGL.js';
import { HULL_ORDER, type HullId } from './content/hulls';
import { FixedStepLoop } from './core/loop';
import { Input } from './input/input';
import { PAUSE_KEYS } from './input/keyboard';
import { QualityGovernor, tierIndex } from './render/quality';
import { ZOOMS } from './render/camera';
import { createRenderer, fitRenderer } from './render/renderer';
import { Sector } from './render/sector';
import type { CameraMode } from './sim/controls';
import { World } from './sim/world';
import { DebugOverlay } from './ui/debug';
import { FlightPanel, Telemetry } from './ui/flight';

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} is missing from index.html`);
  return node as T;
}

function boot(): void {
  const canvas = el<HTMLCanvasElement>('view');
  if (!WebGL.isWebGL2Available()) {
    el('app').replaceChildren(WebGL.getWebGL2ErrorMessage());
    return;
  }

  // ?quality=low|medium|high pins a tier and switches the governor off.
  // Otherwise phones start one tier down and everything can only step lower.
  const params = new URLSearchParams(location.search);
  const pinned = tierIndex(params.get('quality'));
  const coarse = matchMedia('(pointer: coarse)').matches;
  const quality = new QualityGovernor(pinned >= 0 ? pinned : tierIndex(coarse ? 'medium' : 'high'), pinned >= 0);

  const world = new World();
  const renderer = createRenderer(canvas, quality.tier);
  const sector = new Sector(world.hull.id);
  const debug = new DebugOverlay(el('debug'), params.get('debug') === '1');
  const telemetry = new Telemetry(el('t-hull'), el('t-data'));

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  sector.reduceMotion = motion.matches;
  motion.addEventListener('change', (e) => { sector.reduceMotion = e.matches; });

  const fit = () => {
    const dpr = fitRenderer(renderer, quality.tier);
    sector.resize(canvas.clientWidth, canvas.clientHeight, dpr);
  };
  new ResizeObserver(fit).observe(canvas);
  fit();

  // ── hull and camera ────────────────────────────────────────────────────
  const setHull = (id: HullId) => {
    world.setHull(id);
    sector.setHull(id);
    telemetry.showHull(id);
    panel.show(world.hull.id, world.mode);
  };
  const setCamera = (m: CameraMode) => {
    world.mode = m;
    sector.setMode(m);
    panel.show(world.hull.id, world.mode);
  };
  const cycleZoom = () => {
    sector.rig.zoom = (sector.rig.zoom + 1) % ZOOMS.length;
    panel.showZoom(1 / ZOOMS[sector.rig.zoom]!);
  };
  const panel = new FlightPanel(el('panel'), setHull, setCamera, cycleZoom);
  setHull(world.hull.id);

  // ── start, pause ───────────────────────────────────────────────────────
  // The run waits behind the start card, so the first key or tap is the one
  // that launches, and in an embedded frame that click also gives the page
  // keyboard focus.
  let started = false;
  document.documentElement.classList.add('prelaunch');
  const setPaused = (on: boolean) => {
    loop.paused = on;
    document.documentElement.classList.toggle('paused', on && started);
    if (on) input.reset();
  };
  const launch = () => {
    if (started) return;
    started = true;
    el('start').hidden = true;
    document.documentElement.classList.remove('prelaunch');
    window.focus();
    setPaused(false);
  };

  const input = new Input(
    { layer: el('touch'), stick: el('stick'), knob: el('knob'), release: el('release'), roll: el('roll') },
    () => (started ? setPaused(!loop.paused) : launch()),
  );

  const loop = new FixedStepLoop({
    step(dt) {
      world.step(dt, input.sample());
      debug.step();
    },
    render(alpha, frameDt) {
      const dt = loop.paused ? 0 : frameDt;
      sector.sync(world, alpha, dt);
      renderer.render(sector.scene, sector.camera);
      telemetry.update(world, frameDt);
      debug.frame(frameDt, renderer, quality, input, loop.paused);
    },
    measure(dt) {
      if (!loop.paused && quality.sample(dt)) fit();
    },
  });
  loop.paused = true;

  el('launch').addEventListener('click', launch);
  el('start').addEventListener('pointerdown', (e) => {
    if (e.target === el('launch')) return;
    e.preventDefault();
    launch();
  });

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (!started) {
      if (e.code === 'Space' || e.code === 'Enter') launch();
      return;
    }
    // Any key resumes, except the pause keys themselves: Input has already
    // toggled on those, and answering them here as well would undo it.
    if (loop.paused && !PAUSE_KEYS.includes(e.code)) setPaused(false);
    if (e.code === 'KeyC') setCamera(world.mode === 'tactical' ? 'chase' : 'tactical');
    if (e.code === 'KeyZ') cycleZoom();
    const n = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
    if (n >= 0) setHull(HULL_ORDER[n]!);
  });

  // Leaving the tab or the window pauses, as in the original. Coming back
  // waits for the player: a key or a tap resumes.
  const away = () => { if (started) setPaused(true); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) away(); });
  window.addEventListener('blur', away);
  el('pause').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    setPaused(false);
  });
  // iOS Safari ignores user-scalable=no for pinch zoom; this is what stops it.
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // Development only: lets an automated check step the loop while the tab is
  // hidden (no animation frames) and read the state back. Stripped from builds.
  if (import.meta.env.DEV) Object.assign(window, { __ab: { world, loop, sector, renderer, input, launch } });

  loop.start();
}

boot();
