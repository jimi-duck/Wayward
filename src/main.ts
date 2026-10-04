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
import { barsOut } from './ui/bars';
import { Hud } from './ui/hud';
import { DebugOverlay } from './ui/debug';
import { PadNav } from './ui/dom';
import { cardView, CommsPanel, hailView } from './ui/comms';
import { buildView, StartOptions, SummaryPanel } from './ui/panels';
import { PortPanel } from './ui/port';
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
  const world = new World(Math.floor(Math.random() * 1e9), { unlocked: grants(profile), modifiers: profile.modifiers, mode: profile.mode });
  const showMode = () => document.documentElement.classList.toggle('breakout', world.mode === 'breakout');
  showMode();
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

  // An iPhone gives a page in a browser no fullscreen, and the browser keeps
  // its tabs and bars on screen until the page scrolls (the swipe screen,
  // below). Opened from the Home Screen the game has none of them, so in a
  // browser on an iPhone the start card also says how to add it.
  const homeScreen = (navigator as Navigator & { standalone?: boolean }).standalone === true
    || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
  const iphoneBrowser = /iPhone|iPod/.test(navigator.userAgent) && !homeScreen;
  el('ios-tip').hidden = !iphoneBrowser;
  const fit = () => {
    const dpr = fitRenderer(renderer, quality.tier);
    const lift = hud.layout();
    sector.resize(canvas.clientWidth, canvas.clientHeight, dpr, lift);
  };
  new ResizeObserver(fit).observe(canvas);
  fit();
  // the console's text sizes change once the web fonts arrive
  document.fonts?.ready.then(fit);
  // compile every shader behind the start card, once it has painted
  setTimeout(() => sector.warm(), 60);

  // ── the run's stops: refit, comms, port, report ────────────────────────
  // The world pauses itself at each and waits (an ambush only slows it); the
  // panels answer it. The comms panel draws both a Breakout card and the
  // arcade's capital-ship hail.
  const refit = new RefitPanel();
  const comms = new CommsPanel();
  /** The card the comms panel is showing, so a slowed card that timed out can be taken down. */
  let shown: object | null = null;
  const summary = new SummaryPanel();
  const port = new PortPanel();
  const padNav = new PadNav();
  let reported = false;
  const panelOpen = () => refit.open || comms.open || port.open || world.phase === 'dock' || !el('summary').hidden || startOpts.logbookOpen;
  const startOpts = new StartOptions(profile, () => {
    saveProfile(profile);
    sector.setCosmetic(profile.cosmetic);
    // before the first launch nothing has happened yet, so the run can be re-made with the new modifiers
    if (!started) world.restart({ modifiers: profile.modifiers, mode: profile.mode });
  });
  const stops = () => {
    if (world.phase === 'refit' && world.offer && !refit.open) {
      // a full rail or battle salvage: three cards
      input.reset();
      refit.show(world.offer, world.levels, (i) => { world.choose(i); input.reset(); });
    } else if (world.phase === 'hail' && world.command.pending && !comms.open) {
      input.reset();
      shown = world.command.pending;
      comms.show(hailView(world.command.pending), (i) => { world.answerHail(i === 0); input.reset(); });
    } else if (world.phase === 'comms' && world.comms && !comms.open) {
      input.reset();
      shown = world.comms;
      comms.show(cardView(world.comms), (i) => { world.answer(i); input.reset(); });
    } else if (world.phase === 'dock' && !port.open) {
      // docked at the port, or back from a refit bought there
      input.reset();
      port.show(world, () => { input.reset(); hud.note(world, 'Cast off'); }, () => {});
    } else if (world.phase === 'over' && !reported) {
      reported = true;
      input.reset();
      const rec = recordRun(profile, world.run);
      summary.show(world.run, rec, () => {
        world.restart({ unlocked: grants(profile), modifiers: profile.modifiers, mode: profile.mode });
        showMode();
        reported = false;
        startOpts.render();
        hud.note(world, `Run begins · ${world.hull.name}`);
        input.reset();
      });
    }
    // an ambush's clock runs down on the panel; if it ran out, the world has answered for you
    if (comms.open) {
      const o = world.comms;
      if (o && o === shown) comms.timer(o.slow > 0 ? o.slow / o.def.slow!.timeout : 0);
      else if (shown !== world.command.pending || world.phase !== 'hail') { comms.close(); shown = null; }
    }
    // a gamepad answers the open panel
    if (refit.open || comms.open || port.open || !el('summary').hidden) {
      const p = padNav.poll();
      if (refit.open) refit.padInput(p);
      else if (comms.open) comms.padInput(p);
      else if (port.open) port.padInput(p);
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
  // (Android, iPad; never an iPhone browser), and on its side where it can
  // lock that too (Android, once fullscreen). Both need a tap, and a touch
  // only counts once it lifts, so every tap in a run asks again until it
  // holds: after a launch from a press, or after a swipe out of fullscreen.
  const fullscreen = () => {
    const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    if (!started || !coarse || document.fullscreenElement) return;
    try {
      const p = root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen?.();
      if (p instanceof Promise) p.then(landscape, () => {});
    } catch {
      // not allowed here: the game fits the window it has
    }
  };
  const landscape = () => {
    const o = screen.orientation as ScreenOrientation & { lock?: (to: 'landscape') => Promise<void> };
    o?.lock?.('landscape').catch(() => {});
  };
  window.addEventListener('pointerup', fullscreen, true);
  const launch = (mode: 'breakout' | 'arcade' = 'breakout') => {
    if (started) return;
    if (mode !== profile.mode || world.mode !== mode) {
      profile.mode = mode;
      saveProfile(profile);
      world.restart({ modifiers: profile.modifiers, mode });
      showMode();
    }
    started = true;
    el('start').hidden = true;
    document.documentElement.classList.remove('prelaunch');
    fullscreen();
    window.focus();
    fit();
    hud.note(world, world.mode === 'breakout' ? 'Clear of the yards · make for the lane mouth' : `Run begins · ${world.hull.name}`);
    setPaused(false);
  };

  const input = new Input(
    {
      layer: el('touch'), stick: el('stick'), knob: el('knob'), fire: el('fire'), torpedo: el('torp'), release: el('release'), cut: el('cut'),
    },
    () => (started ? (panelOpen() ? undefined : setPaused(!loop.paused)) : launch(profile.mode)),
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
        sector.warm();
      }
    },
  });
  loop.paused = true;

  // ── landscape only ─────────────────────────────────────────────────────
  // A phone held upright gets the turn screen over everything, and a run
  // pauses under it; turned back, the pause card waits for a tap.
  const upright = matchMedia('(orientation: portrait) and (max-width: 600px) and (pointer: coarse)');
  const turn = () => {
    document.documentElement.classList.toggle('upright', upright.matches);
    if (upright.matches && started && !panelOpen()) setPaused(true);
  };
  upright.addEventListener('change', turn);
  turn();

  // ── the browser's bars ─────────────────────────────────────────────────
  // An iPhone browser folds its tabs and bars away only when the page scrolls,
  // so there the page scrolls under the game, which stays fixed. While the
  // bars are out the swipe screen asks for the swipe up that folds them, and
  // a run pauses under it. The game's own surfaces never scroll the page, so
  // once folded the bars stay folded.
  document.documentElement.classList.toggle('swipe', iphoneBrowser);
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none';
  const tall = (h: string) => { probe.style.height = h; return probe.offsetHeight; };
  let small = 0;
  let large = 0;
  let out = false;
  let kept = false; // the player chose to play with the bars
  const bars = () => {
    const now = iphoneBrowser && !kept && barsOut(innerHeight, small, large);
    if (now === out) return;
    out = now;
    document.documentElement.classList.toggle('bars', out);
    if (out && started && !panelOpen()) setPaused(true);
  };
  // the two heights change only with the window's shape; the bars, on every scroll
  new ResizeObserver(() => { small = tall('100svh'); large = tall('100lvh'); bars(); }).observe(canvas);
  window.addEventListener('scroll', bars, { passive: true });
  window.visualViewport?.addEventListener('resize', bars);
  el('swipe-x').addEventListener('click', () => { kept = true; bars(); });

  el('launch').addEventListener('click', () => launch('breakout'));
  el('arcade').addEventListener('click', (e) => { e.stopPropagation(); launch('arcade'); });
  el('arcade').addEventListener('pointerdown', (e) => e.stopPropagation());
  el('start').addEventListener('pointerdown', (e) => {
    if (e.target === el('launch') || startOpts.logbookOpen) return;
    e.preventDefault();
    launch(profile.mode);
  });

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (!started) {
      if (startOpts.logbookOpen) { if (e.code === 'Escape') startOpts.logbook(false); return; }
      if (e.code === 'Enter' || e.code === 'Space') launch(profile.mode);
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
  // so does a swipe out of fullscreen, and the tap that resumes takes it back
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) away(); });
  // touch has no key to pause with: a small button, out of both thumbs' way
  el('pause-b').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (started && !panelOpen()) setPaused(true);
  });
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
