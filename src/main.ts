import WebGL from 'three/addons/capabilities/WebGL.js';
import { clamp } from './core/math';
import { FixedStepLoop } from './core/loop';
import { Input } from './input/input';
import { PAUSE_KEYS } from './input/keyboard';
import { ZOOMS } from './render/camera';
import { QualityGovernor, tierIndex } from './render/quality';
import { createRenderer, fitRenderer, matchTier } from './render/renderer';
import { Sector } from './render/sector';
import { World } from './sim/world';
import { grants, loadProfile, recordRun, saveProfile } from './meta/profile';
import { Hud } from './ui/hud';
import { DebugOverlay } from './ui/debug';
import { PadNav } from './ui/dom';
import { buildView, HailPanel, StartOptions, SummaryPanel } from './ui/panels';
import { RefitPanel } from './ui/refit';

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

  // The pilot's record between runs: bests, unlocks, chosen modifiers.
  const profile = loadProfile();
  const world = new World(Math.floor(Math.random() * 1e9), { unlocked: grants(profile), modifiers: profile.modifiers });
  const renderer = createRenderer(canvas, quality.tier);
  const sector = new Sector(renderer, quality.tier);
  sector.setCosmetic(profile.cosmetic);
  const debug = new DebugOverlay(el('debug'), params.get('debug') === '1');

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  sector.reduceMotion = motion.matches;
  motion.addEventListener('change', (e) => { sector.reduceMotion = e.matches; });

  // ── zoom ───────────────────────────────────────────────────────────────
  // the middle distance by default: room to see what is coming; the choice is remembered
  sector.rig.zoom = clamp(Math.round(profile.zoom), 0, ZOOMS.length - 1);
  const zoom = (dir: number) => {
    sector.rig.zoom = clamp(sector.rig.zoom + dir, 0, ZOOMS.length - 1);
    hud.showZoom(sector.rig.zoom);
    profile.zoom = sector.rig.zoom;
    saveProfile(profile);
  };
  const hud = new Hud(zoom);
  hud.showZoom(sector.rig.zoom);

  // iPhone Safari has no fullscreen for a page and shows a strip of tabs across
  // the top in landscape. The page cannot hide it, so the start card says where
  // Safari's own switch is, only there and only on its side.
  const ua = navigator.userAgent;
  const iphoneSafari = /iPhone|iPod/.test(ua) && /Version\/[\d.]+.*Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const fit = () => {
    const dpr = fitRenderer(renderer, quality.tier);
    const lift = hud.layout();
    sector.resize(canvas.clientWidth, canvas.clientHeight, dpr, lift);
    el('ios-tip').hidden = !(iphoneSafari && innerWidth > innerHeight);
  };
  new ResizeObserver(fit).observe(canvas);
  fit();
  // the console's text sizes change once the web fonts arrive
  document.fonts?.ready.then(fit);

  // ── the run's stops: refit, hail, report ───────────────────────────────
  // The world pauses itself at each and waits; the panels answer it.
  const refit = new RefitPanel();
  const hail = new HailPanel();
  const summary = new SummaryPanel();
  const padNav = new PadNav();
  let reported = false;
  const panelOpen = () => refit.open || hail.open || !el('summary').hidden || startOpts.logbookOpen;
  const startOpts = new StartOptions(profile, () => {
    saveProfile(profile);
    sector.setCosmetic(profile.cosmetic);
    // before the first launch nothing has happened yet, so the run can be re-made with the new modifiers
    if (!started) world.restart({ modifiers: profile.modifiers });
  });
  const stops = () => {
    if (world.phase === 'refit' && world.offer && !refit.open) {
      // a full rail or battle salvage: three cards
      input.reset();
      refit.show(world.offer, world.levels, (i) => { world.choose(i); input.reset(); });
    } else if (world.phase === 'hail' && world.command.pending && !hail.open) {
      input.reset();
      hail.show(world.command.pending, (engage) => { world.answerHail(engage); input.reset(); });
    } else if (world.phase === 'over' && !reported) {
      reported = true;
      input.reset();
      const rec = recordRun(profile, world.run);
      summary.show(world.run, rec, () => {
        world.restart({ unlocked: grants(profile), modifiers: profile.modifiers });
        reported = false;
        startOpts.render();
        hud.note(world, `Run begins · ${world.hull.name}`);
        input.reset();
      });
    }
    // a gamepad answers the open panel
    if (refit.open || hail.open || !el('summary').hidden) {
      const p = padNav.poll();
      if (refit.open) refit.padInput(p);
      else if (hail.open) hail.padInput(p);
      else summary.padInput(p);
    }
    // a full rail: a beat of slow motion before the panel
    loop.timeScale = world.celebrate > 0 ? 0.3 : 1;
    // a panel that stops the run takes the screen: the HUD steps back
    document.documentElement.classList.toggle('panel-open', panelOpen());
  };

  // ── start, pause ───────────────────────────────────────────────────────
  // The run waits behind the start card, so the first key or tap is the one
  // that launches, and in an embedded frame that click also gives the page
  // keyboard focus.
  let started = false;
  document.documentElement.classList.add('prelaunch');
  const setPaused = (on: boolean) => {
    loop.paused = on;
    document.documentElement.classList.toggle('paused', on && started);
    if (on) {
      input.reset();
      el('pause-build').replaceChildren(buildView(world.levels));
    }
  };
  // Phones and tablets take the whole screen where the browser allows it
  // (Android, iPad; never iPhone Safari). It needs a tap, and a touch only
  // counts once it lifts, so a launch from a press tries again on the release.
  const fullscreen = () => {
    const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    if (document.fullscreenElement || !document.documentElement.classList.contains('touch-ui')) return;
    try {
      const p = root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen?.();
      if (p instanceof Promise) p.catch(() => {});
    } catch {
      // not allowed here: the game fits the window it has
    }
  };
  const launch = () => {
    if (started) return;
    started = true;
    el('start').hidden = true;
    document.documentElement.classList.remove('prelaunch');
    fullscreen();
    window.addEventListener('pointerup', fullscreen, { once: true });
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
    () => (started ? (panelOpen() ? undefined : setPaused(!loop.paused)) : launch()),
  );

  const loop = new FixedStepLoop({
    step(dt) {
      world.step(dt, input.sample());
      debug.step();
    },
    render(alpha, frameDt) {
      const dt = loop.paused ? 0 : frameDt;
      const events = world.drain();
      // a kill lands harder for a beat of stillness (never with reduced motion)
      const hold = sector.react(events);
      if (hold > 0 && !sector.reduceMotion) loop.freeze(hold);
      hud.events(events, world);
      sector.frame(world, alpha, dt);
      hud.update(world, sector, frameDt);
      if (started) stops();
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
    if (e.target === el('launch') || startOpts.logbookOpen) return;
    e.preventDefault();
    launch();
  });

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (!started) {
      if (startOpts.logbookOpen) { if (e.code === 'Escape') startOpts.logbook(false); return; }
      if (e.code === 'Enter' || e.code === 'Space') launch();
      return;
    }
    if (panelOpen()) return;
    if (e.code === 'Tab') e.preventDefault();
    // Any key resumes, except the pause keys themselves: Input has already
    // toggled on those, and answering them here as well would undo it.
    if (loop.paused && !PAUSE_KEYS.includes(e.code)) setPaused(false);
    if (e.code === 'KeyZ') zoom(sector.rig.zoom === ZOOMS.length - 1 ? -sector.rig.zoom : 1); // cycles round
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
  if (import.meta.env.DEV) Object.assign(window, { __ab: { world, loop, sector, renderer, input, launch, hud, profile } });

  loop.start();
}

boot();
