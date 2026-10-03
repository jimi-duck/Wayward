# Game design

Everyone launches in the same Defiant. Over a run the ship becomes something
else, depending on the refits taken: a torpedo boat, a minelayer, a
brawler that rams and arcs, a fortress, an interceptor that dives through
fire to charge its core. Nothing is a class you pick; it is a ship you
build. The run report names what you built.

## The loop

Fly, fight and break rock → collect dilithium → the rail fills → refit
(three cards, one pick) → harder sky → a capital ship hails (engage or
evade) → more refits, specialisations, synergies → the hull goes → the
run report → play again.

The world pauses itself at each decision (`World.phase`: `refit`, `hail`,
`over`), and the app or the scripted pilot answers it (`choose`,
`answerHail`, `restart`). Everything else is the existing fixed-step
simulation.

## Where each system lives

| System | Data | Behaviour |
|---|---|---|
| Refit tree | `content/upgrades.ts` | `sim/build.ts` (stats, offers, figures, the build's name), `sim/stats.ts` (the stat block and caps) |
| Weapons | the stat block | `sim/weapons.ts` (phasers, torpedoes), `sim/arsenal.ts` (mines, plasma, hull arc) |
| Asteroids | `ROCK_KINDS` in `sim/field.ts` | `Field.topUp` (formations), `World.destroyRock` |
| Dilithium and pickups | `sim/pickups.ts` | `World.collect`, `World.gainXp` |
| Enemies | `ALIEN_TYPES`, `FACTION_TRAITS`, `VARIANTS`, `SQUADS`, `ELITES` in `sim/enemies.ts` | the existing tactical AI, `World.spawn` |
| Capital ships | `FACTIONS` in `sim/bosses.ts` | `Command` (contacts, hail, phases, telegraphs, faction movement) |
| Difficulty | `sim/director.ts` | read by the field, spawner, guns and capital ships |
| Sector events | `ENCOUNTERS` in `sim/encounters.ts` | `startEncounter` / `stepEncounter` |
| Score and the record | `sim/run.ts`, `sim/tuning.ts` | `World.addScore`, `World.finish` |
| Between runs | `content/unlocks.ts` | `meta/profile.ts` (localStorage), `ui/panels.ts` |

### Adding things

- **An upgrade**: one entry in `UPGRADES`. Give it a branch, tags (what the
  offer reads to lean toward a build), requirements, and an `apply` that
  changes the stat block. If it needs a new number, add it to `Stats` and
  `BASE`, cap it in `capStats` if it can run away, and add a row to
  `FIGURES` so cards show it. A specialisation is `kind: 'spec'` with a
  `group` and `needs`; it is offered as its own refit once.
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

## The refit tree

Nine branches across three categories (weapons, defence, ship), sixty-five
cards. Systems switch a new weapon or device on: the stock ship has only
its twin phasers, and torpedoes are a refit like any other.

- **Phasers**: damage, rate, bank, reach, pierce. Specialise into a
  **cone** (fans of three, then five or seven), the **heavy lance** (slow,
  piercing, huge) or the **targeting array** (lances that bend onto the
  hull nearest the nose).
- **Torpedoes** (button 2): magazine, yield, tracking. Specialise into a
  **heavy payload** (with cluster warheads), the **swarm** (three
  micro-torpedoes spread across targets; unlockable) or **precision
  guidance** (all-round locks, faster, harder on hulls; with a target
  painter that marks phaser hits).
- **Mines** (laid in your wake): yield, racks, proximity seekers.
  Specialise into a **minefield**, **chain reaction** (blasts set off mines
  near them and leave a burning cloud) or **graviton mines** (pull targets
  in; unlockable).
- **Warp plasma** (a burning trail while you thrust): heat, flow.
  Specialise into **ignition** (targets keep burning) or the **afterburner
  wake** (the roll dumps a ring of plasma).
- **Close quarters**: the **hull arc** (lightning to anything close), arc
  capacitors and reach, and the **ram prow** (a ram that destroys its
  target costs no hull). Specialise into the **arc storm** (arcs chain on)
  or the **juggernaut** (unlockable).
- **Mobility**: impulse, thrusters, dampers, evasive jets. Specialise into
  the **drift drive** (keep speed off the throttle; lances fired while
  drifting hit a third harder) or the **evasive pattern** (grazing fire
  mid-roll counts double and refunds the roll).
- **Defence**: **deflector shields** (a charge that takes one hit, then
  recharges), regenerators, ablative armour (+1 plate), bulkheads (longer
  grace), damage control (one save). Specialise into the **fortress**,
  **reactive armour** (losing a plate or a shield blasts away nearby fire),
  or the **regenerative hull** (unlockable).
- **Utility**: tractor reach, the dilithium matrix (more XP).
- **Warp core**: coils (more overcharge from near misses). Specialise into
  the **warp nova**, **weapons overload** (longer, and refills racks) or
  the **phase cloak** (unlockable).
- **Synergies** appear only when you own both halves: plasma warheads,
  phaser detonators, the capacitor shield, arc warheads, core-charged
  mines, and the ramjet (unlockable).

### The offer

Three cards per refit (`makeOffer`):

1. The first two lean toward the build: each card is weighted by how many
   levels you already own that share its tags.
2. The third is usually a **wildcard** from a direction the build has not
   taken (shown as "New direction"), so there is always a way to change
   course.
3. While the ship has fewer than two systems, a system card is always on
   the table.
4. When a branch is deep enough, that refit becomes its **specialisation**:
   the branch's specialisations side by side, once per branch.

Battle salvage (a free refit after a capital ship) uses the same panel.

### Numbers and caps

Every upgrade changes one flat stat block, rebuilt from scratch whenever
the build changes; `capStats` clamps it after every multiplier has run, so
no stack of upgrades escapes a cap. Cards show the figures they change,
computed by diffing the block before and after.

## Defence, damage and repair

The hull is plates: three to start, five at most. A hit takes a plate and
gives a moment of grace; a deflector charge takes the hit instead (with a
shorter grace, so one charge never eats a volley). Repairs are rare on
purpose: a small chance from a kill, never on a full hull, never more than
one every 35 seconds, one from each capital ship destroyed, and one for
answering a distress signal. Damage control saves the last plate once.

## The warp core and the chain

Near misses charge the core: fire that passes close without hitting, rock
skimmed at speed, hulls passed close aboard, beams and webs brushed (each
counts once). Full, it releases on **E** (gamepad Y, touch **Release**): a
nova that damages everything near (scaling with refits), clears enemy fire,
and runs the guns hot for a few seconds. The **kill chain** is score only:
each hull kill inside a short window adds one; breaking rock keeps it alive.

## The sector

**Rock** comes in kinds and formations, mixed by the director: basalt;
iron (from about 2:30, three times the hull, splits into more iron); rich
(violet veins, a shower of dilithium); volatile (from about 4:30, goes off
when broken, you included); rare (gold, a power-up inside, one every minute
or two); singles, clusters, and a big rock in its own debris.

**Enemies**: seven archetypes from the original, by behaviour (scouts
strafe past, raptors line up and ram, lancers broadside from cover,
warbirds snipe with plasma that can be shot down, stalkers sit on your tail
and lead, drones grind in and cut with beams, weavers lay webs), plus a
freighter for convoys. **Faction traits** apply to any hull: Klingons are
faster and fire more, Cardassians reach further, Romulans cloak while they
reposition and decloak to attack, the Borg adapt, Tholians leave webs.
**Variants** cross them (the Romulan Scorpion, the Cardassian Hideki, the
Borg probe, the Tholian shard cruiser). **Squads** arrive together because
together they are worse (a weaver with two raptors). **Elites** are
familiar hulls with a modifier: armoured, swift, volatile, gunner, cloaked,
regenerative, web-spinner.

**The director** (`sim/director.ts`) is the one place difficulty is
decided, as smooth functions of run time: the opening is calm; density,
speed and toughness climb; variety opens over four minutes; from three
minutes elites and squads appear, and from four the factions mix. Late, the
enemy ceiling levels off while elites, squads and hazardous rock keep
coming, so difficulty comes from combinations, not counts.

## Capital ships

From 2:40, a contact every 50 to 80 seconds. A yellow alert, then the hail:

- **Engage**: regular traffic clears out; the capital ship drops in with
  its wing and fights in three phases (each adds its faction's signature
  attack, calls reinforcements and quickens the cycle). Every attack winds
  up behind a telegraph: lines where a charge or volley will go, rings
  where a nova bursts, circles where shells or webs will land. Destroy it
  for the bounty, dilithium, a hull repair, a power-up and a free refit.
  Let its fuse run out and it leaves with nothing paid.
- **Evade**: no fight, no reward, and the next contact comes sooner. You
  cannot evade twice running; a Borg cube cannot be evaded; Romulans never
  hail (they decloak and the fight starts). The first contact of a run is
  always Klingon or Cardassian.

Each faction moves its own way: Klingons sway across your bow and charge,
Cardassians hold long range and wheel, Romulans vanish and reappear on your
quarter, the cube grinds closer, Tholians circle.

## Sector events

When no capital ship is about, roughly once a minute: a mineral-rich field,
a distress signal (hold the beacon circle for a repair), an enemy convoy
(freighters heavy with dilithium), an ion storm (lightning on the circles;
near misses charge double), a nebula (sensors down; the core charges
faster), and, once unlocked, a derelict hulk (salvage, then an ambush) and
a spatial anomaly (a gravity well that crushes what reaches its core).

## The run report and progression

The report compares the run with your best (survival, refits, kills, chain,
dilithium, overcharges, capital ships, events), shows the ship as built,
what did the killing and what did the damage, the score curve against your
best run's, and any unlocks earned. Long-term progression opens options,
never power: locked specialisations, a synergy, two sector events, three
challenge modifiers (ironman, glass cannon, hostile skies, each with a score
multiplier) and engine colours. The logbook on the start screen shows the
hint for every unlock still locked.

## Balance

Balanced with telemetry, not intuition. `npm run pilot` flies the scripted
pilot (`tools/pilot.ts`) through 96 seeded runs (12 per build strategy) and
writes [BALANCE.md](BALANCE.md): survival and refits per strategy, plates
lost against plates gained per minute, every source of damage (down to the
variant or the capital ship's attack), capital-ship fights, pacing and the
builds made. The pilot plays through the same API as the app: it reacts to
new fire a person's 0.2s late and keeps its goal safe with a 1.2s
look-ahead.

What the telemetry changed, in order:

1. Dilithium income was a third of what the pacing needed; rock and hulls
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
8. Moving the first contact later let the Borg cube be the first capital
   ship; faction order now follows contact order.
9. Beams kept tracking at full rate while cutting and could hit twice per
   cut; they aim during the wind-up, sweep slowly while cutting, and
   discharge on the hull they hit.
10. A capital ship's station swung through you when you turned; it now goes
    round you unless it is charging.
11. Focused phaser and defence builds trailed builds with systems; the
    phaser ladder and shield recharge were strengthened. Plasma, the
    weakest family, reaches a little higher and burns hotter.

Where it stands (see BALANCE.md for the current report): every build
strategy within about ±13% of the others, no damage source above about
11%, capital ships destroyed in more than half of fights, a calm opening
(0.3 plates a minute) climbing to about 1.3 by minute five, repairs about a
tenth of losses, and the best runs past eleven minutes. The pilot is a
steady player, not a strong one; expect people to last longer.
