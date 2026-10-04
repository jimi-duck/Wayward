# WAYWARD: the build plan

How the current game (an endless survival roguelite, see
[DESIGN.md](DESIGN.md)) becomes the game in [VISION.md](VISION.md), one
playable step at a time. Each milestone ships to `main`, plays on a phone,
keeps `npm run check` green, and has a pilot report that answers its
question.

## Ground rules

- **Never broken for long.** Every milestone is a playable game. The old
  endless run stays reachable as the arcade mode until the Breakout replaces
  it.
- **The one rule stays.** `src/sim` never imports Three.js. Every new loop
  (mining, comms, the chart, the hunt) runs headless, so the scripted pilot
  can play it and tests can drive it.
- **Data over code.** Comms cards, systems, factions, crew, modules and
  phenomena are rows in `src/content`, like upgrades are now. Writers add
  content without touching the simulation.
- **Decisions pause the world.** The existing pattern (`World.phase` plus an
  answer method the app and the pilot both call) extends to every new
  decision: `comms`, `dock`, `chart`.
- **Saves are versioned.** A journey lives longer than a run, so its save
  carries a version and a migration path from the first day.

## Architecture: two layers

Today `World` is the whole game. The new game needs a layer above it.

```
Journey  (persistent, saved at every port)              src/sim/journey.ts
  ship (hull, modules, plates)  cargo and Krail  crew   standing and notice
  chart (systems, routes, the Net)  the hunt (Calloway's trail)  flags
        │ starts a sortie with a SortieDef            ▲ returns a SortieResult
        ▼                                             │
World  (one system, real time, today's simulation)      src/sim/world.ts
  flight · guns · rock · enemies · capital ships · pickups
  + mining · heat · points of interest · comms cards · docking · jump out
```

- **`SortieDef`** describes one system: its points of interest, rock fields,
  traffic table, who holds it, its heat rules, the exits. The endless arcade
  run is just a `SortieDef` with no exits and the current director.
- **`SortieResult`** is what comes back: cargo gained, Krail spent, plates
  lost, kills by faction, cards answered, flags set, how it ended (jumped,
  docked, surrendered, destroyed).
- The **director** (`sim/director.ts`) stops being a function of run time
  alone. In a sortie it reads **heat** (local attention) and the system's
  danger; in the arcade it reads run time, as now.

New sim modules, each with its own tests:

| Module | Holds |
|---|---|
| `sim/journey.ts` | the persistent state, `startSortie`, `endSortie` |
| `sim/cargo.ts` | the hold: slots, cargo kinds, Krail, food, parts |
| `sim/mining.ts` | the cutting beam, rock heat windows, yield |
| `sim/heat.ts` | per-system attention and what it triggers |
| `sim/poi.ts` | points of interest in a system: fields, ports, wrecks, signals, gates |
| `sim/comms.ts` | card selection, the read, choice resolution, follow-ups |
| `sim/chart.ts` | systems, routes, fog, prices, the Net's spread |
| `sim/hunt.ts` | Calloway's trail and decisions |
| `sim/notice.ts` | per-faction notice, standing, nemeses |
| `sim/crew.ts` | crew, stations, loyalty |
| `meta/save.ts` | journey save and load (localStorage), versioned |

New content: `content/cards.ts`, `content/systems.ts`, `content/factions.ts`,
`content/modules.ts`, `content/crew.ts`, `content/phenomena.ts`.

New UI: `ui/comms.ts` (grown from the hail panel), `ui/port.ts`,
`ui/chart.ts`, a cargo and Krail readout in `ui/hud.ts`.

---

## M0. The rename (small, first)

Make it feel like WAYWARD before anything else changes.

- **Words.** Kestrel → the Wayward (Obedience-class ore hauler); dilithium →
  Krail; Starfleet styling and registry gone; capital ships and factions
  renamed by how they fight:

  | Fights today like | Becomes |
  |---|---|
  | Klingon: fast, aggressive | The Gutter |
  | Cardassian: long range, holds off | The Custody |
  | Romulan: cloaks and strikes | The Office of Peace |
  | Borg: adapts | The Voice |
  | Tholian: webs | The Thren |

  Phasers, torpedoes, the warp core and the refit get plain hardware names
  (cutters, launchers, the reactor, field refit). Upgrade names follow.
- **Where.** Display strings in `content/`, `sim/encounters.ts`,
  `sim/bosses.ts`, `sim/enemies.ts`, `ui/`, `index.html`, the manifest,
  README, docs; the brand tokens and lockup in `brand/`.
- **Ids.** Rename internal ids too, with a one-off profile migration in
  `meta/profile.ts` so unlocks and bests survive.
- **Look.** Recolour the hull from Starfleet white and yellow to a worn
  corporate hauler; reshape the saucer into a blunt cargo spine in
  `render/ships.ts`. Enemy models keep their silhouettes, new liveries.
- **Done when** a search for the old names in `src/`, `index.html` and the
  docs finds nothing, and a profile from before still loads.

## Status

| Milestone | State |
|---|---|
| M0 The rename | Done |
| M1 The Breakout | First pass done: playable, tested, pilot-balanced (see below) |
| M2 The comms card | First pass done: thirty cards and six follow-ups, the read, earned choices, the checkpoint, policy pilot (see below) |
| M3 The chart and the hunt | First pass done: a seeded region of thirteen systems, lanes with Krail and day costs, food and wear, the Net, Calloway on the trail, wrecks that cost rather than end, the journey save, the chart panel, ten new cards, a journey pilot (see below) |
| M4 onwards | Not started |

## From the concept boards

The user's concept boards (the WAYWARD sheet, the gameplay view) settle
these, and later milestones build to them:

- **The ship**: OB-7731-A, an Obedience-class ore hauler, hazard yellow over
  gunmetal, stacked cargo modules, cyan engines, "03" stencilled; a bulkier,
  three-engine silhouette than the M0 model (a model pass is due).
- **Names**: Kellern Mining (owns the home moon), Frontier Supply Co. (the
  port), the Dust Traders Guild, Ares Drive (parts and services), Obedience
  Heavy Lift, Continuance Enforcement.
- **Crew** (M6): Juno (pilot, the player), Bram or Marcus Vale (mechanic),
  Tess (scavenger, comms), Varik or Kaldor Santos (fixer), each with a
  loyalty meter.
- **The checkpoint card** (M2): "Your ID doesn't match the registry": Run it,
  Spoof the registration, Pay the inspection fee, Talk your way through,
  Fight.
- **The HUD** (a HUD pass after M1): a brand plate top left (name, class,
  serial); the current objective as steps; a threat card for the nearest
  patrol; hull, fuel, energy, Krail and missiles as teal bars top right; the
  scope with a contacts list beside it; the transmission card bottom right;
  mining-mode key hints. M1 took the objective steps and the contacts list.
- **The chart** (M3): systems as nodes, Krail richness, Continuance control
  and expansion in red, Calloway's estimated route, your position.

## M1. The Breakout

The current run becomes a goal: get out of the home system alive with
enough Krail to jump.

- **A destination.** The sortie has an exit, the old lane mouth, far across
  the system. Reach it with enough Krail in the tank and hold the jump for a
  few seconds to leave. `sim/poi.ts` gains its first two kinds: the exit and
  a rock field.
- **Pursuit, not waves.** The Custody comes from behind and the sides, in
  pursuit of you, not spawned around you. The existing director, enemy
  archetypes and the first capital ship (a Custody cutter hailing at the
  lane mouth) are reused; only where and why they spawn changes.
- **The cutting beam.** `sim/mining.ts`: hold it on a rock, keep the cut in
  its heat window, ore and Krail come out clean; overheat and it fractures.
  The guns still break rock, for scraps. Krail fills the tank (fuel), ore
  fills a small hold.
- **Krail becomes scarce.** Most rock gives ore, few give Krail. The field
  refit (the three cards) is now paid for in ore, not dropped by every kill.
- **Damage and repair.** Plates stay; a slow patch-up from parts in the hold
  replaces most random repair drops.
- **One port.** A small station halfway out, where the ship can dock: sell
  ore, buy a plate, a card, a breather. The first save point.
- **The arcade mode stays**: the endless run as it is now, renamed, on the
  start screen.
- **Pilot.** Learns to cut rock, head for the exit, and choose between
  fighting and running. Report: escape rate, time to escape, Krail at the
  jump, share of time in combat.
- **Answers:** is escaping more interesting than fighting? Target: under a
  third of the sortie in combat, and escapes that feel close.

## M2. The comms card

The hail becomes the game's main interaction.

- **`content/cards.ts`.** Each card: a trigger (faction, place, state,
  heat, cargo), a portrait and text with slots, and two to four choices with
  requirements and outcomes. Outcome vocabulary: cargo, Krail, parts,
  plates, heat, standing, notice, flag, start a fight, spawn ships, give a
  job, schedule a follow-up.
- **Kinds:** trade, plea, job, warning, shakedown, checkpoint, distress,
  rumour.
- **The read.** Before answering, the panel shows their strength against
  yours, their cargo and an intent estimate, as reliable as your sensors.
- **Earned choices.** Choices that need a module, a standing or (later) a
  crew member show greyed out with what they need, so the player sees what
  a build would open.
- **The checkpoint.** The first set piece: the lane mouth is guarded. Run
  it, spoof it, pay it, talk through it, fight it.
- **Flow.** `World.phase = 'comms'`, `World.answer(choice)`; the world pauses
  (slows for an ambush or a declaration). `ui/comms.ts` grows out of
  `HailPanel` and keeps its keyboard, touch and pad handling.
- **Start with about thirty cards**, written so they combine: the same
  shakedown reads differently with a full hold, a friend nearby or a
  checkpoint ahead.
- **Pilot.** A policy per strategy (pay, fight, bluff when it can). Report:
  outcomes by card and choice, so no choice is always right.
- **Answers:** do contacts feel like gambles rather than menus?

### The vertical slice: M1 + M2 + the start of M3

One home system, one port, the Wayward, Krail extraction, basic survival, a
handful of cards, one checkpoint, one meaningful choice, and the first
glimpse of the hunt: after the jump, a one-screen chart showing the next
three systems and a shadow one jump behind. Playtest it with people before
going further. **Is it fun to be a fugitive in space?**

## M3. The chart and the hunt

- **The journey.** `sim/journey.ts` and `meta/save.ts`: the ship, the hold,
  Krail, food and parts persist between sorties; save at every port.
- **The chart.** `sim/chart.ts` and `ui/chart.ts`: a small region of about
  twelve systems, generated from a seed and `content/systems.ts` templates.
  Shows routes, Krail and food availability, port prices (once known),
  faction control, discovered places, the Net's edge, Calloway's estimated
  position, and unknowns. Information can be stale or wrong.
- **Every jump costs Krail**; food and parts run down per jump.
- **The Net** advances a few systems per day of travel, along routes, faster
  where Krail is. Netted systems get checkpoints, scans, dearer markets, fewer
  friendly cards. Some actions stall it in a system.
- **Calloway** follows the trail in `sim/hunt.ts`: she is N jumps behind,
  closes when you linger, and can be misled (false trails, going dark,
  bribes). When she catches you it is an encounter, not instant death.
- **Systems get variety** from `SortieDef` templates: mining systems, port
  systems, empty transit, contested.
- **Pilot.** Plays whole journeys with a simple route planner. Report: how
  far it gets, why journeys end, Krail curve, how often Calloway catches it.
- **Answers:** does staying ahead across several sorties make a compelling
  session?

## M4. Notice and nemeses

- **`sim/notice.ts`.** Per-faction notice and standing. Destroying a
  faction's ships raises its notice; thresholds bring warnings, tolls,
  hunters, then a **named captain**.
- **Named captains** are the existing capital ships (three phases,
  telegraphs, signature attacks) with a name, a face and a memory. They
  announce or ambush by personality, sometimes bargain first, may leave
  without fighting, and return changed after escaping or winning.
- **Calloway as the main nemesis.** She learns: which routes you favour, which
  tricks you have used (a spoof works less the second time), what you care
  about. She makes offers. Her final confrontation is built from the
  relationship, not a bigger health bar.
- **Answers:** do important enemies feel personal?

## M5. The ship

- **Four systems** in `content/modules.ts`: Guns (today's weapon and defence
  branches, moved), Rig, Signals, Contacts.
- **Parts** come from mining, salvage, jobs, trade and captured tech. Each
  system has its own resource, so how you play is how you grow.
- **Port refits** for modules; **field refits** (the three cards) for small
  gains mid-sortie.
- **Different, not just stronger.** A Signals ship can spoof, jam, go dark and
  make the chart lie; a Rig ship stays out longer and carries more; a
  Contacts ship opens doors; a Guns ship fights its way through. Each unlocks
  comms choices.
- **Pilot.** One strategy per system. Report: how each gets through the
  journey, and that each does in a different way.
- **Answers:** do different builds create different ways through?

## M6. Crew

- **`sim/crew.ts`, `content/crew.ts`.** Each crew member: skills, traits, a
  station, relationships, faction ties, a personal problem, and responses to
  certain cards.
- **Crew act outside combat**: open a checkpoint choice, recognise a signal,
  keep a failing system alive, sometimes choose differently from you.
- **Loyalty, conflict, story beats.** Crew can be hurt, captured, leave, or
  be left behind. Food is per head.
- Two or three crew arrive in the Breakout, so this deepens what is already
  there rather than bolting it on.
- **Answers:** does the player feel responsible for the crew?

## M7. The Scatter

- **Factions in full**: Holdfasts, Drifts, the Gutter, the Voice, the Thren,
  each with cards, systems and behaviour.
- **Phenomena and places** in `content/phenomena.ts`: today's sector events
  (ion storm, nebula, gravity well, derelict, convoy, distress) become
  places, joined by abandoned infrastructure, strange signals, Voice
  foundries and Thren lanes.
- **Not every system is a mission.** Sometimes the reward is Krail, a
  shortcut, a person, information or a dangerous discovery.
- **The Thren** appear before they are understood: drawn to Krail on the
  move, swarming, distorting signals and navigation.
- **Regions** that grow less human the further out they are.
- **Answers:** does exploration create curiosity as well as risk?

## M8. The story

- **Three acts**: Breakout (M1's system, now the opening), the Run (the
  chart, alliances, the Severance's history, the Net spreading, Calloway
  closing), the Choice.
- **The endings**: Broadcast, Unite, Sell, Trade, Seal, Vanish, each
  gated by what the journey built (standing, crew, systems, flags), each with
  an epilogue.
- **The Archive** replaces the logbook: recovered files, records, people and
  history carried between journeys. Options, not power, as now.

## The long tail

More cards, crew, captains, factions, Holdfasts, Drifts, regions,
phenomena, modules, Thren encounters, story events and endings. The systems
should multiply each other; expand combinations before adding combat.

---

## Decisions needed, and when

| Question | Recommended default | Needed by |
|---|---|---|
| Run length | A 6–10 hour journey; failure costs cargo, parts and time but rarely ends it; an optional hardcore setting | M3 (the save) |
| How hard the hunt pushes | The Net moves on a schedule you can slow; Calloway closes only when you linger or leave a trail | M3 |
| Crew from the start | Yes: two or three in the Breakout | M1 (light) / M6 |
| How much the chart tells you | Enough to plan; prices and positions age; Signals sharpens them | M3 |
| Hails pause or slow | Pause, except ambushes and declarations, which slow | M2 |
| Combat's role | Available everywhere, never required; every set piece has a non-violent way through for some build | M1, M2 |

## Order of work

1. M0 rename (one branch). Done.
2. M1 Breakout: the cutter, pursuit spawning, the exit, the port. First pass done.
   Second pass done: the hauler rebuilt after the concept boards (three
   cyan bells, two clamped drums, two tiers of containers); the HUD after
   the gameplay view (a brand plate, teal ship bars with the Krail tank, a
   threat card for the nearest pursuer, the objective as steps, contacts by
   the scope, key hints); the blockade three times as tough, the pursuit
   sparser (one to three at once).
   Where it stands (BALANCE-BREAKOUT.md): fighting the blockade, the pilot
   gets out 19 times in 24 (she kills 4, and 4 times she leaves first);
   running it, 24 in 24, in four to five minutes, with four or five refits.
   Combat is about a third of the run on torpedoes, more than half on
   lasers. Running is the safe choice and fighting pays only in score for
   now: her salvage starts to matter when the journey carries the ship on
   (M3).
3. M2 comms cards and the checkpoint. First pass done: `content/cards.ts`
   (thirty chance cards, the port's scan, the checkpoint, six follow-ups),
   `sim/comms.ts` (the read, hidden truths, earned choices, odds, outcomes,
   jobs), `World.phase = 'comms'` and `World.answer`, ambushes that slow the
   world, `ui/comms.ts` (which also draws the arcade's hail), and a pilot
   that answers by policy.
   Where it stands (BALANCE-BREAKOUT.md, 8 seeds per strategy and policy):
   always fight escapes 75%, always run 75%, always pay 88%, bluff when it
   can 83%; about nine cards a run. At the checkpoint, running (she chases
   you while her field doubles the spool) gets out 86% of the time, fighting
   her 78%. Paying, spoofing and talking are rare for the pilot, because
   heat is usually high by the lane and the fee with it; a player who keeps
   the heat down, buys codes or hears the captain takes fees gets them.
   Open: combat is still over a third of the run; jobs pay too seldom to
   steer a route (half a job a run); the pilot never reads the intent
   estimate, so how much the read is worth is not yet measured.
4. The slice's chart glimpse; playtest. Folded into M3: the chart after
   the Breakout is the real one.
5. M3 the chart and the hunt. First pass done: `content/systems.ts` (six
   kinds of system), `sim/chart.ts` (the region, lanes, the Net and what
   you know of it), `sim/hunt.ts` (Calloway on the trail), `sim/journey.ts`
   (the persistent layer, `SortieDef` and `SortieResult`), `meta/save.ts`,
   `ui/chart.ts`, the world flying any system, and ten cards for the road
   (Calloway in the system and on the channel, the Lane Wardens at open
   lanes, a netted port's scan, the dockmaster's news, Drift traders and a
   Drift fleet, a holdout and a survey relay that stall the Net, a false
   flight plan). Cerro's own cards stay in Cerro; generic ones repeat
   across a journey, story ones come once.
   Decisions taken on the recommended defaults: failure costs but rarely
   ends it (adrift after a wreck; the third, or one with Calloway in the
   system, ends it; hardcore ends at the first); the Net moves on a
   schedule you can stall, and Calloway closes only when you linger; the
   chart shows enough to plan, with the Net as of your last news, Krail
   as a survey estimate until flown, and Calloway where last seen.
   Where it stands (BALANCE-JOURNEY.md, 48 journeys): 44 reach the
   Threshold, 3 are taken by Calloway, 1 is wrecked out; about five
   systems and eleven days a journey, sorties of about three minutes after
   the Breakout's five. Calloway reaches 10% of third systems, 30% of
   fourth, about half of fifth: pressure that builds across the session.
   Open: the pilot never lands in a netted system (the Net stays a column
   behind a pilot that keeps moving, so the netted port scan never came);
   the journey is easy for a steady pilot; a false flight plan and the
   survey relay are rarely taken; re-plotting from a port is not built.
6. M4 to M8 in order, each with its pilot report.
