# Game design

This describes the game as it plays today: the Breakout (M1 of
[PLAN.md](PLAN.md)), and the arcade run it grew out of, which stays as a mode.
See [VISION.md](VISION.md) for where it is going.

## The Breakout

A sortie with a shape: get the stolen hauler out of the home system
(`sim/breakout.ts`, `World` with `mode: 'breakout'`).

- **The course.** The lane mouth is 2,600 units ahead of the start (about a
  minute flat out); Frontier Supply, the port, is halfway and off the line.
  The HUD carries both as pointers, radar diamonds, a contacts list and the
  objective's steps.
- **The jump.** Inside the lane mouth with 20 Krail in the tank (`JUMP_COST`),
  the drive spools for five seconds; leave the ring and it winds down. The
  jump takes the Krail and ends the run as an escape.
- **Krail is fuel, and scarce.** Only veined (rich) rock and the rare gold
  rock carry it, cut clean; the guns break a rock for 30% of what is in it
  (`rockYield`). The tank starts at 6.
- **The cutter** (`sim/mining.ts`), on its own held trigger: the rock under
  it heats; once warm the cut goes in; past the line the rock fractures. A
  small rock comes out clean in one hold; a large one needs the beam pulsed.
  Heat and the cut belong to the rock. The lasers hold while it runs.
- **Ore** fills the hold (40) and the refit rail (each unit counts 1.7), and
  sells at the port. **Parts** come from wrecks; six of them patch a plate
  once the ship has gone six seconds unhit. Random repair drops are off.
- **The port.** Slow inside its ring for a second and the clamps take you
  (`phase: 'dock'`): sell the hold (2 chits an ore), buy Krail (5), patch a
  plate (30), pay for a refit (60, three cards there and then). The first
  dock takes 0.2 off the hunt pressure.
- **Hunt pressure** (`heat`, 0 to 1) climbs with time, kills (Custody kills
  more) and the cutter's noise. It decides how often pursuers come, how
  many at once and which: pickets, then cruisers, enforcers and, late,
  interdictors, all Custody, from behind (38s apart down to 10s, one to
  three at once); now and then
  a Gutter crew from ahead. It is also the clock the difficulty curve reads
  (heat 1 plays like seven minutes of the arcade).
- **The blockade.** Within 420 units of the lane mouth a Custody capital ship
  hails, with three times the hull of an arcade run's first capital ship
  (`BLOCKADE_HP`). Engage: the usual three-phase fight, and her wreck pays Krail, parts
  and a salvage refit. Run it: no fight, but the hunt pressure goes to full
  and four more hulls come at once.

Balance: [BALANCE-BREAKOUT.md](BALANCE-BREAKOUT.md), from
`npm run pilot:breakout`.

Everyone launches in the same ship: the Wayward, OB-7731-A, a stolen
Obedience-class ore hauler. Over a run she becomes
something else, depending on the cards you take at each refit: a torpedo
boat, a minelayer, a brawler that rams and arcs, a fortress, an interceptor
that dives through fire to charge its core. Nothing is a class you pick; it
is a ship you build. The run report names what you built.

The run is a slow burn. The first forty seconds are yours alone, a thin
field of slow rock to learn the ship on and mine the first refit out of;
the first hostile is a lone scout. The sky fills in from there, and the
first capital ship hails at 3:30, once the build has a shape.

## The loop

Fly, fight and break rock → collect krail → the gauge fills → refit
(three cards, take one) → harder sky → a capital ship hails (engage or
evade) → her salvage: a refit led by her faction's tech → specialisations,
synergies → the hull goes → the run report → play again.

The world pauses itself at each decision (`World.phase`: `refit`, `hail`,
`over`), and the app or the scripted pilot answers it (`choose`,
`answerHail`, `restart`). Everything else is the existing fixed-step
simulation.

## Where each system lives

| System | Data | Behaviour |
|---|---|---|
| Upgrades | `content/upgrades.ts` | `sim/build.ts` (stats, figures, the build's name), `sim/stats.ts` (the stat block and caps) |
| Refit cards | `content/upgrades.ts` | `sim/offers.ts` (which three cards a refit deals), `World.choose`, `ui/refit.ts` (the cards) |
| Weapons | the stat block | `sim/weapons.ts` (lasers, torpedoes), `sim/arsenal.ts` (mines, plasma, hull arc) |
| Asteroids | `ROCK_KINDS` in `sim/field.ts` | `Field.topUp` (formations), `World.destroyRock` |
| Krail and pickups | `sim/pickups.ts` | `World.collect`, `World.gainXp` |
| Enemies | `ALIEN_TYPES`, `FACTION_TRAITS`, `VARIANTS`, `SQUADS`, `ELITES` in `sim/enemies.ts` | the existing tactical AI, `World.spawn` |
| Capital ships | `FACTIONS` in `sim/bosses.ts` | `Command` (contacts, hail, phases, telegraphs, faction movement) |
| Difficulty | `sim/director.ts` | read by the field, spawner, guns and capital ships |
| Sector events | `ENCOUNTERS` in `sim/encounters.ts` | `startEncounter` / `stepEncounter` |
| Score and the record | `sim/run.ts`, `sim/tuning.ts` | `World.addScore`, `World.finish` |
| Between runs | `content/unlocks.ts` | `meta/profile.ts` (localStorage), `ui/panels.ts` |

### Adding things

- **An upgrade**: one entry in `UPGRADES`. Give it a branch, tags (what the
  cards read to lean toward a build), requirements, and an `apply` that
  changes the stat block. If it needs a new number, add it to `Stats` and
  `BASE`, cap it in `capStats` if it can run away, and add a row to
  `FIGURES` so its card shows it. A specialisation is `kind: 'spec'` with a
  `group` and `needs`. Each card taken adds one level, up to `max`.
- **An enemy**: a new faction pairing of an existing archetype is one row
  in `VARIANTS` (renderer and HUD pick it up). A new archetype is a row in
  `ALIEN_TYPES`, its tactic in `moveAlien`, and a model in
  `render/enemies.ts` `build()`.
- **An elite modifier**: one row in `ELITES`, plus the colour of its halo
  in `render/enemies.ts`.
- **A capital ship**: one row in `FACTIONS` (cycles per phase, station,
  wing). A new attack is a telegraph in `Command.telegraph` and an effect
  in `Command.open`.
- **A sector event**: a row in `ENCOUNTERS` and a case in `startEncounter`,
  `stepEncounter` and `finish`.
- **An unlock**: a row in `UNLOCKS` that grants upgrade, event, modifier or
  cosmetic ids; mark the granted content `locked: true`.

## The refit: three cards

The refit used to be a web of about two hundred nodes to route across. It
was too much: a map, an inspector and points to bank, every thirty seconds.
Now a full gauge deals **three cards** and you take one; that is the whole
decision, made in a few seconds, and the run keeps its pace. The cards are
meant to feel like help, not a slot machine:

- the first two lean toward what the build already is (by the tags it
  carries); the third is usually a **new direction**, from a branch the
  build has not taken, so there is always a way to change course;
- while the ship has fewer than two **systems** (torpedoes, mines, plasma,
  the hull arc, shields), one card is always a system: the early refits
  are the ones that change how the ship plays;
- when a branch is first deep enough, that refit is its
  **specialisation**: its two or three specialisations side by side, once;
- **battle salvage** (a capital ship destroyed) deals a hand led by her
  faction's tech, while it is new.

Each card says what it fits (the branch and its icon), what kind of change
it is (new system, upgrade, specialisation, synergy, salvaged tech, new
direction), the name, one sentence, the module's level as blocks with the
one it adds lit, and the numbers it changes, before → after.

Card kinds:

- **Upgrade**: a step up a stat ladder (up to five levels).
- **System**: switches a weapon or device on (the torpedo bay, the mine
  layer, the plasma vent, the hull arc, deflector shields).
- **Specialisation**: one per branch per run, once the branch is deep
  enough; it decides what the ship is called.
- **Synergy**: needs both halves fitted.
- **Salvaged tech**: dealt only once that faction's capital ship is
  destroyed this run.

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
  round sooner and covers longer); each also charges the core a little
  faster, since the interceptor's gun is the release. Specialise into
  the **drift drive** (keep speed off the throttle; lances fired while
  drifting hit a third harder), the **evasive pattern** (grazing fire
  mid-roll counts double and refunds the roll) or the **afterburner**
  (more thrust; near misses near top speed count double).
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
- **Reactor**: coils (more overcharge from near misses). Specialise into
  the **core nova**, **weapons overload** (longer, and refills racks) or
  the **phase cloak** (unlockable).
- **Synergies** (needing both halves): plasma warheads, laser detonators,
  the capacitor shield, arc warheads, core-charged mines, and the ramjet
  (unlockable).

**Salvaged tech**, one per faction: Gutter **disruptors** (every fourth
laser shot a heavy bolt at triple damage), Custody **compressors**
(longer, piercing lances; wider torpedo blasts), the Office **cloak** (a
barrel roll hides you: hulls hold their fire for a moment), the Voice
**adaptive shield** (shields recharge faster; a ship with none gets one) and
Thren **snares** (torpedo and mine blasts slow the hulls they catch).

### On screen

The cards come up by themselves when the gauge fills (after a beat of slow
motion) and after battle salvage; refits earned together are dealt one
after another. Keys 1 2 3 take a card outright; arrows or Tab move the
selection and Enter takes it; a tap or a click takes one; a pad moves with
the stick and takes with A. The HUD steps back while the cards are up.

### Numbers and caps

Every upgrade changes one flat stat block, rebuilt from scratch whenever
the build changes; `capStats` clamps it after every multiplier has run, so
no stack of upgrades escapes a cap. A card shows the figures it changes,
computed by diffing the block before and after. A run touches a few
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

## The reactor and the chain

Near misses charge the core: fire that passes close without hitting, rock
skimmed at speed, hulls passed close aboard, beams and webs brushed (each
counts once). Full, it releases on **E** (gamepad Y, touch **Core**): a
nova that damages everything near (scaling with refits), clears enemy fire,
and runs the guns hot for a few seconds. The **kill chain** is score only:
each hull kill inside a short window adds one; breaking rock keeps it alive.

## The sector

**Rock** comes in kinds and formations, mixed by the director: basalt;
iron (from about 3:00, three times the hull, splits into more iron); rich
(violet veins, a shower of krail); volatile (from about 5:00, goes off
when broken, you included); rare (gold, a power-up inside, one every minute
or two); singles, clusters, and a big rock in its own debris.

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

**The director** (`sim/director.ts`) is the one place difficulty is
decided, as smooth functions of run time. The opening is a slow burn: the
field starts at half its old density with slower rock (and five bulwarks,
not seven), no hostile shows up for forty seconds, and then they come one
at a time, scouts only, until about a minute and a half (interceptors pair
up only after that). Two or three by two minutes; density, speed and
toughness climb from there; variety opens over five minutes; from four
minutes elites and squads appear, and from five the factions mix. Late, the
enemy ceiling levels off while elites, squads and hazardous rock keep
coming, so difficulty comes from combinations, not counts.

## Capital ships

From 3:30, a contact every 50 to 80 seconds. A yellow alert, then the hail:

- **Engage**: regular traffic clears out; the capital ship drops in with
  its wing and fights in three phases (each adds its faction's signature
  attack, calls reinforcements and quickens the cycle). Every attack winds
  up behind a telegraph: lines where a charge or volley will go, rings
  where a nova bursts, circles where shells or webs will land. Destroy it
  for the bounty, krail, a hull repair, a power-up and a salvage refit
  led by her faction's tech.
  Let its fuse run out and it leaves with nothing paid.
- **Evade**: no fight, no reward, and the next contact comes sooner. You
  cannot evade twice running; a Voice foundry cannot be evaded; Office ships never
  hail (they decloak and the fight starts). The first contact of a run is
  always Gutter or Custody.

Each faction moves its own way: Gutter crews sway across your bow and charge,
Custody cutters hold long range and wheel, Office ships vanish and reappear on your
quarter, the foundry grinds closer, the Thren circle.

## Sector events

When no capital ship is about, roughly once a minute: a mineral-rich field,
a distress signal (hold the beacon circle for a repair), an enemy convoy
(freighters heavy with krail), an ion storm (lightning on the circles;
near misses charge double), a nebula (sensors down; the core charges
faster), and, once unlocked, a derelict hulk (salvage, then an ambush) and
a spatial anomaly (a gravity well that crushes what reaches its core).

## The run report and progression

The report compares the run with your best (survival, refits, kills, chain,
krail, overcharges, capital ships, events), shows the ship as built,
what did the killing and what did the damage, the score curve against your
best run's, and any unlocks earned. Long-term progression opens options,
never power: locked specialisations, a synergy, two sector events, three
challenge modifiers (ironman, glass cannon, hostile skies, each with a score
multiplier) and engine colours. The logbook on the start screen shows the
hint for every unlock still locked.

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
