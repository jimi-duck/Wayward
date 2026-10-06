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
import { grants, loadProfile, recordJourney, recordRun, saveProfile } from './meta/profile';
import { clearJourney, loadJourney, saveJourney } from './meta/save';
import { checkpoint, endSortie, hearNews, here, newJourney, options, plot, replot, sortieDef, type Journey, type Outcome } from './sim/journey';
import { sysById } from './sim/chart';
import { journeyRecord, pending } from './sim/endings';
import { EndingPanel } from './ui/ending';
import { ChartPanel } from './ui/chart';
import { barsOut } from './ui/bars';
import { Hud } from './ui/hud';
import { DebugOverlay } from './ui/debug';
import { PadNav } from './ui/dom';
import { cardView, CommsPanel, hailView } from './ui/comms';
import { buildView, StartOptions, SummaryPanel } from './ui/panels';
import { PortPanel } from './ui/port';
import { RefitPanel } from './ui/refit';
import { BayPanel } from './ui/bay';
import { detect, localize, onLang, plural, setLang, t } from './i18n';

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} is missing from index.html`);
  return node as T;
}

function boot(): void {
  // the language first: everything after draws its text in it
  setLang(detect(), false);
  localize();
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
  const chart = new ChartPanel();
  const ending = new EndingPanel();
  const bay = new BayPanel();
  const padNav = new PadNav();
  let reported = false;
  const panelOpen = () => refit.open || bay.open || comms.open || port.open || chart.open || ending.open || world.phase === 'dock' || !el('summary').hidden || startOpts.logbookOpen;

  // ── the journey ────────────────────────────────────────────────────────
  // The Breakout mode is a journey: system after system, with the chart
  // between them. It is saved between systems and at every port, so the
  // start card can carry on where the last session left off.
  let journey: Journey | null = loadJourney();
  // The title offers two ways to play, Arcade picked whenever the game opens;
  // Story mode carries on a saved journey, with a fresh one a click below.
  let pick: 'arcade' | 'breakout' = 'arcade';
  const showResume = () => {
    const j = pick === 'breakout' && journey && (journey.status !== 'over' || pending(journey)) ? journey : null;
    el('mode-arcade').setAttribute('aria-checked', String(pick === 'arcade'));
    el('mode-story').setAttribute('aria-checked', String(pick === 'breakout'));
    el('fresh').hidden = !j;
    el('resume-s').hidden = !j;
    el('launch').textContent = pick === 'arcade' ? t('Start arcade') : j ? t('Continue story') : t('Start story');
    const day = t('Day {n}', { n: Math.floor(j?.day ?? 0) + 1 });
    if (j && pending(j)) el('resume-s').textContent = `${day} · ${t('through the Threshold · the file is still aboard')}`;
    else if (j) el('resume-s').textContent = [day, here(j).name, j.dest ? t('bound for {dest}', { dest: sysById(j.chart, j.dest).name }) : '', j.wrecks ? plural(j.wrecks, '{n} wreck', '{n} wrecks') : ''].filter(Boolean).join(' · ');
  };
  const choose = (mode: 'arcade' | 'breakout') => { pick = mode; showResume(); };
  showResume();
  /** Fly the journey's current system. */
  const startSortie = () => {
    const j = journey!;
    world.restart({ unlocked: grants(profile), modifiers: profile.modifiers, mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
    showMode();
    reported = false;
    setPaused(false);
    const d = world.sortie;
    hud.note(world, d.home ? t('Clear of the yards · make for the lane mouth') : `${d.name} · ${t('{n} Krail to jump to {dest}', { n: d.jumpCost, dest: t(d.dest) })}`);
  };
  /** Between systems: the chart, to plot the next jump. */
  const openChart = (lines: string[]) => {
    const j = journey!;
    loop.paused = true;
    input.reset();
    chart.plot(j, lines, (id) => {
      plot(j, id);
      saveJourney(j);
      startSortie();
    });
  };
  /** Docked: the lanes out of here, to plot again with the dockmaster's news in hand. */
  const courseFor = (j: Journey) => {
    if (world.carry().flags.includes('news')) hearNews(j);
    return {
      lanes: () => options(j).map((o) => ({
        id: o.to.id, name: o.to.name, krail: o.route.krail, days: o.route.days,
        note: [o.netted ? t('the Net holds it') : '', o.shadow ? t('Calloway last seen there') : '', o.to.kind === 'edge' ? t('the way out') : ''].filter(Boolean).join(' · '),
      })),
      current: () => j.dest,
      pick: (id: string) => { const r = replot(j, id); if (r) world.replot(r.dest, r.jumpCost); },
    };
  };
  /** A notice with one way on: adrift, or the journey's end (into the Archive, then a new journey). */
  const noticeOf = (j: Journey, out: Outcome) => {
    loop.paused = true;
    input.reset();
    if (j.status === 'over') recordJourney(profile, journeyRecord(j));
    chart.notice(j, out, () => {
      if (j.status === 'over') {
        journey = newJourney(Math.floor(Math.random() * 1e9));
        saveJourney(journey);
      }
      startSortie();
    });
  };
  /** Through the Threshold: what the file is worth, its epilogue, then how the journey went. */
  const threshold = (j: Journey, lines: string[]) => {
    loop.paused = true;
    input.reset();
    ending.show(j, () => {
      saveJourney(j);
      noticeOf(j, { kind: 'through', lines: [...j.log.slice(-1).map((l) => l.text), ...lines] });
    });
  };
  /** The sortie is over: fold it into the journey, then the chart, a notice, the Threshold, or the end. */
  const sortieOver = () => {
    const j = journey!;
    const rec = recordRun(profile, world.run);
    const out = endSortie(j, world.result());
    saveJourney(j);
    const lines = [...out.lines, ...rec.unlocked.map((u) => `${t('Unlocked')} · ${t(u.name)}`)];
    if (out.kind === 'jumped') return openChart(lines);
    if (pending(j)) return threshold(j, lines);
    noticeOf(j, { ...out, lines });
  };
  const startOpts = new StartOptions(profile, () => {
    saveProfile(profile);
    sector.setCosmetic(profile.cosmetic);
    // before the first launch nothing has happened yet, so the run can be re-made with the new modifiers
    if (!started) world.restart({ modifiers: profile.modifiers, mode: profile.mode });
  });
  // a new language: the page, then whatever the start card drew itself
  onLang(() => { localize(); showResume(); startOpts.render(); hud.relabel(); });
  const stops = () => {
    if (world.phase === 'refit' && world.offer && !refit.open) {
      // a full rail or battle salvage: three cards
      input.reset();
      refit.show(world.offer, world.levels, (i) => { world.choose(i); input.reset(); }, !world.bk);
    } else if (world.phase === 'bay' && !bay.open) {
      // the refit bay: the player opened it, and the world waits until they launch
      input.reset();
      bay.show(world, () => { world.closeBay(); input.reset(); hud.note(world, t('Launched')); });
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
      port.show(world, () => {
        input.reset();
        hud.note(world, t('Cast off'));
        // the save at the port: a load starts this system again with the hold as it is now
        if (journey && world.mode === 'breakout') { checkpoint(journey, world.carry()); saveJourney(journey); }
      }, () => {}, journey && world.mode === 'breakout' && world.bk?.def.port ? courseFor(journey) : null);
    } else if (world.phase === 'over' && !reported && world.mode === 'breakout' && journey) {
      reported = true;
      sortieOver();
    } else if (world.phase === 'over' && !reported) {
      reported = true;
      input.reset();
      const rec = recordRun(profile, world.run);
      summary.show(world.run, rec, () => {
        world.restart({ unlocked: grants(profile), modifiers: profile.modifiers, mode: profile.mode });
        showMode();
        reported = false;
        startOpts.render();
        hud.note(world, `${t('Run begins')} · ${t(world.hull.name)}`);
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
    if (refit.open || bay.open || comms.open || port.open || chart.open || ending.open || !el('summary').hidden) {
      const p = padNav.poll();
      if (refit.open) refit.padInput(p);
      else if (bay.open) bay.padInput(p);
      else if (comms.open) comms.padInput(p);
      else if (port.open) port.padInput(p);
      else if (chart.open && journey) chart.padInput(p, journey);
      else if (ending.open) ending.padInput(p);
      else summary.padInput(p);
    }
    // a full rail: a beat of slow motion before the panel
    loop.timeScale = world.celebrate > 0 ? 0.3 : 1;
    // a panel that stops the run takes the screen: the HUD steps back
    document.documentElement.classList.toggle('panel-open', panelOpen());
  };

  // ── the refit bay ──────────────────────────────────────────────────────
  // B, a pad's Back, or the touch button. The arcade only, never mid-fight:
  // the HUD says why when it will not open.
  const openBay = () => {
    if (!started || panelOpen() || world.bk) return;
    const why = world.bayClosed();
    if (why === 'danger') { hud.note(world, t('Not with hostiles close'), 'hit'); return; }
    if (why) return;
    setPaused(false);
    world.openBay();
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
  /** Launch from the start card: the arcade, a new journey, or (`resume`) the saved one. */
  const launch = (mode: 'breakout' | 'arcade' = 'breakout', resume = false) => {
    if (started) return;
    if (mode !== profile.mode) {
      profile.mode = mode;
      saveProfile(profile);
    }
    started = true;
    el('start').hidden = true;
    document.documentElement.classList.remove('prelaunch');
    fullscreen();
    window.focus();
    fit();
    setPaused(false);
    if (mode === 'arcade') {
      if (world.mode !== 'arcade') { world.restart({ modifiers: profile.modifiers, mode, carry: null }); showMode(); }
      hud.note(world, `${t('Run begins')} · ${t(world.hull.name)}`);
      // how to play first: the pause card, until any key or tap
      setPaused(true);
      return;
    }
    if (!resume || !journey || (journey.status === 'over' && !pending(journey))) {
      // a journey left at the Threshold still goes into the Archive, the file unchosen
      if (journey && pending(journey)) recordJourney(profile, journeyRecord(journey));
      journey = newJourney(Math.floor(Math.random() * 1e9));
      saveJourney(journey);
    } else if (pending(journey)) return threshold(journey, [t('Journey resumed · the Threshold is behind you')]);
    else if (journey.status === 'chart') return openChart([t('Journey resumed · drive cool, plot the next jump')]);
    startSortie();
    setPaused(true);
  };

  const input = new Input(
    {
      layer: el('touch'), stick: el('stick'), knob: el('knob'), fire: el('fire'), torpedo: el('torp'), release: el('release'), cut: el('cut'),
    },
    () => (started ? (panelOpen() ? undefined : setPaused(!loop.paused)) : launch(pick, pick === 'breakout')),
    () => openBay(),
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
  // dev server only: a handle for tools/shots.mjs to put any screen up
  if (import.meta.env.DEV) Object.assign(window, { wayward: { world, loop, launch, openChart, get journey() { return journey; } } });

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

  const go = () => launch(pick, pick === 'breakout');
  const press = (id: string, f: () => void) => {
    el(id).addEventListener('click', (e) => { e.stopPropagation(); f(); });
    el(id).addEventListener('pointerdown', (e) => e.stopPropagation());
  };
  press('launch', go);
  press('fresh', () => launch('breakout'));
  press('mode-arcade', () => choose('arcade'));
  press('mode-story', () => choose('breakout'));
  el('start').addEventListener('pointerdown', (e) => {
    if (startOpts.logbookOpen) return;
    e.preventDefault();
    go();
  });

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (!started) {
      if (startOpts.logbookOpen) { if (e.code === 'Escape') startOpts.logbook(false); return; }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { choose(pick === 'arcade' ? 'breakout' : 'arcade'); el(pick === 'arcade' ? 'mode-arcade' : 'mode-story').focus(); return; }
      // Enter on a focused button presses that button; anywhere else it starts the picked mode
      if ((e.code === 'Enter' || e.code === 'Space') && !(e.target instanceof HTMLButtonElement)) go();
      return;
    }
    if (panelOpen()) return;
    if (e.code === 'Tab') e.preventDefault();
    // Any key resumes, except the pause keys themselves: Input has already
    // toggled on those, and answering them here as well would undo it.
    if (loop.paused && !PAUSE_KEYS.includes(e.code)) setPaused(false);
    if (e.code === 'KeyB') openBay();
    if (e.code === 'KeyZ') zoom(sector.rig.zoom === ZOOMS.length - 1 ? -sector.rig.zoom : 1); // cycles round
    if (e.code === 'Minus') zoom(1);
    if (e.code === 'Equal') zoom(-1);
  });

  // Leaving the tab or the window pauses, as in the original. Coming back
  // waits for the player: a key or a tap resumes.
  const away = () => { if (started) setPaused(true); };
  // A phone can take the GPU back while the page sleeps. Without preventDefault
  // the canvas stays black for good; with it, three.js rebuilds on restore.
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); away(); });
  canvas.addEventListener('webglcontextrestored', fit);
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
  el('bay-b').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openBay();
  });
  el('pause').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    setPaused(false);
  });
  // iOS Safari ignores user-scalable=no for pinch zoom; this is what stops it.
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // Development only: lets an automated check step the loop while the tab is
  // hidden (no animation frames) and read the state back. Stripped from builds.
  if (import.meta.env.DEV) Object.assign(window, { __ab: { world, loop, sector, renderer, input, launch, hud, profile, journey: () => journey, clearJourney } });

  loop.start();
}

boot();
