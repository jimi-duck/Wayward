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
- **English and German** (decided 2026-10-05). Every line the player sees
  has a German twin in `src/i18n/de/`, keyed by the English. Both stay short
  and informal (German says du). Code shows text through `t()`; the i18n
  test fails on any new English line without German.
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
| M8 The story | Second pass done: three acts, six story beats through the Run that piece the Severance file together and open endings, the six endings with epilogues, the Archive (see below) |
| UI Look and feel | Passes 1 to 3 done (the foundation, the six-zone HUD, comms as a transmission); passes 4 to 7 to come (see below) |
| R The refit bay | Steps 1 to 4 done, and console steps 1 to 10 (the state word, the ship lit by tab, thresholds, the install, advice, the profile, hardware paths, type hierarchy, a sample of wear, the voice; see the console pass): the web as data and rules, the bay on screen, the budgets felt, the Story mode in the bay with Cyrite as its fuel and the yard folded in; step 5 to come (see below) |
| SM Survival modes | Done: Drifter, Prospector (baseline) and Raider chosen on the title, one table in `content/survival.ts`, saved with the profile and the journey (journey version 8), the Raider's skirmish, unit tests and a pilot report (see [BALANCE-SURVIVAL.md](BALANCE-SURVIVAL.md)); real-device play still to do |
| C Story communications | Done: one comms desk decides when anything is heard (a free sky, a breath after a fight, spacing that runs across systems, chance cards only on an opening), four weights (major panel, important and routine calls that ride along, ambient radio lines), the lane toll as a roll, journey version 9 (see [COMMS.md](COMMS.md), [BALANCE-COMMS.md](BALANCE-COMMS.md)); real-device play still to do |
| S Scale-up | In progress: breathers, the eight regions (the default for new Story journeys; `?short` plays the old three) and the clocks (Calloway once a region, capture risk per region, the Net tuned to about 9 netted arrivals a journey) are built. Chapters at region gates (a record, a snapshot to start the chapter again, and a recap on the title) are built too. The long journey's story is written too: two beats a region (ten new), and four more pieces of the file. New journeys run the long chart now. What is left is a playtest of the long journey (the wording, the pacing, region 3 first) and real-device play (see [SCALE-UP.md](SCALE-UP.md)) |
| E The environment | Stages 1 to 5 of 6 done, 6 started (the exposure report, `BALANCE-SPACE.md`): the plan ([ENVIRONMENT.md](ENVIRONMENT.md)), fourteen features and seven expanses as data, the system that deals and samples them (`sim/space.ts`), the first look (dust veil, curtain, passage) and the effects on the ship (sensors, lock, nav noise, rock, pull, drag, a teal condition line), all behind `?space`. Every feature has a look, and Story lays its systems' sites and four named places. Stage 6 is pace and polish |
| Dev The review world | Done: `?dev` opens a gallery of every hull, capital ship, rock, pickup, place and environment feature, held still and named, with a ship that cannot be hurt and a switchable sky (see [REVIEW.md](REVIEW.md)); a tool for reviewing, not a mode |
| V Visual overhaul | Done (7 of 7), round two done (designed hulls, rock, Krail and finds, gate and port, far works), pending a device look: one look table (`render/look.ts`), enemy hulls painted like the Wayward, and a faction layer on every archetype's outline (patched Gutter, ordered Custody, swept Office, crusted Voice, bladed Thren). Next: rock and pickups, gate and port, combat marks, space depth, a consistency pass. Plan and audit in [VISUAL-OVERHAUL.md](VISUAL-OVERHAUL.md) |

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
  only when the situation is. (Done: the objective under the plate as
  steps, Krail toward the refit in the arcade; one card top centre, the
  capital ship over a pursuer over the target, which moved there from
  beside its brackets; status rows for hull, fuel, energy, core, Krail,
  hold and munitions with the score under them; the hunt and the sector
  under the contacts; a mode card for Cruise, Mining and Combat with the
  keys that mode uses, the one in use lit. Silent run waits on a mechanic.)
- **Pass 3, comms as a transmission**: "Incoming transmission", the caller's
  sigil, a short message, numbered options (01–05) with known consequences
  beside them; the Continuance's cards in red, black and white with the
  stamped, bureaucratic language (NOTICE OF VIOLATION, VESSEL FLAGGED).
  (Done: the panel comes in at the side of the view with the world dimmed
  behind it; the caller's sigil (or face), name and what they are; the
  card's title as the message's lead line; options 01 on, the highlighted
  one on an amber bar; hostile calls in red with the kind of call stamped
  on. The cards' own words are still to be rewritten in the stamped style.)
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

Second pass (the acts and the Run): `content/story.ts` and `sim/story.ts`.
The journey has three acts: the Breakout until the first jump, the Run
through the Reach and the Marches, the Choice from the Hollows on. The chart
names the act and counts the file ("Act II · The Run · File 1/4"), and the
jump that starts an act says so. Act I has one call of its own: Tam Okoro,
the yard foreman in Cerro, offers forged codes (the checkpoint's spoof) for
all your parts, or Cyrite for the first jump at a little heat, 40 s in.
Six story beats, one a sortie, each a comms
card in its region (a missed one comes later): Ilse Marrow, a Lane Warden
who heard the shutdown order; Ansel Brook with Kellern's real ledger; the
moot at Kessel Hold; Mother Saffi of the Long Walk with the lost ships'
manifests; Vell, a Gutter broker; and the Voice, which kept the lane keys.
Their answers add the four pieces of the Severance's history (the order,
the ledger, the manifests, the keys), allies (Kessel Hold, the Long Walk),
a buyer and the keys, and each costs something (Calloway gains, heat, ore
or chits). They open endings: the whole file or the Voice for Broadcast,
both allies for Unite, Vell for Sell, the keys for Seal, with epilogue lines
of their own. The choices show what they give as chips (File +1, Ally,
Buyer, Lane keys). The Archive keeps the pieces found across journeys, and
the people. Pilots: every beat comes up on the endings pilot's journeys; a
pilot that says yes to every beat opens most endings (Broadcast 14 of 18,
Unite 13, Sell 14, Trade 14, Seal 18), one that refuses them all opens only
Seal and Vanish. On main the gates were already loose (Broadcast 17 of 22
before the beats) since M7's longer journey brings more kit. The journey
pilot gets 45 of 48 through (3 captured, 2 of them a pilot that refuses
every beat) against 48 of 48 on main. Open: tighten the older ending gates
(salvage alone opens Seal for everyone), keep the beats' text short for the
German pass, and playtest whether the beats read without the text.

## R. The refit bay

Replaces the three refit cards and, in the Story mode, the port's module
yard. The reference is `branding/0da16126-9be4-42f6-9675-785961f6cdfd.png`:
system tabs down the left, a small tiered web per tab, an inspector with the
figures and the cost, the fitted modules along the bottom, the ship's
budgets beside them.

**Decided (Jimi, 2026-10-05):**

- **Building happens only in the bay.** No cards mid-flight. The bay opens
  almost any time; upgrades cost more than a card did, so each is a
  considered choice.
- **The ship starts with the basics**: lasers, torpedoes and one shield
  charge, fitted.
- **Budgets**: power, mass and heat.
- **No refunds.** What is fitted stays fitted. The budgets make that a
  real choice; the bay has to show what an install will leave you with.
- **One structure for both modes.** Built with the Story mode in mind; the
  arcade uses the same bay, tabs and web.
- **Krail pays for upgrades, in both modes** (2026-10-05): mined from rock
  and won from the wrecks of what you destroy. It is what the fabricators
  build from (VISION.md already says so).
- **A new mineral for jumping, in the Story mode**: the lanes burn it, not
  Krail. Mined or won the same way. Working name **Cyrite**, to be
  renamed freely; VISION.md's line that Krail powers the jump drives moves
  to it.
- **Fewer installs than cards today**, each worth more.
- **Heat is a fixed budget**, like power and mass, not a live meter.

**Lessons it keeps.** The refit web (M5d) was cut because it was a map and
points to bank every thirty seconds, mid-fight. The bay is the player's
call, never forced on them, and each tab is a small web (ten to fourteen
nodes in five tiers), not one map of two hundred.

### How it plays

- **Opening it.** In the Arcade it opens by itself once a price of Krail is
  aboard and the alert is clear (decided by Jimi, 2026-10-06; every module
  costs the same there, the bay's look is unchanged); in the Story mode a
  key, the pad's Back, or a HUD button. It pauses the
  world like any decision (`World.phase` 'bay', answered by `install(id)`
  and `closeBay()`). It will not open in danger: the same test the
  self-repair uses (a committed hostile close, fire near, a capital ship
  engaged), nor during a comms card. In the arcade the quiet spells are
  the natural moment; in the Story mode, anywhere quiet in a sortie, and
  at a port.
- **Paying.** Each node costs Krail, more by tier and by level. Krail comes
  from rock broken or cut and from wrecks, in both modes. In the arcade the
  rail that fills to a card goes: Krail is a stock to spend. In the Story
  mode the tank holds Cyrite for the jump, and Krail goes to the bay
  (today's parts stay for patching plates). The HUD says when something is
  affordable, so the bay is never a surprise.
- **Tabs**, after the reference: Hull, Weapons, Engines, Defence, Utility,
  Reactor, and Synergies and salvage. Today's 103 upgrade levels become
  about sixty modules with levels (the pips of the reference);
  specialisations are tier-five capstones, one per tab; synergies link two
  tabs; a capital ship destroyed opens her faction's tech in the last tab.
  Story-only modules (the Signals and Contacts kit, the cutter head) are
  marked `story`, as arcade-only cards are marked `arcade` today.
- **Yard-only modules** (Story): the heaviest (hull frames, the big
  reactor) fit only at a port, so ports keep their pull.
- **The inspector** shows the module, its level, one sentence, the figures
  before and after (`sim/build.ts` already works these out), the cost, and
  the budgets after install, with any line it would push past.

### Budgets

- **Power**: every module draws some; the reactor's output is the ceiling.
  Hard: an install that needs more power than is free cannot be made.
  Reactor modules raise it.
- **Mass**: plating, racks and heavy weapons weigh. Over the frame's rating
  the ship gets slower to turn and to speed up, smoothly. Hull frames raise
  the rating.
- **Heat**: weapons and the drive make it; cooling sinks it. Over the
  sinks, the laser bank refills slower and the torpedoes reload slower.
  Cooling modules (Engines and Reactor) add sinks.
- With no refunds a build must never paint itself into a corner: every
  tab has a way to raise one budget, and a test checks that from any
  reachable build some install is still possible while there is money.

### Code

- `content/web.ts`: the nodes as rows (tab, tier, links, levels, cost per
  level, power, mass, heat, `story`/`arcade`/`yard`). The upgrade defs keep
  their `apply`; a node points at one.
- `sim/bay.ts`: what can be installed and why not, costs, the budgets and
  their effects on the stat block (applied after the upgrades, before
  `capStats`), the danger gate.
- `World`: phase 'bay', `openBay`, `install`, `closeBay`; the stock fit at
  `restart`; Krail as a stock in the arcade. `sim/offers.ts`,
  `ui/refit.ts` and the 'refit' phase go once the bay replaces them.
- `ui/bay.ts`: the screen, from the reference. Desktop: tabs left, web
  centre, inspector right, fitted modules and budgets along the bottom.
  Phone (landscape): tabs as a strip, the web fills the screen, the
  inspector as a sheet. Keyboard, pad and touch throughout.
- Old code to mine: `29a6819` (the M5d web: `content/web.ts`, `sim/web.ts`,
  `ui/web.ts`).
- The pilot plans purchases per strategy and opens the bay in quiet; the
  report adds spend, budget use and how often a budget blocked an install.

### Steps (each leaves the game playable)

1. **The web as data and rules.** `content/web.ts`, `sim/bay.ts`, the stock
   fit, the budgets computed (not yet felt); tests. The cards stay for now.
2. **The bay in the arcade.** `ui/bay.ts`, opening, paying in Krail, the
   HUD's affordable hint; the cards and the rail go. Screenshots at both
   sizes.
3. **Budgets felt.** Mass and heat change the flight and the guns; power
   blocks. Balanced from the arcade pilot.
4. **The Story mode.** The bay in sorties and at ports, the module yard
   folded in, costs in the systems' resources and chits, yard-only modules,
   the save migrated. Balanced from the Breakout, ship and journey pilots.
5. **Finish.** Module art (rendered from the ship kit, as the reference's
   thumbnails), icons from `brand/`, German throughout, DESIGN.md.

**Step 1, done.** `content/web.ts` lays every upgrade out as a node (82:
the 79 upgrades and three fittings that raise the ratings: the reactor
core for power, heat exchangers, the structural frame for mass) in eight
tabs of six to seventeen, at most four tiers deep. Each level costs Krail
(40, 60, 90, 130 by tier, half as much again each level) and draws power,
mass or heat; the stock ship (lasers, a shield charge, the torpedo bay)
draws 5 of 10 power, 3 of 10 heat and 1 of 10 mass. `sim/bay.ts` says what
can be fitted and why not (full, mode, locked, tech, path, the upgrade's
own rules, yard, power, Krail), installs a level, and works out the
budgets. Tests: every upgrade placed once, every node reachable from the
stock ship, power never exceeded, and random builds never stuck for power
while the core has room. The game still deals cards; the stock torpedo bay
arrives with the bay in step 2, so the arcade is balanced once.

**Step 2, done.** The arcade builds only in the bay (`ui/bay.ts`): the ship
leaves with lasers, a shield charge and the torpedo bay; Krail is a stock;
B, a pad's Back or the touch button opens the bay when nothing hostile is
close; the HUD counts toward the cheapest module in reach and lights the
key when one can be fitted; a capital ship destroyed opens her tech. The
pilot shops in the bay (BALANCE.md, 120 runs): about ten installs a run
against twelve or thirteen cards before, the tenth at 8:36 (cards: about
six minutes); a fifth of runs reach the cap, against a third with cards.
Builds that wait for a system (mines, drive plasma) fit only five or six
and trail; step 3 balances that with the budgets.

**Step 3, done.** `sim/budgets.ts`: over the mass rating the ship loses
thrust and helm, over the heat rating the guns recharge and reload slower,
each by the share over and down to a floor; the arcade's stat block and the
bay's figures feel it (the Story mode will with its bay). The ratings start
at 8 (stock: 5 power, 3 heat, 1 mass), so about ten installs make a build
choose between weapons and the fittings that carry them. The inspector warns
when an install runs the ship over. The pilot report gains a table of Krail
spent and the budgets at the end: laser builds buy heat exchangers, close
quarters runs heavy, everyone buys reactor cores.

**A UI pass on the bay and the HUD (2026-10-06, Jimi's notes).** The mode
card is an alert in three steps: clear (nothing shown; the bay opens),
yellow alert (you are being observed: ships near or scanning) and red
alert (you are being directly targeted); the bay stays shut on yellow and red, and saying no is one
line. An upgrades
badge (clickable, B) counts the suggestions you can pay for and pulses when
one comes in. The bay opens on three suggested modules with the price on the
button; the tabs are a step further in, with prices on the web. The target's brackets close tight with its
health as a bar under them; the upper-centre card is for hostile hulls only.
The pause card is the briefing: three steps (mine, upgrade, survive), the
controls for the device in hand, the bay and Settings (sound, buzz, camera). Auto-refit was removed; refits are manual.

**Step 4, done (2026-10-06).** The Story mode builds in the bay, as
the arcade does:

- **Cyrite is the fuel.** The violet rock, the tank, a lane's cost, the
  port's fuel, the storm's and the convoy's pay, and the Thren drawn to a
  full tank all move from Krail to Cyrite (German: Cyrit). It keeps the
  violet; Krail crystals take a tint of their own.
- **Krail pays for the bay**, a stock as in the arcade: wrecks and ordinary
  rock cut drop it. Ore stays cargo, sold for chits.
- **The cards and the rail go.** The ship leaves Cerro with the stock fit;
  the bay opens on the same three alert states in a sortie, and always
  when docked. Suggestions as in the arcade.
- **The module yard folds into the web**, paid in Krail only: its modules
  are nodes marked `story`; the four resources (salvage, rig parts,
  signal kit, favours) go. **Yard-only** (fitted docked, plus chits): the
  yard's modules, the structural frame and the reactor core's top levels.
- **The save goes to version 7**: the tank's Krail becomes Cyrite; the
  rail's progress and the four resources become Krail; fitted upgrades
  stay (the web's nodes are the same ids), and the stock fit is added.
- **Balanced** from the Breakout, journey, ship and endings pilots: two or
  three installs in the Breakout, fuel as tight as today, fewer, bigger
  installs over a journey than the cards gave. The arcade pilot confirms
  the cheaper deep ordnance (caution at 85 units).
- **Commits**, each playable: the fuel; the bay in a sortie; the port and
  the yard; the save; balance, German, screenshots and the docs.

### The console pass (design feedback, 2026-10-06)

A UI thread on the bay and the briefing, from a design review: make the
interface the ship's battered industrial operating system, and tie it to the
physical ship. Amber is the player's decisions and Krail, teal the ship's
state, red danger, grey unavailable. Each step ships on its own, with
screenshots at desktop and phone sizes, German lines and a note in
DESIGN.md.

1. **Done: the state word, the briefing frame, the bay's feedback.** The
   alert's word (`ui/ops.ts`: Clear, Yellow alert, Red alert, and Critical at one
   plate) on the bay and pause card; the pause card as a console (rule,
   voice line, readings); tab marks as state; large before → after; Install
   with its price; a flash on fit.
2. **Done: the ship as the protagonist.** In the bay the camera comes in on
   the ship and the open tab lights its part in amber (prow guns, torpedo
   belly, nacelles, spine modules, core, shield); the pause card wakes a
   little of each, and on resume the lights ease out.
3. **Done: thresholds on the bars.** In the bay's overview each rating
   shows a tick at 80%, `▲ Warning` from there (amber), `▲ Over limit` and
   a red blink over it; power is a ceiling and reads `▲ Full`. Not on the
   HUD: it carries no ratings yet, so the state word does not read them.
4. **Done: the installation, felt.** On Install the Krail counts down, the
   module flashes, a line runs to the nearest light of the tab's part of the
   ship (placed from the real 3D positions, `Sector.zoneScreen`), that part
   flashes, the budgets bump. Skipped with reduced motion; never blocks a
   second install.
5. **Done: recommendations with a reason.** `sim/advice.ts` gives a module a
   reason from the run's numbers, firmest first: a rating at its limit and a
   module that raises it (power within one of full, heat or mass at 80%),
   worn plates and a defence module, hostiles that pressed close lately
   (`World.closePressed`, fading over about forty seconds) and close work,
   the system you are deepest in. The bay marks the firmest three with a
   ◆ and says why on the inspector; the Story's cards carry the same line.
   Tests in `tests/advice.test.ts`.
6. **Done: build profile.** `sim/profile.ts`: four ways to fight (close,
   ordnance, range, defence), a name for the leading one (Rammer,
   Bombardier, Lancer, Bulwark, Hybrid, Stock hauler), up to three plain
   lines, and the weights as bars, under the bay's tabs (hidden on phones).
7. **Done: hardware paths.** The web's links are drawn as hardware: a
   conduit under a live wire, a bus a parent's children share with a diamond
   junction where it forks, a bus into a child with two parents with a round
   junction where it joins, amber where both ends are fitted and teal where
   the way is open. Drawn from the data as it is (`BayPanel.web`); no layout
   change was needed. Checked on the Weapons, Engines and Utility tabs, and
   Utility at phone size.
8. **Done: type hierarchy, in the bay.** The inspector reads name, effect,
   the before → after figures, then the flavour note (italic, dim), then the
   price and the button. On the web a node is three levels: the name (bold),
   the level pips, then a small dim tag for what it moves (its first figure;
   desktop only, hidden once fully fitted or out of reach). The HUD and the
   Story's screens are not swept yet.
9. **Done as a sample: wear, on the pause card and the bay.** A few faint
   scratches and chipped corners (`.wear`), an old "Service overdue" stamp on
   the pause card, a serial line on the bay's web, and a scanline that
   breaks every 11 to 14 seconds. Still under reduced motion; the stamp and
   serial are hidden on phones. Jimi to say whether it spreads to the HUD,
   comms and the port.
10. **Done: the ship's voice.** `content/voice.ts` holds six lines, firmest
    first (Load limit exceeded, Maintenance required, Unauthorised
    configuration, Refit authorised, Obedience protocol: active,
    Crew absent); `sim/voice.ts` picks the first whose state holds (over the
    mass rating, plates at half or less, a build beyond the yard's, Krail
    enough for a module, a stock ship). One line shows under the bay's title
    and on the pause card. Not in the log yet. Tests in `tests/advice.test.ts`.

11. **Done: the art pass** (`docs/ART-PASS.md`): stamps for where a module
    came from, the tab marks as ship state, ratings that tick with the old
    figure struck beside them, the ship's papers in small print, the ship's
    answer to a fit, pop-up kickers in the ship's voice, a stencilled wordmark
    with `OB-7731-A`, and a repair patch and scuffs on the inspector, tab list
    and ratings, and (9 spread, on Jimi's word) on the HUD's status block, the comms panel, the port and the pause card, which gets its "Service overdue" stamp back. A few marks each, no scanline on the HUD.
    The bay's structure is untouched pending the 8-tab or 4-view decision.

12. **Done: the briefing as a terminal readout** (Jimi, 2026-10-06): the pause
    card reads top down like the ship's own printout (an id line and the state
    word, the title, the ship's line at a prompt, then Orders, Status and
    Controls as ruled sections, then what to press). No icons; the order
    numbers and rules carry the hierarchy. Same ids, same Story steps. On a
    phone on its side it drops the headings and keeps one screen.

Open: 9 spreads on Jimi's word; whether the Story mode's port and chart
screens take the same console frame.

Merged with the alert and briefing pass above: the HUD's alert (clear,
yellow alert, red alert) is the one source of the state word, which the bay and
the pause card show beside it with one more step, critical (one plate left);
the pause card keeps that pass's three steps, with the console's rule, voice
line and readings around them; the state key is gone, and sound, buzz and
camera moved to its Settings view. Suggestions come from that pass;
the reasons of step 5 ride on its cards and on the web.
### Open

- The deep ordnance at 0.65 to 0.7 of its tier lifted both torpedo builds
  (torpedo+defence 9:49 to 11:22, torpedo+laser 8:49 to 9:18);
  mine+mobility still trails (7:52, about seven installs).
- The Rig build gets through 3 of 6 journeys (ship pilot; 4 of 6 with the
  old yard), the weakest of the four; the yard's marks are back at or above
  the old (Guns 3.5, Rig 2.7, Signals 4.0, Contacts 3.0 a journey).
- Story sorties run about a minute longer than with the cards (journey
  pilot, 3:00 to 4:00 a system); worth a look once players have it.
- The arcade's Krail: how much rock and kills give, against the costs
  above, for fewer installs than today's cards.

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
