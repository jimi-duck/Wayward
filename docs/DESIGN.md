# Game design

This describes the game as it plays today: the journey (M1 to M3 of
[PLAN.md](PLAN.md): the Breakout, the comms cards, the chart and the hunt),
and the arcade run it grew out of, which stays as a mode. See
[VISION.md](VISION.md) for where it is going.

## The Breakout

A sortie with a shape: get the stolen hauler out of the home system
(`sim/breakout.ts`, `World` with `mode: 'breakout'`).

- **The course.** The lane mouth is 2,600 units ahead of the start (about a
  minute flat out); Frontier Supply, the port, is halfway and off the line.
  The HUD carries both as pointers, radar diamonds, a contacts list and the
  objective's steps.
- **The jump.** Inside the lane mouth with 20 Cyrite in the tank (`JUMP_COST`),
  the drive spools for five seconds; leave the ring and it winds down. The
  jump takes the Cyrite and ends the run as an escape.
- **Cyrite is fuel, and scarce.** Only veined (rich, violet) rock and the
  rare gold rock carry it, cut clean; the guns break a rock for 30% of what
  is in it (`rockYield`). The tank starts at 6.
- **Krail builds the ship**, as in the arcade: pale gold crystals out of
  ordinary rock (`ROCK_KRAIL` of the arcade's: sure when cut clean, by chance
  when broken) and the wrecks of what you destroy (`WRECK_KRAIL`), and 40
  from a capital ship. It is spent in the refit bay (below).
- **The cutter** (`sim/mining.ts`), on its own held trigger: the rock under
  it heats; once warm the cut goes in; past the line the rock fractures. A
  small rock comes out clean in one hold; a large one needs the beam pulsed.
  Heat and the cut belong to the rock. The lasers hold while it runs.
- **Ore** fills the hold (40) and sells at the port. **Parts** come from wrecks; six of them patch a plate
  once the ship has gone six seconds unhit. Random repair drops are off.
- **The port.** Slow inside its ring for a second and the clamps take you
  (`phase: 'dock'`): sell the hold (2 chits an ore), buy Cyrite (5), patch a
  plate (30), or open the refit bay, where the yard's work is done. The
  first dock takes 0.2 off the hunt pressure. The panel leads with one tap,
  the **sensible stop** (`sim/stop.ts`): sell the hold, then buy what the
  chits reach, most pressing first (Cyrite for the jump, food up to six, the
  hull whole, Cyrite for a second jump). Its row shows what it will do as
  chips; the one-at-a-time rows sit under "By hand".
- **Hunt pressure** (`heat`, 0 to 1) climbs with time, kills (Custody kills
  more) and the cutter's noise. It decides how often pursuers come, how
  many at once and which: pickets, then cruisers, enforcers and, late,
  interdictors, all Custody, from behind (38s apart down to 10s, one to
  three at once); now and then
  a Gutter crew from ahead. It is also the clock the difficulty curve reads
  (heat 1 plays like seven minutes of the arcade).
- **The checkpoint.** Within 420 units of the lane mouth a Custody capital
  ship holds the lane, three times the hull of an arcade run's first capital
  ship (`BLOCKADE_HP`), and her checkpoint is a comms card: "Your ID doesn't
  match the registry". Run it (make for the lane under her guns: she and her wing
  come after you, the hunt pressure goes to full, and her interdiction field
  more than doubles the spool, eleven seconds in the lane mouth instead of
  five; survive it and you are gone, with no need to kill her), spoof it (with forged codes, likely; or
  rig the transponder from 8 parts, a long shot when the heat is up), pay the
  fee (it rises with heat; a captain who goes by the book takes it and
  scans you anyway), talk your way through (easier before they know your
  face), or fight: the usual three-phase duel, and her wreck pays a little
  Cyrite (six, a top-up rather than a jump), parts and Krail, and opens her
  faction's tech in the bay.
- **Comms.** See below: everyone else who opens a channel.

Balance: [BALANCE-BREAKOUT.md](BALANCE-BREAKOUT.md), from
`npm run pilot:breakout`.

## The journey

The Breakout is the first sortie of a journey (`sim/journey.ts`), and the
journey is the layer above the world: everything that lasts longer than one
system. A journey crosses one region of about a dozen systems, from Cerro to
the Threshold, the last lane the old charts know.

- **Two steps, over and over.** A sortie (one system, flown in real time by
  the world, as the Breakout is) and, on the far side of its lane, the chart
  (`ui/chart.ts`), where you plot the next jump from the lanes out of where
  you are. The journey hands the world a `SortieDef` and what the ship
  carries (`Carry`); the world hands back a `SortieResult`.
- **What carries over.** The build and the Krail for the bay, the plates,
  the tank, the hold, parts, chits, food, flags, standing, jobs not yet paid,
  and the cards heard (a card comes once a journey unless it is marked
  `repeat`). Pursuers, rock and capital ships do not: each system is new.
- **The chart** (`sim/chart.ts`, `content/systems.ts`): six columns, Cerro
  on the left, the Threshold on the right, two or three systems in each
  column between, laid out from the journey's seed. Each system is a kind
  (port, mining, transit, contested), a holder (Kellern, Frontier Supply,
  the Dust Traders, the Gutter, nobody), a Cyrite richness, a food supply and
  maybe a port with its own prices. Lanes run one column on, now and then
  sideways; never back to Cerro. Every lane has a Cyrite cost (12 to 20)
  and takes one or two days.
- **Plotting.** The jump you plot sets the sortie's lane: the lane mouth
  wants that lane's Cyrite. So the chart is where you decide how much
  mining the next system will ask of you.
- **What a system is like.** Its kind sets the lane's distance (transit is
  short), the rock (mining systems are dense and veined), who flies there
  besides the Custody (contested systems are half Gutter), how hard the
  Custody already looks, how often people call, and whether there is a
  port. A port's prices come from its holder.
- **A lane's style.** The lane list tags each lane quiet, watched or hostile
  (`stance` in `sim/lanes.ts`, from the system at its far end: crossings and
  rock are quiet, ports and gates watched, contested space, the Net, a raid,
  Thren and Calloway's last sighting hostile) beside its days, so two lanes
  read as a fork in style. It changes no rule; a new tag is a case there and
  a German line.
- **Days.** Every four minutes in a sortie is a day (`DAY`), and a lane
  takes its days. Juno flies alone and eats a unit of food a day; the
  drive wears two parts a jump. Short of food, you arrive weak; short
  of parts, the hull takes the wear: a plate down either way. Food is sold
  at ports (and by Drift traders), and the galley holds ten.
- **The Net** spreads from Cerro along the lanes, once you have left it, a
  little every day, faster into systems with Cyrite to take and harder
  where two or three netted systems press on one (`spreadNet`). Its pace
  is set to catch a pilot who keeps moving now and then.
  A netted system has a blockade at its lane mouth (the checkpoint card),
  starts a quarter hotter, heats faster, scans you at its port, marks its
  prices up (Cyrite and food by 40%, less for ore) and gets fewer friendly
  calls. Some answers stall it in a system for days (help a holdout, break
  a survey relay, or pay ore to have the Gutter break it). A survey relay
  left to finish brings the Net into that system at once, even ahead of
  the front (`pushNet`). The chart shows the Net as it was when the news
  last reached you (two jumps out, each arrival), or everywhere if you
  bought news. Docked at a port, you can plot another lane out (the port's
  sixth line), with that news in hand.
- **Calloway** (`sim/hunt.ts`) follows the trail, the systems you flew in
  order: she sets out when you leave Cerro, a day behind, crosses each lane
  as long as it took you, then spends a third of a day asking questions
  before she picks the trail up. So she gains only while you linger. When
  she reaches your system she opens a channel (`calloway_here`): run for the
  lane with her ship on your tail, dump the hold as a decoy, tell her the
  file is out (she has to check), go dark (with deep scanners or Office
  tech), or turn and fight (beaten, she loses four days to repairs). Lies,
  false flight plans (paid in chits or ore) and friendly Drift fleets hold her up; failed lies
  bring her closer. The chart shows where she was last seen: exactly when
  she is a jump away or the news is fresh, otherwise as of the day you last
  had it.
- **Wrecks** are not the end. The hull goes, and you get her flying a
  day later in the same system with the hold gone and half the Cyrite,
  parts and chits (the Krail for the bay stays). The third wreck ends the journey, and so does a wreck
  with Calloway in the system (she takes you). In hardcore, the first.
- **Through.** Reach the Threshold and the journey is over: into the
  Scatter. The panel lists every system flown, how it ended, the Cyrite in
  and out, and where Calloway caught up.
- **The save** (`meta/save.ts`): versioned, in localStorage, written
  whenever the chart is open and when you cast off from a port. Continue on
  the start card starts the current system again with what the save
  carries, or opens the chart if that is where you left off.

Balance: [BALANCE-JOURNEY.md](BALANCE-JOURNEY.md), from
`npm run pilot:journey`.

## Comms cards

The Breakout's main interaction (`content/cards.ts`, `sim/comms.ts`,
`World.answer`, `ui/comms.ts`). Someone opens a channel; the world waits
(`phase: 'comms'`) while you read the card and answer. About thirty cards
come by chance (the first at 24s, then every half minute or so, never in
the middle of a fight, none twice in a system, and the ones that tell a
story once a journey), one on the port's approach (the dock wants an
implant scan), the checkpoint at the lane mouth, and six follow-ups that
only come because of an earlier answer. The journey adds ten more (see
`calloway_here` to `false_trail` in `content/cards.ts`).

- **Kinds.** Trade, plea, job, warning, shakedown, checkpoint, distress,
  rumour.
- **The read.** Their strength against yours (their hulls against your
  plates and fitted guns), who is out there, their cargo, and an intent
  estimate. Many cards have a hidden truth rolled as they open (a distress
  call that is genuine or bait; a seller whose Cyrite is pure or cut); the
  estimate names the right one as often as your sensors are good (65%
  stock, more with deep scanners or Office tech), otherwise another.
- **Choices.** Two to six, each a kind of answer (fight, run, pay, bluff,
  trade, help, refuse). A choice can cost something whatever happens (the
  fee is gone either way), can lose to the truth (the read is the only
  guide), or can be a gamble on odds that move with heat, flags, standing
  and fitted systems (shown as a word: likely, good odds, even odds, long
  shot). Choices that need a system, a flag or a standing are shown greyed
  out with what they need: the torpedo bay opens a bluff on a shakedown,
  forged codes open a spoof at the checkpoint.
- **Outcomes.** Cyrite, ore, chits, parts, food, plates, heat, score, flags,
  standing with six parties (the Custody, the Gutter, Frontier Supply, the
  Dust Traders, Kellern Mining, the miners), hulls that turn up, hulls
  that break off, the blockade (fight, run, pass), a follow-up card, a job,
  a sold survey (veined rock all round for half a minute), days of delay
  for Calloway (`hunt`, negative brings her closer), days the system holds
  the Net out (`stall`), and Calloway's ship (`calloway`: fight or run).
- **Where.** A card can ask for a kind of system, a netted one or not,
  Calloway within so many jumps, or a galley running low. Cerro's own
  story (the foreman, the stowaways, the moon's port scan) asks for the
  home system; the rest travel. Besides chance, follow-up, the port's
  approach and the blockade, a card can come at an open lane mouth
  (`toll`: the Lane Wardens) or with Calloway (`hunt`).
- **Jobs** are paid where they say: at the port on docking (with the goods
  in the hold) or at the lane on the jump. The HUD lists them under the
  objective.
- **Combining.** Lines are added to a card's text when their condition
  holds, and choices appear or not: the same shakedown wants the hold if it
  sits low, lets you pass if the Gutter owes you, and warns you when paying
  would leave you short of the jump. A rumour about the lane captain makes
  her fee cheaper and her more likely to take it; a bar rumour leads to a
  forger, whose codes may be good.
  The panel shows the call and as many of those lines as fit in 24 words
  (`SHOWN_WORDS`, `cardParts` in `sim/comms.ts`); the rest sit one tap behind
  an (i), or the I key. The reading budget caps the call itself at 24 words.
- **Ambushes** do not wait: the world runs at a fifth of its speed under
  the card, and when the bar runs out the default (fight) is taken.
- The arcade's capital-ship hail is drawn by the same panel.

Everyone launches in the same ship: the Wayward, OB-7731-A, a stolen
Obedience-class ore hauler. Over a run she becomes
something else, depending on what you fit in the refit bay: a torpedo
boat, a minelayer, a brawler that rams and arcs, a fortress, an interceptor
that dives through fire. Nothing is a class you pick; it
is a ship you build. The run report names what you built.

The run is a slow burn. The first forty seconds are yours alone, a thin
field of slow rock to learn the ship on and mine the first module out of;
the first hostile is a lone scout. The sky fills in from there, and the
first capital ship hails at 3:30, once the build has a shape.

## The loop

Fly, fight and break rock → collect krail → fit modules in the refit bay
→ harder sky → a capital ship hails (engage or evade)
→ her salvage: her faction's tech opens in the bay → specialisations,
synergies → the hull goes → the run report → play again.

The world pauses itself at each decision (`World.phase`: `hail`, `comms`,
`dock`, `bay`, `over`), and the app or the scripted pilot answers it
(`answerHail`, `answer`, the port's calls, `install` and `closeBay`,
`restart`). Everything else is the existing fixed-step
simulation. In a journey, `over` hands the sortie to the journey
(`World.result`, `endSortie`), and the chart's answer (`plot`) starts the
next one (`World.restart` with a `SortieDef` and the `Carry`).

## Where each system lives

| System | Data | Behaviour |
|---|---|---|
| Upgrades | `content/upgrades.ts` | `sim/build.ts` (stats, figures, the build's name), `sim/stats.ts` (the stat block and caps) |
| The refit bay | `content/web.ts` (the web, costs, ratings), `content/modules.ts` (the yard's modules) | `sim/bay.ts` (what can be fitted, suggestions), `sim/budgets.ts`, `World.openBay` / `install`, `ui/bay.ts` |
| Weapons | the stat block | `sim/weapons.ts` (lasers, torpedoes), `sim/arsenal.ts` (mines, plasma, hull arc) |
| Asteroids | `ROCK_KINDS` in `sim/field.ts` | `Field.topUp` (formations), `World.destroyRock` |
| Krail, Cyrite and pickups | `sim/pickups.ts`, `rockYield` in `sim/breakout.ts` | `World.collect` |
| Enemies | `ALIEN_TYPES`, `FACTION_TRAITS`, `VARIANTS`, `SQUADS`, `ELITES` in `sim/enemies.ts` | the existing tactical AI, `World.spawn` |
| Capital ships | `FACTIONS` in `sim/bosses.ts` | `Command` (contacts, hail, phases, telegraphs, faction movement) |
| Calloway's file | `content/calloway.ts` (tricks, numbers, offers, her face) | `sim/calloway.ts` (the file, her read on your route, offers, the last meeting), `sim/hunt.ts` (the hunch), `World` (the offer, the lane mouth) |
| Named captains | `CAPTAINS`, `PERSONALITIES` in `content/captains.ts`; who names whom in `content/factions.ts` | `sim/captains.ts` (how they come, the card, memory), `sim/notice.ts` (when, the roster), `World` (the meeting), `ui/face.ts` |
| Survival modes | `content/survival.ts`: one row a mode (Drifter, Prospector, Raider) | `World.survival`, read by `sim/director.ts` (the sky), the pursuit and heat, `cutClean` / `destroyRock` (rock), `World.salvage` / `wreck` (wrecks), `pickEncounter` (events, the Raider's skirmish), `buildStats` (the hull), `sim/journey.ts` and `sim/chart.ts` (the voyage) |
| Difficulty | `sim/director.ts` | the sky's multipliers, now the `sky` group of a survival mode |
| Encounters (arcade) | `PACING`, `APPROACHES` in `sim/pacing.ts`; `groupSize`, `lull`, `enemyInterval`, `enemyCap` in `sim/director.ts` | `World.spawn` / `arrive` / `sendHostile`, the approach modes in `moveAlien` |
| Self-repair (arcade) | `SELF_REPAIR` in `sim/repair.ts`; `repair*` in `Stats` | `stepMend` from `World.tick`, the hull row and mode card in `ui/hud.ts` |
| Sector events | `ENCOUNTERS` in `sim/encounters.ts` | `startEncounter` / `stepEncounter` |
| Comms cards | `CARDS`, `FLAGS` in `content/cards.ts` | `sim/comms.ts` (picking, the read, earned choices, resolving), `World.stepComms` / `answer` / `applyOutcome`, `ui/comms.ts` |
| The journey | `content/systems.ts` (system kinds, names, prices) | `sim/journey.ts` (the loop, `sortieDef`, `endSortie`), `sim/chart.ts` (the region, lanes, the Net), `sim/hunt.ts` (Calloway), `meta/save.ts`, `ui/chart.ts` |
| Score and the record | `sim/run.ts`, `sim/tuning.ts` | `World.addScore`, `World.finish` |
| Between runs | `content/unlocks.ts` | `meta/profile.ts` (localStorage), `ui/panels.ts` |

### Adding things

- **An upgrade**: one entry in `UPGRADES`. Give it a branch, tags (what the
  cards read to lean toward a build), requirements, and an `apply` that
  changes the stat block. If it needs a new number, add it to `Stats` and
  `BASE`, cap it in `capStats` if it can run away, and add a row to
  `FIGURES` so its card shows it. A specialisation is `kind: 'spec'` with a
  `group` and `needs`. Each card taken adds one level, up to `max`.
- **A stamp on a module**: one line in `ORIGIN` in `content/papers.ts`,
  with its German in `i18n/de/ui.ts`. Keep it a minority.
- **An enemy**: a new faction pairing of an existing archetype is one row
  in `VARIANTS` (renderer and HUD pick it up). A new archetype is a row in
  `ALIEN_TYPES`, its tactic in `moveAlien`, and a model in
  `render/enemies.ts` `build()`.
- **A shot**: bolts, enemy slugs, plasma and torpedoes are all streaks
  (`render/streaks.ts`): one instanced ribbon, one draw call. A new look is a
  style in `STREAK` and a branch in its fragment shader, not a new mesh.
- **Judging a look or its cost**: the enemy bench, `tools/enemies.html` on the
  dev server (`?view=fleet|close|fire`, `?kind=`, `?n=`, `?quality=`,
  `?frames=N` fills `window.__bench` with draws and triangles).
- **An elite modifier**: one row in `ELITES`, plus the colour of its halo
  in `render/enemies.ts`.
- **A capital ship**: one row in `FACTIONS` (cycles per phase, station,
  wing). A new attack is a telegraph in `Command.telegraph` and an effect
  in `Command.open`.
- **A named captain**: one entry in `CAPTAINS` (a name, rank, ship, the
  faction whose capital ship they fly, a personality, a face, and every
  line: the hail, the ambush, the bargain, turning away, and coming back
  after each kind of meeting), and its id in that faction's `captains` in
  `content/factions.ts`. The tests check every line is there.
- **A trick Calloway learns**: `learn: '<trick>'` on the choice's odds,
  the `card:choice` in `TRICKS` in `content/calloway.ts`, and a `wise`
  line on the card if she should say so.
- **An offer of Calloway's**: one entry in `OFFERS` in
  `content/calloway.ts`, and a rule for when she makes it in `offerFor`.
- **An approach** (how an arcade hull closes in): a row in `APPROACHES`
  (`sim/pacing.ts`: when it opens, its weight by role, its bearings, how it
  fades late) and its goal in the `approach` case of `moveAlien`, or a mode
  of its own beside `patrol` and `watch`. Keep it from firing until it
  commits.
- **A sector event**: a row in `ENCOUNTERS` and a case in `startEncounter`,
  `stepEncounter` and `finish`.
- **A comms card**: one entry in `CARDS`. Give it a kind, a caller, a
  `when` (and `trigger: 'follow'` if only another card leads to it), text
  and conditional lines, `ships` for the read, `truths` if something is
  hidden, and choices with a tone, a hint, `needs` and `cost`, `loseIf` or
  `odds`, and `win` (and `lose`) outcomes. A flag a choice needs gets words
  in `FLAGS`. The tests check every reference, and `tests/reading.test.ts`
  holds each part to a word cap (text 24, hint 15, label 6, win and lose
  12); a few older lines sit over it with their own ceiling, listed there.
- **A consequence of a story flag**: a row in `CONSEQUENCES`
  (`content/consequences.ts`): the flag, the chips the choice shows (what it
  brings, then what it costs, a minus sign for the cost), and what changes
  in play: plate prices by holder, heat near a fleet, the pursuit from
  ahead, days Calloway is held up, and the log lines where it bites. The
  rules are in `sim/consequences.ts`; `sortieDef` and `endSortie` read them.
  A cost makes things dearer or harder, and never shuts a way.
- **A kind of system**: a row in `SYSTEMS` (`content/systems.ts`) and its
  place in `COL_KINDS` (`sim/chart.ts`); a word and a colour in
  `ui/chart.ts` and `ui/hud.ts`. Cards can ask for it with `kind`. Its
  `pace` row gives the pursuit room to breathe: seconds before the first
  pursuer, and the quiet after an answered card or a beaten pursuer. A
  quiet system (a breather) has no pursuit at all, whatever its pace.
- **An unlock**: a row in `UNLOCKS` that grants upgrade, event, modifier or
  cosmetic ids; mark the granted content `locked: true`.

## The refit bay

Both modes build the ship in the **refit bay** (PLAN.md, R; `content/web.ts`,
`sim/bay.ts`, `ui/bay.ts`). The ship leaves with lasers, a shield charge and
the torpedo bay. Krail (crystals from rock and wrecks, times the krail
matrix) is a stock to spend there.

**When it opens.** The ship has an alert in three steps (`World.alert`):
clear (nothing hostile about; the HUD shows nothing), yellow alert (you are
being observed: a hull within 85 units, a watcher looking you over, a
capital ship on its way, none of them attacking) and red alert (you are
being directly targeted, `World.inDanger`: a committed hostile within 60
units, fire close by, a capital ship engaged).
The bay opens in flight only when clear, and always when docked at a port
(the port's list has a line for it, and closing it goes back to the dock),
by B, a pad's Back, the upgrades badge (the Story mode's: lower right, under
the ship panel on touch) or the pause card's button, and the world waits on it. **In the
Arcade the player need not open it:** it opens by itself once the Krail
aboard reaches the price (`World.bayDue`; ARCADE_PRICE, 30) and the alert
has been clear for two seconds (BAY_QUIET), and only if something can be
fitted. Once a pick is made the bay shuts itself and asks again at the
price if Krail is left; leaving without a pick puts the next opening one
price further on (B still opens it sooner; the Arcade HUD has no badge). The Story mode's
bay is the player's call. On yellow or red alert it stays shut and the log
says why in one line ("Bay locked · yellow alert", "Bay locked · red
alert") while the badge shakes. The badge is dim with nothing to fit, amber
with a count of the suggestions you can pay for, yellow or red when locked,
and pulses when one becomes affordable.

**Suggested first.** The bay opens on three suggestions (`quickPicks`):
modules that suit the build (by its tags), a reactor core, heat exchangers
or frame when that budget runs short, cheaper favoured, from different tabs,
at most one new system. Each is a card with one line, the number that
matters and the price on its button: one tap, or 1 2 3. A player who never opens the bay still gets a coherent
ship; one who wants to plan opens a tab: Hull, Weapons, Ordnance, Engines,
Defence, Utility, Signals (the Story mode's), Reactor and Synergies, each a
small web left to right by tier. A module opens
once something it comes from is fitted, then by the upgrade's own rules
(requires, one specialisation per group, a deep enough system). Each level
costs Krail by tier in the Story mode (40, 60, 90, 130; half as much again
a level; the deep torpedo and mine modules cost 0.65 to 0.7 of that, so
ordnance builds keep pace), and the same in the Arcade, whatever the module
or the level (ARCADE_PRICE, 30), and draws
power, mass or heat, against ratings of 8 each (the stock ship draws 5
power, 3 heat, 1 mass). Power is a ceiling; the reactor core (+3 a level)
raises it and is always open until full, so a build never gets stuck, and
nothing comes out once fitted. Mass and heat can be run over, at a price
(`sim/budgets.ts`): over the mass rating the ship loses thrust and helm
(0.7 and 0.55 of the share over, never below 60%); over the heat rating the
laser bank refills, and torpedoes, mines and the hull arc come round, slower
(0.9 of the share over, never below half). The structural frame and the heat
exchangers (+4 a level) raise the ratings. The bay shows it all before an
install: the budgets after, the figures that would suffer in red, and a line
saying what running over costs. A capital ship destroyed opens her faction's tech in Synergies. The
HUD's Krail row counts toward the cheapest module in reach and lights the
bay's key when one can be fitted.

**The yard (the Story mode).** The ship's four systems' modules
(`content/modules.ts`: Guns, Rig, Signals, Contacts) are nodes of the same
web, marked `story` and `yard`: fitted only while docked, for Krail and the
yard's fee in chits (each module's own, 10 to 30 a mark). The structural
frame, and the reactor core's third level, are yard work in the Story mode
too (`YARD_FEE`, 15 chits a level), so ports keep their pull. Away from a
port they show "Fitted only at a port". The marks fitted in each system
still name the ship and open endings.

**The ship's console** (`ui/ops.ts`, `ui/briefing.ts`). The bay and the
pause card show the HUD's alert as one word (`◆ Clear`, `◆ Yellow alert`,
`◆ Red alert`, and `◆ Critical` at one plate; the pause card shows only the
two alerts), the pause card wraps the
briefing in a rule, a line of the ship's voice and a line of readings. In the
bay the tabs carry marks (amber fitted, red over a rating through something
fitted there), Install names its price, the figures read as large
before → after blocks, and a fit lights the module and bumps the figures it
moved. The ship behind it is the protagonist: with the bay open the camera
comes in and the tab lights its part of the ship in amber (`ShipView.light`,
marks per tab in `render/ships.ts`); the pause card wakes a little of each
and the lights ease out on resume. Ratings read from 80% (a tick, then
`▲ Warning`, `▲ Over limit`, power `▲ Full`), and an install counts the
Krail down and runs a line from the module to the ship's lit part
(`BayPanel.installFx`). The ship's computer picks (`sim/advice.ts`: the
firmest three get a ◆ and a reason) and the build's profile (`sim/profile.ts`)
sit in the bay; the Story's cards carry the reason too. The ship speaks one line (`content/voice.ts`, picked in `sim/voice.ts`)
under the bay's title and on the pause card. The web's links are
conduits with forks and joins drawn as junctions (`BayPanel.web`). The rest is in PLAN.md (the console pass).

**Used, not dirty** (`docs/ART-PASS.md`). History in small doses on top of the
console. A module can carry a stamp for where it came from (`content/papers.ts`
`ORIGIN`: Obedience spec, Salvaged, Field mod, Non-OEM, Aftermarket, Repaired,
Unknown origin, Continuance property); about a quarter of the web has one, a
test keeps it a minority, and no rule reads it. Each tab carries one mark for
its state (`sim/papers.ts` `tabMark`: ▲ overloaded, ! damaged, ◐ upgrade
ready, ● stable, — offline), and its word heads the tab's web. A fit makes
the changed ratings tick from their old figure (`ui/tick.ts`) with the old one
struck beside it for a moment, and the ship answers in its voice line
(`Module compatibility: accepted`, or `Component: not factory spec` for a
stamped part). The ship's papers sit in small print along the web and on the
pause card (registry flagged, operator unregistered, factory against current
profile, a repair log that no longer reads). Pop-up kickers speak as the ship
(`Ship system`, `Warning`, `Continuance signal`). The wordmark is stencilled
with ties and a ghost of its first paint; no new fonts.

The pause card (`#pause`, styled as `.pause-card.term`) is a terminal readout:
mono for the machine's words (id line, rules, keys, the foot), Barlow
Condensed for what you do, Barlow Semi Condensed for the sentence. Sections
are `.term-s` with a `.th` rule; add a line to Orders, not a new box. No
icons on it. The state word comes from `ui/ops.ts` as everywhere else.


## The upgrades

What the bay's nodes do (`content/upgrades.ts`; their rules in
`sim/build.ts`). Each says what it fits (the branch and its icon), the name,
one sentence, its level as pips, and the numbers it changes, before → after.

Kinds:

- **Upgrade**: a step up a stat ladder (up to five levels).
- **System**: switches a weapon or device on (the torpedo bay, the mine
  layer, the plasma vent, the hull arc, deflector shields).
- **Specialisation**: one per branch per run, once the branch is deep
  enough; it decides what the ship is called.
- **Synergy**: needs both halves fitted.
- **Salvaged tech**: opens only once that faction's capital ship is
  destroyed this run (in the Story mode, this journey).

The branches:

- **Lasers**: damage, rate, bank, reach, pierce. Specialise into a
  **cone** (fans of three, then five or seven), the **heavy lance** (slow,
  piercing, huge) or the **targeting array** (lances that bend onto the
  hull nearest the nose).
- **Torpedoes** (button 2): magazine, yield, tracking. Specialise into a
  **heavy payload** (with cluster warheads), the **swarm** (three
  micro-torpedoes spread across targets; unlockable) or **precision
  guidance** (all-round locks, faster, harder on hulls; with a target
  painter that marks laser hits).
- **Mines** (laid in your wake): yield, racks, proximity seekers.
  Specialise into a **minefield**, **chain reaction** (blasts set off mines
  near them and leave a burning cloud) or **graviton mines** (pull targets
  in; unlockable).
- **Drive plasma** (a burning trail while you thrust): heat, flow.
  Specialise into **ignition** (targets keep burning), the **afterburner
  wake** (the roll dumps a ring of plasma) or the **plasma corona** (plasma
  wreathes the bow and flanks while you thrust).
- **Close quarters**: the **hull arc** (lightning to anything close), arc
  capacitors and reach, and the **ram prow** (a ram that destroys its
  target costs no hull). Specialise into the **arc storm** (each arc jumps
  on to one more hull), the **shock prow** (a ram discharges into the hulls
  near its target) or the **juggernaut** (unlockable).
- **Mobility**: main drive, thrusters, dampers, evasive jets (the roll comes
  round sooner and covers longer). Specialise into
  the **drift drive** (keep speed off the throttle; lances fired while
  drifting hit a third harder), the **evasive pattern** (a longer roll that
  comes round much sooner) or the **afterburner** (a much higher top speed).
- **Defence**: **deflector shields** (a charge that takes one hit, then
  recharges), regenerators, ablative armour (+1 plate), bulkheads (longer
  grace), damage control (one save). Specialise into the **fortress**,
  **reactive armour** (losing a plate or a shield blasts away nearby fire),
  or the **regenerative hull** (unlockable).
- **Utility**: tractor reach, the krail matrix (more XP), the tactical
  computer (every weapon hits harder). Specialise into the **prospector**
  (rock gives krail half as often again), **salvage drones** (more hull
  repairs, longer power-ups) or **deep scanners** (rare rock twice as
  often, elites carry twice the krail).
- **Reactor** (a bay tab, not an upgrade branch): the reactor core and the
  heat exchangers raise the ship's power and cooling. There is no
  overcharge any more (removed 2026-10-07): the meter, the release key,
  grazing, the phase cloak, core nova, weapons overload and core-charged
  mines all went with it.
- **Synergies** (needing both halves): plasma warheads, laser detonators,
  the capacitor shield, arc warheads, and the ramjet
  (unlockable).

**Salvaged tech**, one per faction: Gutter **disruptors** (every fourth
laser shot a heavy bolt at triple damage), Custody **compressors**
(longer, piercing lances; wider torpedo blasts), the Office **cloak** (a
barrel roll hides you: hulls hold their fire for a moment), the Voice
**adaptive shield** (shields recharge faster; a ship with none gets one) and
Thren **snares** (torpedo and mine blasts slow the hulls they catch).

### Numbers and caps

Every upgrade changes one flat stat block, rebuilt from scratch whenever
the build changes; `capStats` clamps it after every multiplier has run, so
no stack of upgrades escapes a cap. The bay shows the figures a level
changes, computed by diffing the block before and after. A run touches a few
ship-wide numbers too: all weapon damage (the tactical computer, capped at +60%),
krail from rock, repair drops, power-up time, rare rock and elite
loot.

## Defence, damage and repair

The hull is plates: three to start, five at most. A hit takes a plate and
gives a moment of grace; a deflector charge takes the hit instead (with a
shorter grace, so one charge never eats a volley). Repairs are rare on
purpose: a small chance from a kill, never on a full hull, never more than
one every 35 seconds, one from each capital ship destroyed, and one for
answering a distress signal. Damage control saves the last plate once.

**Self-repair** (the arcade, `sim/repair.ts`): once the ship has gone
`repairDelay` seconds without damage, the next plate fills slowly (one in
`1 / repairRate` seconds), up to `repairMax` plates in one quiet spell. Danger
near (a hostile that has committed to a fight inside `SELF_REPAIR.danger`,
enemy fire close by, a capital ship engaged) holds it where it is; a hit
throws the plate in progress away. It is a reason to break off a fight and
look for quiet, not a substitute for pickups or the shield: at stock, about
one plate per lull. On screen the plate fills in teal and pulses, the mode
card says Self-repair, sparks fly off the plating, and the log says when a
plate is done. Repair drones (defence, three levels) make it start sooner,
work faster and mend a second plate a spell; the regenerative hull works
with hostiles close. The Story mode keeps its own repair: parts patched into
a plate when you are left alone.

## The kill chain

The **kill chain** is score only:
each hull kill inside a short window adds one; breaking rock keeps it alive.

## The sector

**Rock** comes in kinds and formations, mixed by the director: basalt;
iron (from about 3:00, three times the hull, splits into more iron); rich
(violet veins, a shower of krail); volatile (from about 5:00, goes off
when broken, you included); rare (gold, a power-up inside, one every minute
or two); singles, clusters, and a big rock in its own debris.

**Salvage cells** (the power-ups) are never drawn from a hat: each place
gives the cell its work suggests (`CELL` in `sim/pickups.ts`). Rare rock
holds a tractor surge, a rescued crew lends an emergency shield, a derelict
a charged shield, an elite's wreck its fire control (rapid fire), a capital
ship's wreck its drive (overdrive). The pickup and the note say what it
does in a line (`POWER_HINT`); a new cell is a row in each table.

**Enemies**: seven archetypes from the original, by behaviour (scouts
strafe past, raptors line up and ram, lancers broadside from cover,
warbirds snipe with plasma that can be shot down, stalkers sit on your tail
and lead, drones grind in and cut with beams, weavers lay webs), plus a
freighter for convoys. **Faction traits** apply to any hull: Gutter crews are
faster and fire more, Custody cutters reach further, Office ships cloak while they
reposition and decloak to attack, the Voice adapt, the Thren leave webs.
**Variants** cross them (the Office Whisper, the Custody Picket, the
Voice probe, the Thren shard cruiser). **Squads** arrive together because
together they are worse (a weaver with two raptors). **Elites** are
familiar hulls with a modifier: armoured, swift, volatile, gunner, cloaked,
regenerative, web-spinner.

**Bulwarks** (`sim/field.ts`, numbers in `sim/tuning.ts`) are the field's
big rocks. They stop fire from both sides, hurt to fly into and give heavy
hulls cover, but guns, blasts and plasma now wear them down: 100 hit
points at the smallest and 170 at the largest, the weight of 25 to 42 large
rocks. A broken one bursts into debris (one or two large rock, four or five
medium, five to seven small) and scores 400, and a new bulwark drifts in
from the fog 25 seconds after.

**The director** (`sim/director.ts`) is the one place difficulty is
decided, as smooth functions of run time. The opening is a slow burn: the
field starts at half its old density with slower rock (and five bulwarks,
not seven), and no hostile shows up for forty seconds. Density, speed and
toughness climb from there; variety opens over five minutes; from two and a
half minutes elites appear, from three squads, and from four the factions
mix, so the build-up starts before the first capital ship rather than with
it. A faction's first capital ship of a run is lighter (`INTRO_HP`), and the
Voice and the Thren, whose beams and webs read hardest, are not dealt until
6:40 and 5:40. Late, the
enemy ceiling levels off while elites, squads and hazardous rock keep
coming, so difficulty comes from combinations, not counts.

**Encounters** (`sim/pacing.ts`, the arcade): hostiles come in groups with
quiet between, not as a steady stream. A group is `groupSize` hulls (one at
first, growing with the clock, and a tenth of a hull more per refit taken),
arriving `enemyInterval` seconds apart (a pair of interceptors or a squad
counts as several). Once every one of them is destroyed, gone, or left
behind past the cull ring, the sector goes quiet for `lull` seconds (about
18 at the start, 9 from eight minutes; Quiet running stretches it). A group that
drags on 45 seconds past its last arrival breaks off. A capital ship's fight
is an encounter too, with a quiet spell after it. The log says when contacts
are inbound and when the sector is quiet again.

No hull arrives in front of the ship: each comes from a bearing at least
`noseClear` off the nose, 120 to 150 units out. How it closes is its
**approach**: *patrol* (flies its own beat across the space ahead, turns on
you only if you come within `notice` units or shoot it, leaves after a
while), *investigate* (holds beyond gun range, facing you, for a few
seconds, then commits, or, if never shot at, sometimes moves on), *circle*
(orbits at that distance, then commits), *flank* (comes round to your beam
or quarter first), *intercept* (heads for where you will be) and *direct*.
None fires before it commits. The opening minute is only patrols and
investigators; the committing approaches open over the next two minutes,
and the lookers thin out as the run goes on. The mode card reads "Being
watched" and "Patrol near", and the log names a hull that has seen you.

## Capital ships

From 3:30, a contact every 50 to 80 seconds. A yellow alert, then the hail:

- **Engage**: regular traffic clears out; the capital ship drops in with
  its wing and fights in three phases (each adds its faction's signature
  attack, calls reinforcements and quickens the cycle). Every attack winds
  up behind a telegraph: lines where a charge or volley will go, rings
  where a nova bursts, circles where shells or webs will land. Destroy it
  for the bounty, krail, a hull repair and a power-up, and her faction's
  tech opens in the bay.
  Let its fuse run out and it leaves with nothing paid.
- **Evade**: no fight, no reward, and the next contact comes sooner. You
  cannot evade twice running; a Voice foundry cannot be evaded; Office ships never
  hail (they decloak and the fight starts). The first contact of a run is
  always Gutter or Custody.

Each faction moves its own way: Gutter crews sway across your bow and charge,
Custody cutters hold long range and wheel, Office ships vanish and reappear on your
quarter, the foundry grinds closer, the Thren circle.

### Named captains

On the journey, once a faction has noticed the Wayward enough (its notice at
the captain tier, `sim/notice.ts`), it names someone: one of the capital
ships above, under a captain with a name, a face and a memory. They find you
a minute or so into a system, once they have rested after the last meeting.
Beaten twice, or killed, and they are gone: the faction's next captain takes
up your file.

- **How they come** is their personality: a duelist or a zealot announces
  and fights; a broker would rather be paid; an ambusher comes out of the
  rock (the card slows the world, and doing nothing is a fight); a cautious
  captain may look at a ship that outguns theirs and turn away without a
  word. The card shows their face, and choices to fight, run for it (a
  gamble), pay them off (if they deal) or run out the guns (if they can be
  made to leave).
- **What they remember** changes them: a captain who wrecked you comes back
  bolder and dearer; one whose ship you broke and who got off it comes back
  with a grudge (an ambush, a heavier ship, no deals, a scar on the face);
  one who broke off comes back with a bigger wing; running works less each
  time; the price goes up every time you pay; and nobody turns away twice.
  A captain who goes down with the ship is gone, and someone else comes.

### Calloway's file

Calloway is the nemesis above the captains: she follows the trail
(`sim/hunt.ts`) for the whole journey, and keeps a file on you
(`sim/calloway.ts`, numbers and offers in `content/calloway.ts`). The chart
shows what is in it.

- **Tricks.** Every way you get away from her is counted, won or lost: a
  false heading, "the file is out", the ore pods, going dark, a false
  flight plan, a Drift fleet lying for you, running, fighting. Each one she
  has seen takes 15 points off its odds the next time (a choice's
  `odds.learn`), and her cards say so ("I know what ore pods look like
  now"). Running from her twice brings a bigger wing; every beating her
  ship takes, a heavier ship.
- **Your route.** After three systems she reads your habits: the kind of
  system you keep stopping in (half of them or more), and whether you go
  straight for the Threshold. Where you are predictable she skips the
  third of a day she spends asking questions, so she gains on you there.
- **What you care about.** Your answers to everyone else (help, trade,
  fight) say what matters to you. With what you have told her and who you
  know, that picks her offers: to meet (if you have told her the truth),
  a name in the Gutter for three days (if you have a friend there), a
  truce on Custody and Office kills (a fighter), a full tank for your
  heading (a trader), or a way home with a hearing, not a cell (anyone). One every four
  days at most, each once a journey, a minute into a sortie once you have
  flown two systems and she is two jumps behind or has caught you.
- **Trust.** The truth told her and offers taken, less lies and any word
  broken (kill her people after promising not to, and she says so).
- **The last meeting.** Plot the jump to the Threshold and she is waiting
  at the lane mouth instead of following. The card is built from the file:
  what she says (never met, the lies she counted, the word you kept or
  broke, the route she read, the ship rebuilt for you), the ship she
  brings, and the ways past: fight, spool under her guns, show her the
  archive (if you ever told her the truth; the odds are her trust), remind
  her how the fights went (if her ship was beaten twice), and the bluff or
  the dark run if you used them on her before, at the odds she has learned.
  How it ended goes in the log and on the end panel.

## Sector events

When no capital ship is about, roughly once a minute: a mineral-rich field,
a distress signal (hold the beacon circle for a repair), an enemy convoy
(freighters heavy with krail), an ion storm (lightning on the circles), a nebula (sensors down: short radar and locks), and, once unlocked, a derelict hulk (salvage, then an ambush) and
a spatial anomaly (a gravity well that crushes what reaches its core).

## The run report and progression

The report compares the run with your best (survival, refits, kills, chain,
krail, capital ships, events), shows the ship as built,
what did the killing and what did the damage, the score curve against your
best run's, and any unlocks earned. Long-term progression opens options,
never power: locked specialisations, a synergy, two sector events and
engine colours. The survival mode (below) is always open. The logbook on the start screen shows the
hint for every unlock still locked.

## Survival modes

Chosen on the start screen under Start, before a run: Drifter, Prospector
(the default and the baseline) or Raider. A mode is not a difficulty. Each
changes what the game is about, and each is one row in `content/survival.ts`
that the systems read; nothing else asks which mode it is. To rebalance a
mode, change its row. A multiplier of 1 changes nothing and draws no random
numbers, so Prospector's Story plays exactly as it did before modes. Its
Arcade sky is set above 1 (about double the hulls and toughness, 1.4 times
the fire, twice the elites, and a quarter off the Arcade's Krail income, which
the Story never reads) to answer the 30-Krail bay; see the calibration
in BALANCE-SURVIVAL.md.

- **Drifter.** Calmer skies (fewer hulls, fewer elites, longer gaps between
  pursuers, slower heat), richer rock, cheaper lanes, a bigger start, a
  tougher hull, and four wrecks before you are adrift. Explore and follow the
  story.
- **Prospector.** Mine Krail, manage Cyrite, trade, run or fight.
- **Raider.** Rock is thin and loud (cutting adds more heat), wrecks are rich
  and last longer, and the sector sends a skirmish: two crews fight each
  other, ignore you until you come close or shoot, and leave their wrecks.
  A wreck in the Story holds parts, Cyrite and ore by the hull that died
  (a fighter little, a cruiser cells, a hauler its hold); Prospector's holds
  parts and Krail only. Find a fight, outlast it, strip what it left, sell
  what you cannot use.

The mode is saved with the profile (the title remembers it) and with the
journey (a journey keeps its mode; the title cannot change it, and says so).
A run's mode is fixed when it starts. Old saves: Easy becomes Drifter, Hard
(and Hostile Skies) becomes Raider, anything else Prospector. Numbers and
their evidence: [BALANCE-SURVIVAL.md](BALANCE-SURVIVAL.md).

## Balance

Balanced with telemetry, not intuition. `npm run pilot` flies the scripted
pilot (`tools/pilot.ts`) through 120 seeded runs (12 per build strategy) and
writes [BALANCE.md](BALANCE.md): survival and refits per strategy, plates
lost against plates gained per minute, every source of damage (down to the
variant or the capital ship's attack), capital-ship fights, pacing and the
builds made. The pilot plays through the same API as the app: it reacts to
new fire a person's 0.2s late and keeps its goal safe with a 1.2s
look-ahead. Twelve runs a strategy leave about a minute of noise on the
long builds; settle a close call with more (`PILOT_RUNS=48`).

What the telemetry changed, in order:

1. Krail income was a third of what the pacing needed; rock and hulls
   now yield more and the first refits come sooner.
2. Scouts flew their attack runs through the ship; they now strafe past
   just above it (ramming is the raptor's job).
3. A capital ship that rammed you kept grinding through you; a ram now ends
   the charge and the two rebound apart.
4. Capital-ship arrival could be outrun forever; it now completes on a clock.
5. The ram prow made rock, the top damage source, free; it now breaks only
   small and medium rock.
6. Volleys re-aimed every shot, so their telegraph lied; they now fire down
   the lines they telegraphed (only the last phase tracks, slowly). The
   spiral was thinned for the low chase camera.
7. The opening wore the ship down before the first fight; the field starts
   thinner and thickens over the run.
8. Moving the first contact later let the Voice foundry be the first capital
   ship; faction order now follows contact order.
9. Beams kept tracking at full rate while cutting and could hit twice per
   cut; they aim during the wind-up, sweep slowly while cutting, and
   discharge on the hull they hit.
10. A capital ship's station swung through you when you turned; it now goes
    round you unless it is charging.
11. Focused laser and defence builds trailed builds with systems; the
    laser ladder and shield recharge were strengthened. Plasma, the
    weakest family, reaches a little higher and burns hotter.
12. The refit web let a build take exactly what it wanted, and the first
    pass found close-quarters builds lasting the whole fifteen minutes:
    shields stacked to three charges on a nine-second recharge, and the
    arc's damage minors stacked on its capacitors. Shields now cap at two
    charges and twelve seconds (Voice tech speeds the recharge instead of
    adding a charge); arc damage caps near the card era's best, the arc
    storm jumps once, chains fall off faster and rock takes half; ram
    damage caps at 18.
13. Builds with no weapon region starved; the pilot now keeps its lasers
    up in them, as a player would. Mines are laid a little more often.
14. The slow-burn pass (a slow-burn opening, three cards instead of the
    web): the first minute now costs 0.02 plates (it was 0.26), but one
    card a refit is less power than two web points, and the first capital
    ship, now at 3:30, killed a third of the pilots that met it. Refits come
    about a sixth sooner (refit 10 at about six minutes), and the first
    capital ship carries a fifth less hull; later ones are unchanged.
15. Close quarters with defence was the build to beat in the web era, but
    it was the only weapon the matrix paired with defence. Paired the same
    way, torpedoes outlast it (eight to ten minutes against about six and
    a half), and close quarters without defence lasts about four, the
    shortest of the weapons. So close quarters was left alone: the defence
    region is what multiplies survival, and the matrix now carries
    torpedoes with defence and close quarters with lasers to show it. The
    pilot also stopped flying its prow into hulls it would not break: it
    judges a ram by what it does at the speed it is flying.
16. Mobility gave a steady player little. Evasive jets now lengthen the
    roll's cover, and the four mobility stats each charge the core a little
    faster on near misses (the interceptor's gun is the release): mines with
    mobility went from about four and a half minutes to five and a half or
    six; mobility with the core moved only a few seconds. A roll's cover now
    ends by four fifths of the way to the next roll: with every jet and the
    evasive pattern, rolling on the cooldown kept the ship covered without a
    gap, a strategy the pilot never finds.

Where it stands (see BALANCE.md for the current report): a quiet opening
(0.03 plates in the first minute, 0.3 to 0.5 in the next two) climbing to
about 0.8 by minutes three to five and past one after that. What spreads the
table is defence: builds with it last about six and a half to ten minutes
(torpedoes longest, two runs in twelve reaching the cap), builds without it
about four to six (close quarters with lasers shortest). The random-card
player lasts about six; mobility with the core about four and three
quarters, mines with mobility about five and a half. No damage source above
about 10%; capital ships destroyed in three fights of five; refit 1 at about
ten seconds, refit 5 at 2:40, refit 10 at 6:20. Next: the defence region,
where shields soak about ten hits a run in the longest build. The pilot is a
steady player, not a strong one; expect people to last longer.
