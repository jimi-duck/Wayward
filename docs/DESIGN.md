# Game design

Everyone launches in the same Defiant. Over a run the ship becomes something
else, depending on the route it takes across the refit web: a torpedo boat,
a minelayer, a brawler that rams and arcs, a fortress, an interceptor that
dives through fire to charge its core. Nothing is a class you pick; it is a
ship you build. The run report names what you built and draws the route.

## The loop

Fly, fight and break rock → collect dilithium → the rail fills → refit
(two points to spend on the refit web) → harder sky → a capital ship hails
(engage or evade) → her salvage: more points and her faction's tech →
specialisations, synergies, the route out across the web → the hull goes
→ the run report → play again.

The world pauses itself at each decision (`World.phase`: `refit`, `hail`,
`over`), and the app or the scripted pilot answers it (`fit` and
`closeRefit`, `answerHail`, `restart`). `openRefit` opens the web between
refits, to look at it or to spend banked points. Everything else is the
existing fixed-step simulation.

## Where each system lives

| System | Data | Behaviour |
|---|---|---|
| Upgrades | `content/upgrades.ts` | `sim/build.ts` (stats, figures, the build's name), `sim/stats.ts` (the stat block and caps) |
| Refit web | `content/web.ts` (the nodes, their places and links) | `sim/web.ts` (what can be fitted and why not, quick picks), `World.fit`, `ui/web.ts` (the map) |
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
  quick picks read to lean toward a build), requirements, and an `apply`
  that changes the stat block. If it needs a new number, add it to `Stats`
  and `BASE`, cap it in `capStats` if it can run away, and add a row to
  `FIGURES` so the inspector shows it. A specialisation is `kind: 'spec'`
  with a `group` and `needs`. Then put it on the web: name it in a slot of
  its region in `content/web.ts` (`slots`, `follow`, `pockets`, or a
  bridge). A node adds one level, so an upgrade can sit on as many nodes as
  it has levels; the web tests check every upgrade is placed and none more
  often than its maximum.
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

## The refit web

Each refit gives **two points**; a destroyed capital ship gives two more.
A point fits one node of the web, and a node can only be fitted when it is
joined to one already fitted. The core (your ship) is always fitted, so a
build is a route out from the middle: deep into one region, across a bridge
into its neighbour, or a little of everything. About two hundred nodes; a
long run fits fifty or sixty of them.

**Nine regions** sit round the core like the spokes of a wheel: phasers,
torpedoes, warp plasma, utility, defence, close quarters, mobility, the
warp core and mines. Each is the same shape, filled with its own upgrades:
an entry joined to the core, a first big node, two paths that climb and
cross in the middle (so there is more than one way up), pockets off the
sides, a hub, then **three specialisations** at the top with follow-ups
behind each. Bridges between neighbouring regions carry the synergies and
shared stats (fire control, dilithium lattice, core sensors).

Node kinds, by shape on the map:

- **Minor** (small circles): a few percent of one stat, ten levels each,
  the steps along the paths.
- **Upgrade** (circles): the stat upgrades of the original tree.
- **System** (hexagons): switches a weapon or device on (the torpedo bay,
  the mine layer, the plasma vent, the hull arc, deflector shields).
- **Specialisation** (amber diamonds): one per region per run, once the
  region is deep enough; it decides what the ship is called.
- **Synergy** (violet diamonds): on the bridges; they need both halves.
- **Salvaged tech** (octagons in faction colours, round the core): shut
  until that faction's capital ship is destroyed this run.

A node can be **closed** for a reason the inspector names: out of reach,
locked by long-term progression, tech not yet salvaged, another
specialisation of its region taken, a synergy's other half missing, or the
upgrade already at its maximum level. Points not spent stay banked.

The regions:

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
  Specialise into **ignition** (targets keep burning), the **afterburner
  wake** (the roll dumps a ring of plasma) or the **plasma corona** (plasma
  wreathes the bow and flanks while you thrust).
- **Close quarters**: the **hull arc** (lightning to anything close), arc
  capacitors and reach, and the **ram prow** (a ram that destroys its
  target costs no hull). Specialise into the **arc storm** (each arc jumps
  on to one more hull),
  the **shock prow** (a ram discharges into the hulls near its target) or
  the **juggernaut** (unlockable).
- **Mobility**: impulse, thrusters, dampers, evasive jets. Specialise into
  the **drift drive** (keep speed off the throttle; lances fired while
  drifting hit a third harder), the **evasive pattern** (grazing fire
  mid-roll counts double and refunds the roll) or the **afterburner**
  (more thrust; near misses near top speed count double).
- **Defence**: **deflector shields** (a charge that takes one hit, then
  recharges), regenerators, ablative armour (+1 plate), bulkheads (longer
  grace), damage control (one save). Specialise into the **fortress**,
  **reactive armour** (losing a plate or a shield blasts away nearby fire),
  or the **regenerative hull** (unlockable).
- **Utility**: tractor reach, the dilithium matrix (more XP). Specialise
  into the **prospector** (rock gives dilithium half as often again),
  **salvage drones** (more hull repairs, longer power-ups) or **deep
  scanners** (rare rock twice as often, elites carry twice the dilithium).
- **Warp core**: coils (more overcharge from near misses). Specialise into
  the **warp nova**, **weapons overload** (longer, and refills racks) or
  the **phase cloak** (unlockable).
- **Synergies** (on the bridges, needing both halves): plasma warheads,
  phaser detonators, the capacitor shield, arc warheads, core-charged
  mines, and the ramjet (unlockable).

**Salvaged tech**, one per faction: Klingon **disruptors** (every fourth
phaser shot a heavy bolt at triple damage), Cardassian **compressors**
(longer, piercing lances; wider torpedo blasts), the Romulan **cloak** (a
barrel roll hides you: hulls hold their fire for a moment), the Borg
**adaptive shield** (shields recharge faster; a ship with none gets one) and
Tholian **snares** (torpedo and mine blasts slow the hulls they catch).

### On screen

The web opens by itself when the rail fills (after a beat of slow motion)
and after battle salvage; R, Tab, the rail's Web button or a pad's Back
opens it between refits. The map pans and zooms (drag, wheel, pinch, the
+ − ◎ buttons); labels come in as you zoom. Hover or tap a node to see it
in the inspector: what it does, the figures it changes (before → after),
and why it is closed if it is. Tap it again (or Enter, or Fit) to fit it.

For a quick refit there are always **three quick picks** (keys 1 2 3):
two that lean toward the build (weighted by the tags you already own) and
one in a direction the build has not taken. Arrows move across the web,
Tab steps through the nodes that can be fitted, Esc launches (banking what
is left). A pad: stick or d-pad to move, A to fit, LB and RB to step, Y
to frame, B to launch. When a refit's points are spent the web closes
itself.

### Numbers and caps

Every upgrade changes one flat stat block, rebuilt from scratch whenever
the build changes; `capStats` clamps it after every multiplier has run, so
no stack of upgrades escapes a cap. The inspector shows the figures a node changes,
computed by diffing the block before and after. A run touches a few
ship-wide numbers too: all weapon damage (fire control, capped at +60%),
dilithium from rock, repair drops, power-up time, rare rock and elite
loot.

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
  for the bounty, dilithium, a hull repair, a power-up, two web points and
  her faction's tech.
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
12. The refit web let a build take exactly what it wanted, and the first
    pass found close-quarters builds lasting the whole fifteen minutes:
    shields stacked to three charges on a nine-second recharge, and the
    arc's damage minors stacked on its capacitors. Shields now cap at two
    charges and twelve seconds (Borg tech speeds the recharge instead of
    adding a charge); arc damage caps near the card era's best, the arc
    storm jumps once, chains fall off faster and rock takes half; ram
    damage caps at 18.
13. Builds with no weapon region starved; the pilot now keeps its phasers
    up in them, as a player would. Mines are laid a little more often.

Where it stands (see BALANCE.md for the current report): survival runs from
about three and a half minutes (mobility-led builds, which this pilot cannot
fly to their strength) to about nine (close quarters with defence, still the
strongest; two runs in twelve reach the cap), with the quick-pick player at
about six. No damage source above about 11%; capital ships destroyed in
about two fights of three; a calm opening (0.3 plates a minute) climbing to
about one by minute five; refit 10 at about five minutes. Next: bring close
quarters and mobility toward the middle. The pilot is a steady player, not a
strong one; expect people to last longer.
