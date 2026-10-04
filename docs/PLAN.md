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
- **Data over code.** Comms cards, systems, factions, modules and
  phenomena are rows in `src/content`, like upgrades are now. Writers add
  content without touching the simulation.
- **Decisions pause the world.** The existing pattern (`World.phase` plus an
  answer method the app and the pilot both call) extends to every new
  decision: `comms`, `dock`, `chart`.
- **Playable without reading** (decided 2026-10-04). A player who skips
  every line of text still knows what to do. Goals sit on screen, choices
  read at a glance (a verb, then chips for what it brings, what it costs and
  a word for the odds), and no mechanic lives only in prose. Comms choices
  get their chips from the outcome data (`sim/gains.ts`), the hidden truth
  behind a card turns into the same odds word as a bluff, and the chart
  names the goal and the lanes toward it. Card text stays as flavour, not as
  instructions.
- **Saves are versioned.** A journey lives longer than a run, so its save
  carries a version and a migration path from the first day.

## Architecture: two layers

Today `World` is the whole game. The new game needs a layer above it.

```
Journey  (persistent, saved at every port)              src/sim/journey.ts
  ship (hull, modules, plates)  cargo and Krail  standing and notice
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
| `meta/save.ts` | journey save and load (localStorage), versioned |

New content: `content/cards.ts`, `content/systems.ts`, `content/factions.ts`,
`content/modules.ts`, `content/phenomena.ts`.

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
| M4 Notice and nemeses | First pass done: per-faction notice and standing, the four tiers, named captains with a memory, Calloway's file (tricks she learns, your route, offers, the last meeting at the Threshold) (see below) |
| M5 The ship | First pass done: four systems, fourteen modules, their own resources and comms choices, the ghost echo, the refit rail under the systems, a ship pilot (see below) |
| M7 The Scatter | First pass done: three regions out through gates, the factions acting on their own, the Thren as swarms drawn to Krail, places (see below) |
| UI Look and feel | Pass 1 (the foundation) up for review; passes 2 to 7 to come (see below) |

## From the concept boards

The user's concept boards (the WAYWARD sheet, the gameplay view) settle
these, and later milestones build to them:

- **The ship**: OB-7731-A, an Obedience-class ore hauler, hazard yellow over
  gunmetal, stacked cargo modules, cyan engines, "03" stencilled; a bulkier,
  three-engine silhouette than the M0 model (a model pass is due).
- **Names**: Kellern Mining (owns the home moon), Frontier Supply Co. (the
  port), the Dust Traders Guild, Ares Drive (parts and services), Obedience
  Heavy Lift, Continuance Enforcement.
- **The pilot**: Juno, the player, alone aboard the Wayward. There is no
  crew (decided 2026-10-04).
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

## UI. Look and feel (brand v1.1)

A track that runs beside the milestones, owned by one thread, so the game
looks like one thing while the features land. The source is
`branding/WAYWARD_Brand_Visual_Direction_v1.1.md` and its boards in
`branding/`; it replaces the cyan-and-violet `brand/system/` of M0.

The rules, short: industrial cyberpunk, a stolen ore hauler's dashboard.
Overwhelmingly dark (65% black, 20% off-white, 8% amber, 5% teal, 2% red).
**Amber** is the Wayward and the player's hand (selection, the primary
action, weapons, Krail and what is worth taking). **Teal** is information
(the ship's systems, navigation, the scope, scans, known contacts). **Red**
is the threat and nothing else (the Continuance, hostiles, damage, the
hunt). Thin frames, mostly transparent glass, short uppercase labels, data
in mono. The HUD answers four questions (where am I, what am I doing, what
threatens me, what condition is the ship in) and leaves the centre to the
ship. It should be playable without reading (Jimi, 2026-10-04): icons,
numbers and a visible current goal carry the play, and the words are there
for whoever wants them (the reading itself is the "Slim down the reading"
thread's; this track gives it the visual means).

Faction colours: the Custody alert red, the Office of Peace a paler
official red (both the Continuance's arms: red, black, white), the Gutter
faded rust, the Voice cold steel, the Thren a biological green.

- **Pass 1, the foundation** (branch claude/project-thread-jzppqc):
  the palette as tokens at the top of `styles/main.css` and
  `ui/palette.ts` for canvas and SVG; the type, self-hosted so the Home
  Screen app works offline (Barlow Condensed for titles, labels and
  figures, Barlow Semi Condensed for sentences, Share Tech Mono for data);
  neutral hairline frames with an amber lit corner; the lockup on the start
  screen (the amber mark, the word, the ship's papers, the four verbs) and
  the mark on the HUD plate; every screen recoloured to the rules (a hull
  in the bracket, the edge chevrons, the hunt and Continuance control in
  red; the scope and contacts in teal; refit categories amber, teal and
  hazard green); the scope no longer overlaps the sector block on a phone.
- **Pass 2, the HUD to the six zones**: the objective as steps top left; a
  single target or threat card top centre; ship status top right as
  labelled bars (hull, Krail tank, energy, munitions); the scope and
  contacts bottom left; an operating-mode card bottom right (Mining, Combat,
  Silent run) with only that mode's actions. Density low in cruise, higher
  only when the situation is.
- **Pass 3, comms as a transmission**: "Incoming transmission", the caller's
  sigil, a short message, numbered options (01–05) with known consequences
  beside them; the Continuance's cards in red, black and white with the
  stamped, bureaucratic language (NOTICE OF VIOLATION, VESSEL FLAGGED).
- **Pass 4, the chart as a regional map**: Continuance control and expansion
  as red hatched territory, Calloway's estimated route dashed, Krail
  richness and phenomena as legend symbols, "your position" marked.
- **Pass 5, the port and the refit as equipment**: the port as a dockside
  terminal (cargo manifest, barcode, registry), the refit and modules
  around a schematic of the ship (the Guns / Rig / Signals / Contacts tabs
  of the boards).
- **Pass 6, the world** (render, with care for the feature threads): the
  Wayward to the v1.1 silhouette (done: a long octagonal hull of layered
  plating, a wedge prow with a recessed bridge, two engine pods on pylons,
  a cargo stern with "03" on its plates, worn amber paint; `tools/ship.html`
  is the bench for it); the shield dome out of red (done: it shimmers teal,
  and only a hit that gets through flares red);
  Krail veins and pick-ups toward the amber-glow rock of the boards;
  Continuance hulls in red, black and white; sparks, dust and arcs over
  holographic effects.
- **Pass 7, the texture**: worn paint, stencils, serials, barcode strips,
  warning placards, used sparingly in panel chrome and loading screens;
  store and press art from the boards.

Each pass keeps to shared styles and new components where it can, so the
feature threads' files merge cleanly; screenshots at desktop and phone
sizes go with every pass.

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
- **Earned choices.** Choices that need a module or a standing
  show greyed out with what they need, so the player sees what
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
- **First pass done.** `content/modules.ts` and `sim/modules.ts`: four
  systems, fourteen modules fitted in marks at a port's yard, each paid in
  its system's resource (salvage from kills, rig parts from clean cuts and
  ore, signal kit from bluffs and Office and Voice kills, favours from help,
  trade and jobs) and a few chits. Modules change the ship, the hold, the
  heat, the prices, and open eleven comms choices of their own (show your
  guns, tow a tug, send a licence, go dark, bill the Guild...). Signals' ghost
  echo makes the chart lie: it slows Calloway at every jump, and at the
  second mark she cannot read your route. The refit rail sits under the
  systems: every card belongs to one, and modules fitted there deal its
  cards more often (Contacts has no cards; it grows only at a port).
  Pilot (BALANCE-SHIP.md, `npm run pilot:ship`, 6 journeys a build): every
  build gets through in 4 to 6 of 6. Guns fights most (93 kills) and fits
  three marks; Contacts fights least (31% of the time) and takes its own
  choices (billing the Guild, a friend at the dock) twice a journey; Signals
  flies furthest (six systems), goes dark on Calloway and ends with the most
  chits. Open: Signals earns too little kit for a pilot that bluffs (eight a
  journey, so it fits less than a mark); Rig earns plenty but fits in only
  half its journeys; the Guns and Rig choices rarely come up for the pilot.

## M6. Crew (dropped)

Dropped on 2026-10-04: the Wayward is a one-person ship. Juno flies her
alone; there is no crew, no loyalty and no per-head food. What M6 would
have carried (people to lose, choices opened by someone aboard) is left to
cards, contacts and modules.

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
- **First pass done.** `content/regions.ts`: the way out is three regions,
  each through a single gate. The Reach (Kellern space, the Net) out
  through the Narrows; the Marches (Holdfast claims, Drift fleets, the
  Gutter) out through the Rift; the Hollows (Voice foundries, Thren space,
  few docks) out through the Threshold. The Net slows the further out it
  gets and crawls into a Holdfast; the Custody's heat climbs slower; more
  comes from ahead, and in the Hollows it is Voice hulls or Thren. No lane
  leads back through a gate. The chart panel shows one region at a time
  and the goal is the region's gate. `sim/scatter.ts` moves the factions
  every day, whether or not you are near: Drift fleets cross the chart
  (their card comes where a fleet is), Gutter crews raid next door (a
  raided port is dearer, a raid card, sometimes the system becomes
  theirs), a Holdfast on the Net's edge throws it back, Voice foundries
  build out, and the Thren drift between systems, burn off where the Net
  is, and are drawn to Krail on the move. News within sight shows on the
  chart. In a sortie the Thren swarm (`mote` hulls, a web layer where they
  are thick), sooner the fuller the tank, and near them the scope fills
  with static, the lane mouth swims and the drive spools slower. Three
  cards: the Thren smell Krail (vent some, fight, run), a Voice foundry
  asks (ore, parts, or its keepers), a Gutter raid (join, keep out, drive
  them off). Places now sit by region. Save version 6. Journey pilot
  (BALANCE-JOURNEY.md, 18 journeys): 16 through, about ten systems and
  21 days a journey, sorties about three and a half minutes, nobody went
  hungry. Open: the pilot does not yet report the Thren or the factions;
  the new cards and the Hollows want a playtest for whether they read
  without text; Calloway is waiting at the Threshold more often now the
  route is longer.

## M8. The story

- **Three acts**: Breakout (M1's system, now the opening), the Run (the
  chart, alliances, the Severance's history, the Net spreading, Calloway
  closing), the Choice.
- **The endings**: Broadcast, Unite, Sell, Trade, Seal, Vanish, each
  gated by what the journey built (standing, systems, flags), each with
  an epilogue.
- **The Archive** replaces the logbook: recovered files, records, people and
  history carried between journeys. Options, not power, as now.

First pass (skeleton): through the Threshold the journey ends with the file
still aboard; the Threshold panel shows all six endings, the open ones to
choose and the shut ones with what they need (content/endings.ts, read by
sim/endings.ts against standing, fitted marks, the kit aboard, card flags,
the Office's notice and Calloway beaten). Vanish is always open. Each ending
has an epilogue whose lines depend on the journey. The save is kept until
the choice is made. The Archive (meta/profile.ts, the start screen's
Archive button) keeps every journey, the endings reached, their files and
the people met, with the unlocks below. `npm run pilot:endings` writes
BALANCE-ENDINGS.md: on 24 journeys every ending opened on some (Seal on
18, Broadcast on 6); the gates are first guesses.

## The long tail

More cards, captains, factions, Holdfasts, Drifts, regions,
phenomena, modules, Thren encounters, story events and endings. The systems
should multiply each other; expand combinations before adding combat.

---

## Decisions needed, and when

| Question | Recommended default | Needed by |
|---|---|---|
| Run length | A 6–10 hour journey; failure costs cargo, parts and time but rarely ends it; an optional hardcore setting | M3 (the save) |
| How hard the hunt pushes | The Net moves on a schedule you can slow; Calloway closes only when you linger or leave a trail | M3 |
| Crew | None: the Wayward is a one-person ship (decided 2026-10-04) | Done |
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
   Open after the first pass: the pilot never lands in a netted system (the Net stays a column
   behind a pilot that keeps moving, so the netted port scan never came);
   the journey is easy for a steady pilot; a false flight plan and the
   survey relay are rarely taken; re-plotting from a port is not built.
   Loose ends, second pass (BALANCE-JOURNEY.md, 48 journeys): the Net is
   quicker (0.45 a day, harder on a broad front), so a steady pilot lands
   in a netted system about once a journey and the netted port's scan
   comes up; a survey relay left alone brings the Net in at once, and the
   Gutter will break one for ore; a false flight plan can be paid in ore;
   a port can re-plot the lane out. Relays are now acted on 15 times in
   22, false plans filed 19 times in 28. 43 of 48 get through.
   Then the salvage: a capital ship's wreck in a sortie (a blockade, a
   captain, Calloway) left 22 Krail, so a netted system paid rather than
   cost. It now leaves six (`CAPITAL_KRAIL`). On today's main, with M4's
   notice and captains, that takes 47 of 48 through down to 45 of 48 (2
   captured, 1 wrecked out), Krail aboard after the jump from about 17 to
   about 12 in the middle systems, and Calloway reaches 49% of fourth
   systems instead of 42%, since a thinner tank means more time mining.
   Open: still easy for a steady pilot, though no longer a payday at the
   Net. The first system after the Breakout can already be netted.
6. M4 notice and nemeses. Started: `content/factions.ts` (each faction's
   notice per kill, fade a day, tier thresholds, fees, hunters, captains),
   `sim/notice.ts` (notice and standing across the journey, the tiers, named
   captains who rest between meetings and remember how each went), the
   journey folding each sortie's kills and cards into it, the save at
   version 2 with a migration, and the world playing it: bulletins and word
   in the Gutter at warning, dearer fees at toll, a harder pursuit at
   hunters, and at the top a named captain (`content/captains.ts`,
   `sim/captains.ts`): eight captains with a face on the comms card and one
   of five personalities (announce, ambush, deal, turn away), whose ship
   comes in under its name, and who come back changed by each meeting (a
   grudge, bolder, a bigger wing, dearer, wise to running). Calloway's file
   (`content/calloway.ts`, `sim/calloway.ts`, save version 5): every trick
   used on her counted and worth less the next time, her read on your route
   (the kind of system you stop in, straight for the Threshold) letting her
   skip her questions there, offers chosen from what you told her, who you
   know and what you care about, trust and broken words, and a last meeting
   at the Threshold's lane mouth built from all of it, with her face on her
   cards and her file on the chart. Open: the last meeting is too easy for
   a steady pilot, who mostly breaks her ship or spools past her.
7. M5 to M8 in order, each with its pilot report.
