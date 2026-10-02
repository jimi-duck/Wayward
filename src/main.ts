import WebGL from 'three/addons/capabilities/WebGL.js';
import { FixedStepLoop } from './core/loop';
import { Input } from './input/input';
import { PAUSE_KEYS } from './input/keyboard';
import { QualityGovernor, tierIndex } from './render/quality';
import { createRenderer, fitRenderer } from './render/renderer';
import { Sector } from './render/sector';
import { World } from './sim/world';
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
  const quality = new QualityGovernor(
    pinned >= 0 ? pinned : tierIndex(coarse ? 'medium' : 'high'),
    pinned >= 0,
  );

  const renderer = createRenderer(canvas, quality.tier);
  const sector = new Sector();
  const world = new World();
  const debug = new DebugOverlay(el('debug'), params.get('debug') !== '0');

  const fit = () => {
    const dpr = fitRenderer(renderer, quality.tier);
    sector.resize(canvas.clientWidth, canvas.clientHeight, dpr);
  };
  new ResizeObserver(fit).observe(canvas);
  fit();

  const setPaused = (on: boolean) => {
    loop.paused = on;
    document.documentElement.classList.toggle('paused', on);
    if (on) input.reset();
  };

  const input = new Input(
    { layer: el('touch'), stick: el('stick'), knob: el('knob'), release: el('release') },
    () => setPaused(!loop.paused),
  );

  const loop = new FixedStepLoop({
    step(dt) {
      world.step(dt, input.sample());
      debug.step();
    },
    render(alpha, frameDt) {
      sector.sync(world, alpha);
      renderer.render(sector.scene, sector.camera);
      debug.frame(frameDt, renderer, quality, input, loop.paused);
    },
    measure(dt) {
      if (!loop.paused && quality.sample(dt)) fit();
    },
  });

  // Leaving the tab or the window pauses, as in the original. Coming back
  // waits for the player: a key or a tap resumes.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setPaused(true);
  });
  window.addEventListener('blur', () => setPaused(true));
  el('pause').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    setPaused(false);
  });
  // Any key resumes, except the pause keys themselves: Input has already
  // toggled on those, and answering them here as well would undo it.
  window.addEventListener('keydown', (e) => {
    if (!loop.paused || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!PAUSE_KEYS.includes(e.code)) setPaused(false);
  });
  // iOS Safari ignores user-scalable=no for pinch zoom; this is what stops it.
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  loop.start();
}

boot();
