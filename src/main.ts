import WebGL from 'three/addons/capabilities/WebGL.js';
import { HULLS, type HullId } from './content/hulls';
import { clamp } from './core/math';
import { FixedStepLoop } from './core/loop';
import { Input } from './input/input';
import { PAUSE_KEYS } from './input/keyboard';
import { ZOOMS } from './render/camera';
import { QualityGovernor, tierIndex } from './render/quality';
import { createRenderer, fitRenderer, matchTier } from './render/renderer';
import { Sector } from './render/sector';
import { World } from './sim/world';
import { Hud } from './ui/hud';
import { DebugOverlay } from './ui/debug';

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

  const world = new World(Math.floor(Math.random() * 1e9));
  const renderer = createRenderer(canvas, quality.tier);
  const sector = new Sector(world.hull.id, renderer, quality.tier);
  const debug = new DebugOverlay(el('debug'), params.get('debug') === '1');

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  sector.reduceMotion = motion.matches;
  motion.addEventListener('change', (e) => { sector.reduceMotion = e.matches; });

  // ── hull and zoom ──────────────────────────────────────────────────────
  const setHull = (id: HullId) => {
    if (id === world.hull.id) return;
    world.setHull(id);
    sector.setHull(id);
    hud.showHull(id);
    hud.note(world, `Hull changed · ${HULLS[id].name}`);
  };
  const zoom = (dir: 1 | -1) => {
    sector.rig.zoom = clamp(sector.rig.zoom + dir, 0, ZOOMS.length - 1);
    hud.showZoom(sector.rig.zoom);
  };
  const hud = new Hud(setHull, zoom);
  hud.showHull(world.hull.id);
  hud.showZoom(sector.rig.zoom);

  const fit = () => {
    const dpr = fitRenderer(renderer, quality.tier);
    const lift = hud.layout();
    sector.resize(canvas.clientWidth, canvas.clientHeight, dpr, lift);
  };
  new ResizeObserver(fit).observe(canvas);
  fit();
  // the console's text sizes change once the web fonts arrive
  document.fonts?.ready.then(fit);

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
    fit();
    hud.note(world, `Run begins · ${world.hull.name}`);
    setPaused(false);
  };

  const input = new Input(
    {
      layer: el('touch'), stick: el('stick'), knob: el('knob'), release: el('release'),
      roll: el('roll'), fire: el('fire'), torpedo: el('torp'),
    },
    () => (started ? setPaused(!loop.paused) : launch()),
  );

  const loop = new FixedStepLoop({
    step(dt) {
      world.step(dt, input.sample());
      debug.step();
    },
    render(alpha, frameDt) {
      const dt = loop.paused ? 0 : frameDt;
      const events = world.drain();
      sector.react(events);
      hud.events(events, world);
      sector.frame(world, alpha, dt);
      hud.update(world, sector, frameDt);
      debug.frame(frameDt, renderer, quality, input, loop.paused);
    },
    measure(dt) {
      if (!loop.paused && quality.sample(dt)) {
        matchTier(renderer, quality.tier);
        sector.setTier(quality.tier);
        fit();
      }
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
      if (e.code === 'Enter' || e.code === 'Space') launch();
      return;
    }
    // Any key resumes, except the pause keys themselves: Input has already
    // toggled on those, and answering them here as well would undo it.
    if (loop.paused && !PAUSE_KEYS.includes(e.code)) setPaused(false);
    if (e.code === 'KeyZ') zoom(sector.rig.zoom === ZOOMS.length - 1 ? -1 : 1);
    if (e.code === 'Minus') zoom(1);
    if (e.code === 'Equal') zoom(-1);
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
  if (import.meta.env.DEV) Object.assign(window, { __ab: { world, loop, sector, renderer, input, launch, hud } });

  loop.start();
}

boot();
