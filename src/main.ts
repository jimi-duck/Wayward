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
import { chapterSave, clearJourney, exportJourney, hasBackup, importJourney, loadJourney, restartChapter, restoreJourney, saveJourney, saveUnreadable } from './meta/save';
import { recap } from './sim/chapters';
import { SURVIVAL } from './content/survival';
import { bankAnswer, checkpoint, debrief, endSortie, hearNews, here, newJourney, options, plot, replot, sortieDef, tally, type Journey, type Outcome, type Tally } from './sim/journey';
import { sysById } from './sim/chart';
import { journeyRecord, pending } from './sim/endings';
import { EndingPanel } from './ui/ending';
import { ChartPanel } from './ui/chart';
import { barsOut } from './ui/bars';
import { Hud } from './ui/hud';
import { DebugOverlay } from './ui/debug';
import { PadNav } from './ui/dom';
import { cardView, CommsPanel, hailView } from './ui/comms';
import { StartOptions, SummaryPanel } from './ui/panels';
import { PortPanel } from './ui/port';
import { BayPanel } from './ui/bay';
import { showConsole } from './ui/briefing';
import { Feel } from './audio/audio';
import { detect, loadDe, localize, onLang, plural, setLang, t } from './i18n';

/** New Story journeys run the eight regions (docs/SCALE-UP.md); ?short plays the old three, for testing. */
const LONG_JOURNEY = !new URLSearchParams(location.search).has('short');

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

  // The pilot's record between runs: bests, unlocks, the survival mode chosen for the next run.
  const profile = loadProfile();
  const world = new World(Math.floor(Math.random() * 1e9), { unlocked: grants(profile), survival: profile.survival, mode: profile.mode });
  const showMode = () => document.documentElement.classList.toggle('breakout', world.mode === 'breakout');
  showMode();
  const renderer = createRenderer(canvas, quality.tier);
  const sector = new Sector(renderer, quality.tier);
  sector.setCosmetic(profile.cosmetic);
  const debug = new DebugOverlay(el('debug'), params.get('debug') === '1');

  const feel = new Feel();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  sector.reduceMotion = feel.reduceMotion = motion.matches;
  motion.addEventListener('change', (e) => { sector.reduceMotion = feel.reduceMotion = e.matches; });

  // ── zoom ───────────────────────────────────────────────────────────────
  // the middle distance by default: room to see what is coming; the choice is remembered
  sector.rig.zoom = clamp(Math.round(profile.zoom), 0, ZOOMS.length - 1);
  const zoom = (dir: number) => {
    sector.rig.zoom = clamp(sector.rig.zoom + dir, 0, ZOOMS.length - 1);
    profile.zoom = sector.rig.zoom;
    saveProfile(profile);
  };
  const hud = new Hud();

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

  // ── the run's stops: the bay, comms, port, report ──────────────────────
  // The world pauses itself at each and waits (an ambush only slows it); the
  // panels answer it. The comms panel draws both a Breakout card and the
  // arcade's capital-ship hail.
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
  const panelOpen = () => bay.open || comms.open || port.open || chart.open || ending.open || world.phase === 'dock' || !el('summary').hidden || startOpts.logbookOpen;

  // ── the journey ────────────────────────────────────────────────────────
  // The Breakout mode is a journey: system after system, with the chart
  // between them. It is saved between systems and at every port, so the
  // start card can carry on where the last session left off.
  let journey: Journey | null = loadJourney();
  // The title offers two ways to play, Arcade picked whenever the game opens;
  // Story mode carries on a saved journey, with a fresh one a click below.
  let pick: 'arcade' | 'breakout' = 'arcade';
  /** Where a saved journey would carry on, in one line: the day, the system, the lane plotted, the wrecks. */
  const resumeLine = (j: Journey) => {
    const day = t('Day {n}', { n: Math.floor(j.day) + 1 });
    if (pending(j)) return `${day} · ${t('through the Threshold · the file is still aboard')}`;
    return [day, t(SURVIVAL[j.survival].name), j.dest ? `${here(j).name} → ${sysById(j.chart, j.dest).name}` : here(j).name].join(' · ');
  };
  /** Start game replaces a saved journey only on a second press: the first arms it and says so. */
  let armed = false;
  let disarm = 0;
  const paintLaunch = (replaces: boolean) => {
    const what = `${t(pick === 'arcade' ? 'Arcade' : 'Story')} · ${t(SURVIVAL[profile.survival].name)}`;
    el('launch').classList.toggle('armed', armed);
    el('launch-s').textContent = armed ? t('Press again to replace your save') : replaces ? `${what} · ${t('New journey')}` : what;
    el('launch-t').textContent = armed ? t('Start a new journey?') : t('Start game');
  };
  const showResume = () => {
    const live = journey && (journey.status !== 'over' || pending(journey)) ? journey : null;
    const j = pick === 'breakout' ? live : null;
    el('mode-arcade').setAttribute('aria-checked', String(pick === 'arcade'));
    el('mode-story').setAttribute('aria-checked', String(pick === 'breakout'));
    // a saved journey is a small card above the picks, in either mode; Start game below is always a new one
    el('cont').hidden = !live;
    if (live) el('cont-s').textContent = resumeLine(live);
    armed = false;
    // the chapter just begun, and the way back to its gate (not in Hardcore, where nothing is taken back)
    const rc = j ? recap(j) : null;
    const box = el('recap');
    box.hidden = !rc;
    box.replaceChildren();
    if (rc) {
      const head = document.createElement('b');
      head.textContent = rc.name;
      box.append(head, ...[plural(rc.days, '{n} day', '{n} days'), plural(rc.stops, '{n} stop', '{n} stops'), ...rc.changes].map((c) => Object.assign(document.createElement('span'), { className: 'chip', textContent: c })));
    }
    const snap = j && !j.hardcore ? chapterSave() : null;
    el('chapter').hidden = !snap || !j || snap.day >= j.day;
    paintLaunch(!!j);
    // a save that could not be read is said so, with the safety copy on offer if there is one
    const bad = saveUnreadable() && !journey;
    el('save-problem').textContent = t('Your saved journey could not be read.');
    el('save-problem').hidden = !bad;
    el('restore').hidden = !bad || !hasBackup();
    renderSaves(live);
  };
  /** Export the saved journey to a file, or bring one back from a file. */
  const renderSaves = (live: Journey | null) => {
    const box = el('saves');
    // only the Story has a save to bring in or take out
    box.hidden = pick !== 'breakout';
    const btn = (label: string, f: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t(label);
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => { e.stopPropagation(); f(); });
      return b;
    };
    const out: HTMLElement[] = [];
    if (live) {
      out.push(btn('Export save', () => {
        const url = URL.createObjectURL(new Blob([exportJourney(live)], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `wayward-day-${Math.floor(live.day) + 1}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }));
    }
    out.push(btn('Import save', () => {
      const pickFile = document.createElement('input');
      pickFile.type = 'file';
      pickFile.accept = 'application/json,.json';
      pickFile.addEventListener('change', async () => {
        const text = await pickFile.files?.[0]?.text();
        const j = text ? importJourney(text) : null;
        if (j) { journey = j; showResume(); startOpts.render(); } else el('save-problem').textContent = t('That file is not a Wayward save.'), el('save-problem').hidden = false;
      });
      pickFile.click();
    }));
    box.replaceChildren(...out);
  };
  const choose = (mode: 'arcade' | 'breakout') => { pick = mode; showResume(); };
  showResume();
  /** The stocks and the day as this system began, to show what it changed. */
  let sortieStart: Tally | null = null;
  /** Fly the journey's current system. */
  const startSortie = () => {
    const j = journey!;
    sortieStart = tally(j);
    world.restart({ unlocked: grants(profile), mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
    // a new journey carries 99 plates for "full": the ship's own count is the start to compare with
    sortieStart = { ...sortieStart, plates: world.plates };
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
        id: o.to.id, name: o.to.name, cyrite: o.route.cyrite, days: o.route.days,
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
        journey = newJourney(Math.floor(Math.random() * 1e9), false, LONG_JOURNEY ? 'eight' : 'three', profile.survival);
        saveJourney(journey);
      }
      startSortie();
    });
  };
  /** Through the Threshold: what the file is worth, its epilogue, then how the journey went. */
  const threshold = (j: Journey, lines: string[]) => {
    loop.paused = true;
    input.reset();
    feel.win();
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
    chart.debrief(sortieStart ? debrief(sortieStart, j) : []);
    const lines = [...out.lines, ...rec.unlocked.map((u) => `${t('Unlocked')} · ${t(u.name)}`)];
    if (out.kind === 'jumped') return openChart(lines);
    if (pending(j)) return threshold(j, lines);
    noticeOf(j, { ...out, lines });
  };
  const startOpts = new StartOptions(profile, () => {
    saveProfile(profile);
    sector.setCosmetic(profile.cosmetic);
    // before the first launch nothing has happened yet, so the run can be re-made in the new survival mode
    if (!started) world.restart({ survival: profile.survival, mode: profile.mode });
    showBrief();
    showResume();
  }, () => (journey && (journey.status !== 'over' || pending(journey)) ? journey.survival : null));
  // a new language: the page, then whatever the start card drew itself
  onLang(() => { localize(); showResume(); startOpts.render(); hud.relabel(); });
  const stops = () => {
    if (world.phase === 'bay' && !bay.open) {
      // the refit bay: the player opened it, and the world waits until they launch (or go back to the dock)
      input.reset();
      bay.show(world, () => { world.closeBay(); input.reset(); if (world.phase === 'play') hud.note(world, t('Launched')); });
    } else if (world.phase === 'hail' && world.command.pending && !comms.open) {
      input.reset();
      shown = world.command.pending;
      comms.show(hailView(world.command.pending), (i) => { world.answerHail(i === 0); input.reset(); });
    } else if (world.phase === 'comms' && world.comms && !comms.open) {
      input.reset();
      shown = world.comms;
      comms.show(cardView(world.comms), (i) => {
        // the answer is banked in the journey now, so a closed tab does not take it back
        const before = world.carry();
        world.answer(i);
        if (journey && world.mode === 'breakout' && journey.status === 'sortie') { bankAnswer(journey, before, world.carry()); saveJourney(journey); }
        input.reset();
      });
    } else if (world.phase === 'dock' && !port.open) {
      // docked at the port, or back from its refit bay
      input.reset();
      port.show(world, () => {
        input.reset();
        hud.note(world, `${t('Cast off')} · ${t('Saved')}`);
        // the save at the port: a load starts this system again with the hold as it is now
        if (journey && world.mode === 'breakout') { checkpoint(journey, world.carry()); saveJourney(journey); }
      }, () => { world.openBay(); input.reset(); }, journey && world.mode === 'breakout' && world.bk?.def.port ? courseFor(journey) : null);
    } else if (world.phase === 'over' && !reported && world.mode === 'breakout' && journey) {
      reported = true;
      sortieOver();
    } else if (world.phase === 'over' && !reported) {
      reported = true;
      input.reset();
      const rec = recordRun(profile, world.run);
      summary.show(world.run, rec, () => {
        world.restart({ unlocked: grants(profile), survival: profile.survival, mode: profile.mode });
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
    if (bay.open || comms.open || port.open || chart.open || ending.open || !el('summary').hidden) {
      const p = padNav.poll();
      if (bay.open) bay.padInput(p);
      else if (comms.open) comms.padInput(p);
      else if (port.open) port.padInput(p);
      else if (chart.open && journey) chart.padInput(p, journey);
      else if (ending.open) ending.padInput(p);
      else summary.padInput(p);
    }
    // a panel that stops the run takes the screen: the HUD steps back
    document.documentElement.classList.toggle('panel-open', panelOpen());
  };

  // ── the refit bay ──────────────────────────────────────────────────────
  // B, a pad's Back, the HUD's badge, or the pause card's button. In
  // flight while the alert is clear, and always at a port; not in battle (the HUD's state says which), and
  // when it will not open the HUD says why in a line.
  const openBay = () => {
    if (!started || comms.open || port.open || chart.open || ending.open || bay.open) return;
    const why = world.bayClosed();
    if (why) { hud.bayDenied(world, why); return; }
    setPaused(false);
    world.openBay();
  };
  hud.onBay = openBay;

  // ── start, pause ───────────────────────────────────────────────────────
  // The run waits behind the start card, so the first key or tap is the one
  // that launches, and in an embedded frame that click also gives the page
  // keyboard focus.
  let started = false;
  /** The pause card has been up since the launch: only a resume from it counts as the briefing read. */
  let carded = false;
  document.documentElement.classList.add('prelaunch');
  const setPaused = (on: boolean) => {
    // the first stop of the first run is the briefing; once read, it is the pause card
    if (!on && loop.paused && started && carded && !profile.briefed) { profile.briefed = true; saveProfile(profile); }
    if (on && started) carded = true;
    loop.paused = on;
    if (on) showSettings(false);
    document.documentElement.classList.toggle('paused', on && started);
    if (on) {
      input.reset();
      showBrief();
      showConsole(world);
    }
  };
  /** The pause card's other face: sound, buzz and camera, kept off the card that explains the game. */
  const settingsOpen = () => el('pause').classList.contains('settings-on');
  const showSettings = (on: boolean) => {
    el('pause').classList.toggle('settings-on', on);
    showBrief();
    if (on) el('p-back').focus({ preventScroll: true });
  };
  /** The briefing's live parts: its title, the bay's count, the settings' switches. */
  const showBrief = () => {
    const first = !profile.briefed;
    el('pause').classList.toggle('first', first);
    el('pause-t').textContent = t(settingsOpen() ? 'Settings' : first ? 'Briefing' : 'All stop');
    for (const [id, on] of [['p-sound', feel.prefs.sound], ['p-buzz', feel.prefs.haptics]] as const) {
      el(id).classList.toggle('on', on);
      el(id).setAttribute('aria-pressed', String(on));
      el(`${id}-v`).textContent = t(on ? 'On' : 'Off');
    }
    el('p-buzz-r').hidden = !feel.canBuzz;
    el('p-paint-r').hidden = !el('paint').childElementCount;
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
      if (world.mode !== 'arcade' || world.survival.id !== profile.survival) { world.restart({ survival: profile.survival, mode, carry: null }); showMode(); }
      hud.note(world, `${t('Run begins')} · ${t(world.hull.name)}`);
      // how to play first: the pause card, until any key or tap
      setPaused(true);
      return;
    }
    if (!resume || !journey || (journey.status === 'over' && !pending(journey))) {
      // a journey left at the Threshold still goes into the Archive, the file unchosen
      if (journey && pending(journey)) recordJourney(profile, journeyRecord(journey));
      journey = newJourney(Math.floor(Math.random() * 1e9), false, LONG_JOURNEY ? 'eight' : 'three', profile.survival);
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
    () => (started ? (panelOpen() ? undefined : settingsOpen() ? showSettings(false) : setPaused(!loop.paused)) : launch(pick, pick === 'breakout')),
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
      feel.events(events);
      sector.console = bay.open ? bay.zone : loop.paused && started ? 'brief' : null;
      sector.frame(world, alpha, dt, frameDt);
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
  if (import.meta.env.DEV) Object.assign(window, { wayward: { world, loop, launch, openChart, chart, get journey() { return journey; } } });

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

  // Enter or a tap off the buttons: Arcade starts, Story carries on a saved journey or begins one
  const go = () => launch(pick, pick === 'breakout');
  const press = (id: string, f: () => void) => {
    el(id).addEventListener('click', (e) => { e.stopPropagation(); f(); });
    el(id).addEventListener('pointerdown', (e) => e.stopPropagation());
  };
  press('launch', () => {
    const live = journey && (journey.status !== 'over' || pending(journey));
    if (pick === 'arcade' || !live || armed) return launch(pick);
    armed = true;
    paintLaunch(true);
    clearTimeout(disarm);
    disarm = window.setTimeout(() => { armed = false; paintLaunch(true); }, 4000);
  });
  press('chapter', () => { const j = restartChapter(); if (j) { journey = j; showResume(); } });
  press('cont', () => launch('breakout', true));
  press('restore', () => { const j = restoreJourney(); if (j) { journey = j; pick = 'breakout'; showResume(); } });
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
      // in the difficulty row the arrows step through Easy, Normal, Hard; anywhere else they swap the mode
      const inDifs = e.target instanceof Element && e.target.closest('#mods');
      if (inDifs && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
        const all = [...document.querySelectorAll<HTMLButtonElement>('#mods button')];
        const at = all.findIndex((b) => b.getAttribute('aria-checked') === 'true');
        all[Math.max(0, Math.min(all.length - 1, at + (e.code === 'ArrowRight' ? 1 : -1)))]?.click();
        document.querySelector<HTMLButtonElement>('#mods button[aria-checked="true"]')?.focus();
        return;
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { choose(pick === 'arcade' ? 'breakout' : 'arcade'); el(pick === 'arcade' ? 'mode-arcade' : 'mode-story').focus(); return; }
      // Enter on a focused button presses that button; anywhere else it starts the picked mode
      if ((e.code === 'Enter' || e.code === 'Space') && !(e.target instanceof HTMLButtonElement)) go();
      return;
    }
    if (panelOpen()) return;
    if (e.code === 'Tab') e.preventDefault();
    // Any key resumes, except the pause keys themselves: Input has already
    // toggled on those, and answering them here as well would undo it.
    // in Settings a key does not resume: Backspace goes back, the pause keys are Input's
    if (settingsOpen()) { if (e.code === 'Backspace') showSettings(false); return; }
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
  el('pause').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (settingsOpen()) showSettings(false);
    else setPaused(false);
  });
  // the briefing's buttons answer themselves, without resuming underneath
  const act = (id: string, f: () => void) => {
    el(id).addEventListener('pointerdown', (e) => e.stopPropagation());
    el(id).addEventListener('click', (e) => { e.stopPropagation(); f(); });
  };
  act('p-set', () => showSettings(true));
  act('p-back', () => showSettings(false));
  act('p-sound', () => { feel.setSound(!feel.prefs.sound); showBrief(); });
  act('p-buzz', () => { feel.setHaptics(!feel.prefs.haptics); showBrief(); });
  act('p-go', () => setPaused(false));
  // Story mode: the journey is saved as it stands (the last chart or dock), and the page reloads to the title
  act('p-exit', () => {
    if (journey && world.mode === 'breakout') saveJourney(journey);
    location.reload();
  });
  // iOS Safari ignores user-scalable=no for pinch zoom; this is what stops it.
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // Development only: lets an automated check step the loop while the tab is
  // hidden (no animation frames) and read the state back. Stripped from builds.
  if (import.meta.env.DEV) Object.assign(window, { __ab: { world, loop, sector, renderer, input, launch, hud, profile, journey: () => journey, clearJourney } });

  loop.start();
}

// German players wait for their dictionary; everyone else starts at once
(detect() === 'de' ? loadDe() : Promise.resolve()).then(boot);
