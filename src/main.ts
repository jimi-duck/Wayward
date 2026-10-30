import WebGL from 'three/addons/capabilities/WebGL.js';
import { clamp } from './core/math';
import { FixedStepLoop } from './core/loop';
import { Input } from './input/input';
import { PAUSE_KEYS } from './input/keyboard';
import { ZOOMS } from './render/camera';
import { QualityGovernor, tierIndex } from './render/quality';
import { createRenderer, fitRenderer, matchTier } from './render/renderer';
import { Sector } from './render/sector';
import { lockLifted } from './sim/postjump';
import { World } from './sim/world';
import { grants, loadProfile, recordJourney, recordRun, saveProfile } from './meta/profile';
import { chapterSave, clearJourney, exportJourney, hasBackup, importJourney, loadJourney, restartChapter, restoreJourney, saveJourney, saveUnreadable } from './meta/save';
import { recap } from './sim/chapters';
import { bounty } from './sim/mission';
import { cy } from './sim/purse';
import { FEATURES } from './content/features';
import { ARCADE_SURVIVAL, SURVIVAL } from './content/survival';
import { autoCourse, bankAnswer, checkpoint, debrief, endSortie, hearNews, here, newJourney, options, plot, sortieDef, tally, type Journey, type Outcome, type Tally } from './sim/journey';
import { regionsOf, routeBetween, sysById } from './sim/chart';
import { journeyRecord, pending } from './sim/endings';
import { EndingPanel } from './ui/ending';
import { HeatNote } from './ui/heatnote';
import { JobDone } from './ui/jobdone';
import type { GameEvent } from './sim/events';
import { Cutscene } from './ui/adrift';
import { ChartPanel, regionName } from './ui/chart';
import { CoursePanel } from './ui/course';
import { barsOut } from './ui/bars';
import { Hud } from './ui/hud';
import { DebugOverlay } from './ui/debug';
import { Radio, type JobTerms } from './ui/radio';
import type { Open } from './sim/comms';
import { PadNav } from './ui/dom';
import { cardView, CommsPanel, hailView } from './ui/comms';
import { StartOptions, SummaryPanel } from './ui/panels';
import { PortPanel, preloadPort } from './ui/port';
import { BayPanel } from './ui/bay';
import { showConsole } from './ui/briefing';
import { Feel, SOUND_AVAILABLE } from './audio/audio';
import type { RegionSet } from './content/regions';
import { installCrashCard } from './ui/crash';
import { detect, loadDe, localize, num, onLang, plural, setLang, t } from './i18n';

/** New Story journeys run the eight regions; ?short plays the old three, for testing. */
/** Frames the quality governor ignores after a new system or a closed panel (two seconds at 60 fps). */
const GRACE = 120;
const LONG_JOURNEY = !new URLSearchParams(location.search).has('short');
/** The Story is the Warden's Road: Cerro to the Threshold as fixed stops (docs/ROAD.md). ?classic plays the generated eight-region chart instead, for comparing. */
const ROAD = !new URLSearchParams(location.search).has('classic');
/** The region table a new Story journey is laid out with. */
const NEW_SET: RegionSet = !LONG_JOURNEY ? 'three' : ROAD ? 'road' : 'eight';
/** `?train` plays the training whether or not it has been played (to look at it). */
const TRAIN = new URLSearchParams(location.search).has('train');

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} is missing from index.html`);
  return node as T;
}

function boot(review: typeof import('./review') | null): void {
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
  // ?dev is the review world (docs/REVIEW.md): a gallery of everything in the game, flown without risk, and nothing it does is saved
  const dev = review !== null;
  const persist = (p: typeof profile) => { if (!dev) saveProfile(p); };
  const world = new World(Math.floor(Math.random() * 1e9), { unlocked: grants(profile), survival: dev || profile.mode === 'arcade' ? ARCADE_SURVIVAL : profile.survival, mode: dev ? 'arcade' : profile.mode, space: !params.has('nospace'), review: dev });
  const showMode = () => document.documentElement.classList.toggle('breakout', world.mode === 'breakout');
  showMode();
  const renderer = createRenderer(canvas, quality.tier);
  const sector = new Sector(renderer, quality.tier);
  sector.setCosmetic(profile.cosmetic);
  const debug = new DebugOverlay(el('debug'), params.get('debug') === '1');
  // `?debug=1` also leaves the world on window, for the screenshot scripts
  if (params.get('debug') === '1') (window as unknown as { __world: World }).__world = world;

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
    persist(profile);
  };
  const hud = new Hud();
  const tour = review ? review.startReview(el('app'), world, sector) : null;

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
  // The sky of the run about to begin (Arcade makes a new one every run) is painted behind the title, after the next
  // frame has shown the card, so the first frame of play does not pay for it.
  const stageSky = () => setTimeout(() => { if (!started) sector.stageSky(world); }, 120);
  // compile every shader behind the start card, once it has painted
  setTimeout(() => void sector.warm().then(() => {
    if (started) return;
    // Arcade is the title's first row and starts at a tap, so its run is made now: the world, then its sky
    if (world.mode !== 'arcade' || world.survival.id !== ARCADE_SURVIVAL) world.restart({ survival: ARCADE_SURVIVAL, mode: 'arcade', carry: null });
    sector.stageSky(world);
    sector.warmFrame();
  }), 60);

  // ── the run's stops: the bay, comms, port, report ──────────────────────
  // The world pauses itself at each and waits (an ambush only slows it); the
  // panels answer it. The comms panel draws both a Breakout card and the
  // arcade's capital-ship hail.
  const comms = new CommsPanel();
  /** What a job's call can say of its terms: the pay at this depth and the time it allows, read from the scene the call opens. */
  const jobTerms = (o: Open): JobTerms | null => {
    const st = world.stage, win = st?.def.win;
    if (!st || st.def.card !== o.def.id || !win) return null;
    const pay = bounty(win, world.pay);
    const cyrite = cy(typeof pay.chits === 'number' ? pay.chits : 0) + (typeof pay.cyrite === 'number' ? pay.cyrite : 0);
    const supplies = typeof pay.supplies === 'number' ? pay.supplies : 0;
    return { reward: [...(cyrite > 0 ? [t('Up to {n} Cyrite', { n: num(cyrite) })] : []), ...(supplies > 0 ? [t('+{n} supplies', { n: supplies })] : [])], limit: st.def.goal.limit ?? 0 };
  };
  const radio = new Radio((id) => radioAnswer(id), () => radioBlocked(), jobTerms);
  /** The card the comms panel is showing, so a slowed card that timed out can be taken down. */
  let shown: object | null = null;
  const summary = new SummaryPanel();
  const port = new PortPanel();
  const chart = new ChartPanel();
  const course = new CoursePanel();
  // `?debug=1` also leaves the chart and the journey on window, for the screenshot scripts
  if (params.get('debug') === '1') (window as unknown as { __ui: unknown }).__ui = { chart, course, journey: () => journey };
  const ending = new EndingPanel();
  const heatNote = new HeatNote();
  const jobDone = new JobDone();
  /** Jobs paid at a port, waiting for their pop-up (one at a time). */
  const jobsPaid: Array<Extract<GameEvent, { type: 'jobDone' }>> = [];
  const cut = new Cutscene();
  const bay = new BayPanel();
  const padNav = new PadNav();
  let reported = false;
  const panelOpen = () => cut.open || bay.open || comms.open || port.open || chart.open || course.open || ending.open || heatNote.open || jobDone.open || world.phase === 'dock' || !el('summary').hidden || startOpts.logbookOpen;
  // the radio's calls ride along while the ship flies: answered by key or tap, banked in the journey like any card
  /** A call that asks for an answer holds the world still, like every other pop-up; it lets go when it is answered or lapses. */
  let callHold = false;
  const radioBlocked = () => !started || (loop.paused && !callHold) || panelOpen();
  const radioAnswer = (id: string) => {
    const before = world.carry();
    if (!world.answer(id)) return;
    if (journey && world.mode === 'breakout' && journey.status === 'sortie') { bankAnswer(journey, before, world.carry()); saveJourney(journey); }
  };

  // ── the journey ────────────────────────────────────────────────────────
  // The Breakout mode is a journey: system after system, with the chart
  // between them. It is saved between systems and at every port, so the
  // start card can carry on where the last session left off.
  let journey: Journey | null = loadJourney();
  // The title offers two ways to play, Arcade picked whenever the game opens (it starts at once, on one fixed difficulty);
  // Story mode carries on a saved journey, with a fresh one a click below.
  let pick: 'arcade' | 'breakout' = 'breakout';
  /** The title is a plain list; Arcade and New journey lead to one step more (the difficulty, Normal ready), Settings to another. */
  type Step = 'menu' | 'diff' | 'set';
  let step: Step = 'menu';
  const liveJourney = () => (journey && (journey.status !== 'over' || pending(journey)) ? journey : null);
  /** The rows on screen now, top to bottom: the list, or the step's own. */
  const rows = () => [...document.querySelectorAll<HTMLElement>(step === 'menu' ? '#st-menu .st-row:not([hidden])' : step === 'diff' ? '#st-diff .st-row:not([hidden])' : '#st-set .st-row:not([hidden]), #lang button')].filter((b) => !b.closest('[hidden]'));
  const paintStep = () => {
    el('st-menu').hidden = step !== 'menu';
    el('st-diff').hidden = step !== 'diff';
    el('st-set').hidden = step !== 'set';
    // the chapter's recap and the save notes belong to the list, not to a step
    for (const id of ['recap', 'chapter', 'save-problem', 'restore']) el(id).classList.toggle('st-quiet', step !== 'menu');
    el('st-trip').classList.toggle('st-quiet', step !== 'menu');
  };
  const showStep = (to: Step, focus = true) => {
    step = to;
    showResume();
    if (!focus) return;
    // the step opens on its natural row: Normal for difficulty, Begin is one Down away
    const first = to === 'diff' ? document.querySelector<HTMLElement>('#mods .dif[aria-checked="true"]') : rows()[0];
    (first ?? rows()[0])?.focus({ preventScroll: true });
  };
  /** A New journey over a saved one: say so before it is begun, never after. */
  const paintWarn = () => {
    const warn = el('sv-keep');
    warn.hidden = !(pick === 'breakout' && liveJourney());
    warn.textContent = t('This will replace your saved journey.');
  };
  /** Where the journey stands, in two quiet lines under the word: the region and day, then the next stop. */
  const paintJourney = (live: Journey | null) => {
    const trip = el('st-trip');
    trip.hidden = !live;
    if (!live) return;
    const at = here(live), rn = regionName(live.chart, live.at);
    const dest = live.dest ? sysById(live.chart, live.dest) : null;
    const lane = dest ? routeBetween(live.chart, live.at, dest.id) : null;
    const line = (k: string, v: string) => {
      const row = document.createElement('span');
      row.className = 'st-tl';
      row.append(Object.assign(document.createElement('i'), { textContent: k }), Object.assign(document.createElement('b'), { textContent: v }));
      return row;
    };
    trip.replaceChildren(
      line(t('Current journey'), `${rn || at.name} · ${t('Day {n}', { n: Math.floor(live.day) + 1 })}`),
      line(t('Next stop'), dest ? `${dest.name}${lane ? ` · ${plural(lane.days, '{n} day', '{n} days')}` : ''}` : t('Plot the next jump')),
    );
  };
  const showResume = () => {
    const live = liveJourney();
    const j = live;
    el('sv-rule').hidden = pick !== 'breakout';
    // a saved journey is the first row of the list, and the panels on the right
    el('m-continue').hidden = !live;
    paintStep();
    paintJourney(live);
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
    paintWarn();
    paintSwitches();
    // a save that could not be read is said so, with the safety copy on offer if there is one
    const bad = saveUnreadable() && !journey;
    el('save-problem').textContent = t('Your saved journey could not be read.');
    el('save-problem').hidden = !bad;
    el('restore').hidden = !bad || !hasBackup();
    renderSaves(live);
  };
  /** Settings on the title: sound and buzz, read from the same switches the pause card has. */
  const paintSwitches = () => {
    for (const [id, on] of [['s-sound', feel.prefs.sound], ['s-buzz', feel.prefs.haptics]] as const) {
      el(id).setAttribute('aria-pressed', String(on));
      el(`${id}-v`).textContent = t(on ? 'On' : 'Off');
    }
    el('s-sound').hidden = !SOUND_AVAILABLE;
    el('s-buzz').hidden = !feel.canBuzz;
  };
  /** Export the saved journey to a file, or bring one back from a file. */
  const renderSaves = (live: Journey | null) => {
    const box = el('saves');
    const btn = (label: string, f: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'st-row';
      b.append(Object.assign(document.createElement('span'), { className: 'st-t', textContent: t(label) }));
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
  el('st-ver').textContent = `WAYWARD · ${__BUILD__}`;
  showStep('menu');
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
    if (d.home) world.train(); // every new Story journey starts with the training
    hud.note(world, d.home ? t('Clear the yards · head for the Jump Gate') : d.first && !lockLifted(j.carry.flags) ? t('Dock at the company port') : `${d.name} · ${t('Need {n} jump fluid to jump to {dest}', { n: d.jumpCost, dest: t(d.dest) })}`);
  };
  /** Between systems: the chart, to plot the next jump. */
  const openChart = (lines: string[]) => {
    const j = journey!;
    loop.paused = true;
    input.reset();
    const go = (id: string) => {
      plot(j, id);
      saveJourney(j);
      startSortie();
    };
    // the Warden's Road (?road) shows the Course in the Reach, not the chart
    if (CoursePanel.applies(j)) course.show(j, go);
    else chart.plot(j, lines, go);
  };
  /** Docked: the lanes out of here, to plot again with the dockmaster's news in hand. */
  const courseFor = (j: Journey) => {
    if (world.carry().flags.includes('news')) hearNews(j);
    return {
      lanes: () => options(j).map((o) => ({
        id: o.to.id, name: o.to.name, cyrite: o.fuel, days: o.route.days,
        note: [o.netted ? t('the Net controls this system') : '', o.shadow ? t('Calloway was last seen there') : '', o.to.kind === 'edge' ? t('the way out') : ''].filter(Boolean).join(' · '),
      })),
      current: () => j.dest,
    };
  };
  /** A notice with one way on: adrift, or the journey's end (into the Archive, then a new journey). */
  const noticeOf = (j: Journey, out: Outcome) => {
    loop.paused = true;
    input.reset();
    if (j.status === 'over') recordJourney(profile, journeyRecord(j));
    chart.notice(j, out, () => {
      if (j.status === 'over') {
        journey = newJourney(Math.floor(Math.random() * 1e9), false, NEW_SET, profile.survival);
        saveJourney(journey);
        startSortie();
        // a new journey starts in flight: the HUD and the lessons carry it, no card first
        loop.paused = false;
        input.reset();
        return;
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
  /** The opening is lost before the Jump Gate (a wreck, or the raiders' offer taken): the whole level starts again, nothing kept. */
  const restartOpening = () => {
    startSortie();
    hud.note(world, t('Contract 08-441 starts again from the top'), 'hit');
  };
  const sortieOver = () => {
    const j = journey!;
    if (world.sortie.home && !world.run.escaped) return restartOpening();
    const rec = recordRun(profile, world.run);
    const out = endSortie(j, world.result());
    // the third wreck in a region: it is flown again from its gate
    if (out.kind === 'wrecked' && !j.hardcore) return regionLost(j);
    saveJourney(j);
    chart.debrief(sortieStart ? debrief(sortieStart, j) : []);
    const lines = [...out.lines, ...rec.unlocked.map((u) => `${t('Unlocked')} · ${t(u.name)}`)];
    // the first jump has one lane and nowhere to look: no chart, straight on
    if (out.kind === 'jumped') { if (autoCourse(j)) { saveJourney(j); return startSortie(); } return openChart(lines); }
    if (pending(j)) return threshold(j, lines);
    if (out.kind === 'adrift') {
      loop.paused = true;
      input.reset();
      return cut.play('adrift', () => noticeOf(j, { ...out, lines }));
    }
    noticeOf(j, { ...out, lines });
  };
  /** A total loss: back to the gate the region was entered by (the chapter save), or the start of the journey in the first. The Archive keeps nothing of it. */
  const regionLost = (j: Journey) => {
    const snap = chapterSave();
    const back = snap && snap.seed === j.seed ? snap : newJourney(j.seed, false, j.chart.regionSet ?? 'three', j.survival);
    journey = back;
    saveJourney(back);
    loop.paused = true;
    input.reset();
    cut.play('lost', () => {
      const where = regionName(back.chart, back.at);
      const lines = [snap ? t('Back at the gate of {region}, with the ship you had then.', { region: where }) : t('Back at the start of the run out of Cerro, with the ship you stole.'), t('What you missed there is still out there.')];
      chart.notice(back, { kind: 'lost', lines }, () => startSortie());
    });
  };
  const startOpts = new StartOptions(profile, () => {
    persist(profile);
    sector.setCosmetic(profile.cosmetic);
    // before the first launch nothing has happened yet, so the run can be re-made in the new survival mode
    if (!started) { world.restart({ survival: ARCADE_SURVIVAL, mode: 'arcade', carry: null }); stageSky(); }
    showBrief();
    showResume();
  }, () => launch(pick));
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
        if (world.redo && journey) { restartOpening(); input.reset(); return; }
        if (journey && world.mode === 'breakout' && journey.status === 'sortie') { bankAnswer(journey, before, world.carry()); saveJourney(journey); }
        input.reset();
      });
    } else if (world.phase === 'dock' && !port.open) {
      // docked at the port, or back from its refit bay
      input.reset();
      port.show(world, () => {
        input.reset();
        hud.note(world, `${t('Leave port')} · ${t('Saved')}`);
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
        world.restart({ unlocked: grants(profile), survival: profile.mode === 'arcade' ? ARCADE_SURVIVAL : profile.survival, mode: profile.mode });
        showMode();
        reported = false;
        startOpts.render();
        if (!profile.trained || TRAIN) world.train();
        hud.note(world, `${t('Journey started')} · ${t(world.hull.name)}`);
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
    if (cut.open || bay.open || comms.open || port.open || jobDone.open || chart.open || course.open || ending.open || !el('summary').hidden) {
      const p = padNav.poll();
      if (cut.open) cut.padInput(p);
      else if (bay.open) bay.padInput(p);
      else if (comms.open) comms.padInput(p);
      else if (port.open) port.padInput(p);
      else if (chart.open && journey) chart.padInput(p);
      else if (course.open) course.padInput(p);
      else if (jobDone.open) jobDone.padInput(p);
      else if (heatNote.open) heatNote.padInput(p);
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
    if (!started || comms.open || port.open || chart.open || course.open || ending.open || bay.open) return;
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
    if (!on && loop.paused && started && carded && !profile.briefed) { profile.briefed = true; persist(profile); }
    if (on && started) carded = true;
    callHold = false;
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
    // the arcade's card names the run; the Story's is the ship's "All stop"
    el('pause-t').textContent = t(settingsOpen() ? 'Settings' : document.documentElement.classList.contains('breakout') ? 'All stop' : 'Survive the waves');
    for (const [id, on] of [['p-sound', feel.prefs.sound], ['p-buzz', feel.prefs.haptics]] as const) {
      el(id).classList.toggle('on', on);
      el(id).setAttribute('aria-pressed', String(on));
      el(`${id}-v`).textContent = t(on ? 'On' : 'Off');
    }
    el('p-sound').closest('li')!.hidden = !SOUND_AVAILABLE;
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
      persist(profile);
    }
    started = true;
    setTimeout(preloadPort, 4000);
    el('start').hidden = true;
    document.documentElement.classList.remove('prelaunch');
    fullscreen();
    window.focus();
    fit();
    setPaused(false);
    if (mode === 'arcade') {
      if (world.mode !== 'arcade' || world.survival.id !== ARCADE_SURVIVAL) world.restart({ survival: ARCADE_SURVIVAL, mode, carry: null });
      showMode();
      hud.note(world, `${t('Journey started')} · ${t(world.hull.name)}`);
      // how to play first: the pause card, until any key or tap
      setPaused(true);
      return;
    }
    let fresh = false;
    if (!resume || !journey || (journey.status === 'over' && !pending(journey))) {
      fresh = true;
      // a journey left at the Threshold still goes into the Archive, the file unchosen
      if (journey && pending(journey)) recordJourney(profile, journeyRecord(journey));
      journey = newJourney(Math.floor(Math.random() * 1e9), false, NEW_SET, profile.survival);
      saveJourney(journey);
    } else if (pending(journey)) return threshold(journey, [t('Journey resumed · you have passed the Threshold')]);
    else if (journey.status === 'chart') return openChart([t('Journey resumed · drive cooled; plot your next jump')]);
    startSortie();
    // a new journey starts in flight at Cerro (opening chapter, sheet A): the HUD and the lessons carry it, no card first
    if (fresh) return setPaused(false);
    setPaused(true);
  };

  const input = new Input(
    {
      layer: el('touch'), stick: el('stick'), knob: el('knob'), fire: el('fire'), torpedo: el('torp'), brk: el('brk'),
    },
    () => (started ? (panelOpen() ? undefined : settingsOpen() ? showSettings(false) : setPaused(!loop.paused)) : menuEnter()),
    () => openBay(),
  );

  let lastRun: unknown = null, lastSystem = '', wasPaused = true, veil = 0;

  const loop = new FixedStepLoop({
    step(dt) {
      world.step(dt, input.sample());
      debug.step();
    },
    render(alpha, frameDt) {
      const dt = loop.paused ? 0 : frameDt;
      const events = world.drain();
      if (world.tutor?.done && !profile.trained) { profile.trained = true; persist(profile); hud.note(world, t(world.tutor.skipped ? 'Training skipped' : 'Training complete · you are ready to fly')); }
      // the Story explains the Heat bar once: when training is over (or there is none) and the opening chase is behind her, the first time flying free (out of the safe rings) with nothing else open;
      // past Cerro, not before the hull is reported stolen, so it explains the pursuit as it starts
      if (started && world.bk && !profile.heatTold && (!world.tutor || world.tutor.done) && !world.bk.chase && !world.beforeReport && world.phase === 'play' && !world.safe && world.alive && !loop.paused && !panelOpen()) {
        profile.heatTold = true;
        persist(profile);
        loop.paused = true;
        input.reset();
        heatNote.show(() => { loop.paused = false; input.reset(); });
      }
      // a kill lands harder for a beat of stillness (never with reduced motion)
      const hold = sector.react(events);
      if (hold > 0 && !sector.reduceMotion) loop.freeze(hold);
      hud.events(events, world);
      // a job paid at the port says so, in a pop-up that holds the world (the lane's are a quiet notice, hud.ts)
      for (const e of events) if (e.type === 'jobDone' && e.at === 'port') jobsPaid.push(e);
      if (jobsPaid.length && !jobDone.open && started) {
        const e = jobsPaid.shift()!;
        const was = loop.paused;
        loop.paused = true;
        input.reset();
        jobDone.show(e, () => { loop.paused = was; input.reset(); });
      }
      feel.events(events);
      radio.events(events);
      if (started && world.call && !callHold && !loop.paused && !panelOpen()) { callHold = true; loop.paused = true; input.reset(); }
      else if (callHold && !world.call) { callHold = false; if (!panelOpen()) { loop.paused = false; input.reset(); } }
      radio.sync(world.call, world.callUntil - world.runTime);
      // the title covers the canvas and the HUD: nothing to draw until the first launch
      if (!started) return;
      const there = world.air.from[0];
      feel.bed(there && !loop.paused ? FEATURES[there.def].voice : null, world.air.weight);
      sector.console = bay.open ? bay.zone : loop.paused && started ? 'brief' : null;
      sector.covered = bay.covers;
      sector.blind = port.open;
      // a card that stops the world (hail, comms, dock, bay) stops stepping: drawn between two old steps the ship and the hulls would shimmer back and forth, so hold on the latest
      const live = world.phase === 'play' || (world.phase === 'comms' && !!world.comms && world.comms.slow > 0);
      sector.frame(world, live ? alpha : 1, dt, frameDt);
      // the jump: the HUD steps back, and the view goes pale teal at the end of it; once the sortie is over the veil lifts again, off the chart
      el('app').classList.toggle('warping', sector.jumping);
      veil = world.phase === 'over' ? Math.max(0, veil - frameDt / 0.9) : sector.warpVeil;
      el('warp').style.opacity = veil.toFixed(3);
      tour?.frame();
      hud.update(world, sector, frameDt);
      if (started) stops();
      debug.frame(frameDt, renderer, quality, input, loop.paused);
    },
    measure(dt) {
      // a new system, or a panel just closed: the first frames are slow for their own reasons, so the governor waits
      const system = world.mode === 'breakout' ? world.sortie.system : '';
      if (world.run !== lastRun || system !== lastSystem || (wasPaused && !loop.paused)) { lastRun = world.run; lastSystem = system; quality.hold(GRACE); }
      wasPaused = loop.paused;
      if (!loop.paused && quality.sample(dt)) {
        matchTier(renderer, quality.tier);
        sector.setTier(quality.tier);
        fit();
        void sector.warm();
      }
    },
  });
  loop.paused = true;
  // dev server only: a handle for tools/shots.mjs to put any screen up
  if (import.meta.env.DEV) Object.assign(window, { wayward: { world, sector, loop, launch, openChart, chart, cut, get journey() { return journey; } } });

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

  // The title is a list of buttons: nothing starts from a tap on the picture. Enter, or a pad's start, presses the row that has the focus.
  const menuEnter = () => {
    const f = document.activeElement;
    if (f instanceof HTMLElement && el('start').contains(f) && f.closest('.st-row')) f.click();
    else rows()[0]?.click();
  };
  const press = (id: string, f: () => void) => {
    el(id).addEventListener('click', (e) => { e.stopPropagation(); f(); });
    el(id).addEventListener('pointerdown', (e) => e.stopPropagation());
  };
  press('m-continue', () => launch('breakout', true));
  press('m-journey', () => { pick = 'breakout'; showStep('diff'); });
  press('m-arcade', () => launch('arcade'));
  press('m-settings', () => showStep('set'));
  press('d-back', () => showStep('menu'));
  press('s-back', () => showStep('menu'));
  press('s-sound', () => { feel.setSound(!feel.prefs.sound); paintSwitches(); showBrief(); });
  press('s-buzz', () => { feel.setHaptics(!feel.prefs.haptics); paintSwitches(); showBrief(); });
  press('s-review', () => { location.search = '?dev'; });
  press('chapter', () => { const j = restartChapter(); if (j) { journey = j; showResume(); } });
  press('restore', () => { const j = restoreJourney(); if (j) { journey = j; showResume(); } });
  // the pointer moves the highlight the way the arrows do
  for (const r of document.querySelectorAll<HTMLElement>('#start .st-row')) r.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') r.focus({ preventScroll: true }); });

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (!started) {
      if (startOpts.logbookOpen) { if (e.code === 'Escape') startOpts.logbook(false); return; }
      // Up and Down walk the rows, Back (Esc, Backspace) leaves a step, Enter presses the row that has the focus
      if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
        e.preventDefault();
        const all = rows();
        const at = all.indexOf(document.activeElement as HTMLElement);
        all[at < 0 ? (e.code === 'ArrowDown' ? 0 : all.length - 1) : (at + (e.code === 'ArrowDown' ? 1 : -1) + all.length) % all.length]?.focus({ preventScroll: true });
        return;
      }
      // in the difficulty list Left and Right step through Easy, Normal, Hard as well
      if (step === 'diff' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight') && document.activeElement?.closest('#mods')) {
        const all = [...document.querySelectorAll<HTMLButtonElement>('#mods button')];
        const at = all.indexOf(document.activeElement as HTMLButtonElement);
        all[Math.max(0, Math.min(all.length - 1, at + (e.code === 'ArrowRight' ? 1 : -1)))]?.focus();
        return;
      }
      if ((e.code === 'Escape' || e.code === 'Backspace') && step !== 'menu') { showStep('menu'); return; }
      // Enter on a focused button presses that button; with none, the first row
      if ((e.code === 'Enter' || e.code === 'Space') && !(e.target instanceof HTMLButtonElement)) menuEnter();
      return;
    }
    if (startOpts.logbookOpen) { if (e.code === 'Escape') startOpts.logbook(false); return; }
    if (panelOpen()) return;
    if (e.code === 'Tab') e.preventDefault();
    // Any key resumes, except the pause keys themselves: Input has already
    // toggled on those, and answering them here as well would undo it.
    // in Settings a key does not resume: Backspace goes back, the pause keys are Input's
    if (settingsOpen()) { if (e.code === 'Backspace') showSettings(false); return; }
    // a call holds the world itself: its own keys (and any held key) must not lift that hold from under the card
    if (loop.paused && !callHold && !PAUSE_KEYS.includes(e.code)) setPaused(false);
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
  // Story mode saves the journey as it stands (the last chart or dock); the arcade just leaves. Either way the page reloads to the title
  act('p-exit', () => {
    if (journey && world.mode === 'breakout') saveJourney(journey);
    location.reload();
  });
  // iOS Safari ignores user-scalable=no for pinch zoom; this is what stops it.
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // Development only: lets an automated check step the loop while the tab is
  // hidden (no animation frames) and read the state back. Stripped from builds.
  if (import.meta.env.DEV) Object.assign(window, { __ab: { world, loop, sector, renderer, input, launch, hud, profile, journey: () => journey, clearJourney } });

  // the review world has no title: it opens in the gallery, flying
  if (dev) { launch('arcade'); setPaused(false); }
  loop.start();
}

// German players wait for their dictionary; everyone else starts at once.
// The review world's code is fetched only for ?dev.
const reviewing = new URLSearchParams(location.search).has('dev');
Promise.all([detect() === 'de' ? loadDe() : Promise.resolve(), reviewing ? import('./review') : null]).then(([, review]) => boot(review));
installCrashCard();
