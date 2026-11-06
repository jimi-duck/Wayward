# Sites: places that sense the game

A port used to be scenery: one model, one ring, a shield switch. A **site** is
the small brain every place shares. Code: `src/sim/site.ts` (`SiteBrain`,
`moodOf`, `portStyleOf`), read by `World.portMood`, `render/breakout.ts` and the
scope (`ui/radar.ts`). Plain data, no random draws, nothing saved.

## Mood

| Mood | When | Lamps | Scope mark |
|---|---|---|---|
| calm | nothing near | warm, a little dim | teal |
| busy | two or more wards (haulers, patrols, port traffic) within 140 units | warm, brighter | teal |
| alert | a committed hostile within 140 units, or the hunt at 0.6 or more | amber | amber |
| shut | the depot shield is up (a fight at the ring) | amber, slow pulse | amber |

A mood rises at once and falls 4 s after what raised it has gone. Lights go
amber and never red: red is the threat's colour only.

## Port looks by holder

One kit, five looks (`buildPort(style)`, built the first time a system wants it
and kept): Frontier Supply's yellow depot (also Voice, Thren and nobody's),
Kellern's off-white yard with an inspection arch, the Gutter's rust hulk-port
with a gutted hull bolted on, a Holdfast's hub grown into a rock, and the Dust
Traders' raft with awnings and lanterns. The holder comes from the chart row via
`SortieDef.holder`. The first system past Cerro keeps its own hand-laid depot.

## What a holder's port does

Read in `World.stepWorks`, constants in `sim/site.ts`.

- **Holdfast flak.** Every 1.4 s (0.7 s once the port is alert or shut) it
  fires at up to two targets within 120 units of the ring: rock drifting
  *towards* the port, and committed hostile hulls. A round does 8 damage and
  draws a small pop. Rock drifting away, wards and the player are left alone.
  A rock that breaks drops what it drops, so flak near a Holdfast also feeds you.
- **Gutter crane.** Loose salvage (Krail, Cyrite, ore, parts) within 170 units
  that has under 3 s left is taken hold of: its life is reset to 14 s and it is
  hauled towards the ring. Loot from a fight near a Gutter port is not lost
  while you are held off by the shield.

Kellern, the Dust Traders and everyone else keep a plain port for now.

## Custody relay post

An unmanned beacon (`Traffic.relayPost`, `buildRelayPost`) off the course at
40% of the way, 380-460 units to one side, in every system that has Custody
patrols (so not the first system past Cerro, safe systems or edges).

- **Scans.** A ship at Wanted 0.6 or more that stays within 110 units for 3 s
  gets "Flagged hull in range. Patrol routed." and the next patrol is called
  at once (the usual rules still hold: never in a fight, a scene or at a dock).
  One call per 45 s at most. An unflagged ship is ignored.
- **Jam.** Flying within 28 units at under 18 speed for 4 s takes it offline for
  120 s ("Relay post offline. Signal lost.") for +0.03 Wanted. No gunfire is
  needed, so it adds no new target to the shooting code.
- **Seen.** An amber ring on the ground and a lamp that brightens as it locks;
  a small amber square on the scope; all go dark when jammed.

## Refinery barge

A slow ore barge (`sim/barge.ts`, `buildBarge`) works the field of every
mining system except the opening, the first system past Cerro and a Thren sky.
It sits 320 units off the course at 45% of the way and sways about its berth.

- **Hauls.** Each second it tethers the nearest ordinary rock within 100 units
  and pulls it in (a push of 1.4 speed, rock held under 14). A rock that
  reaches its mouth is ground: it breaks as a blast would (the usual 30% scrap
  yield) and spills its Cyrite where it is, for your tractor. Volatile rock is
  left alone. It only works where the field is, so it works the field you are
  working.
- **Runs.** A committed hostile within 220 units makes it stop hauling and run
  from the nearest one at 12 speed; it settles again when the fight is gone.
- **Seen.** A teal tether line to the rock on the hook; a lamp that goes amber
  while it runs.

## Dust Market

A raft of Dust Traders (`sim/market.ts`, `buildMarket`) in every system the
Traders hold that has a port (not the opening, the first system past Cerro,
or a Thren sky): 30% of the way, 300 units off the line.

- **Trades on the fly.** Slow (under 14) inside its 16-unit ring for 2 s and
  the stalls call: a card (`market_stall`, the Decision template) with Buy
  warheads (8 high-yield torpedoes, 30 Cyrite), Buy plating (3 charges, 24
  Cyrite) and Fly on. Stock goes into the racks up to their usual caps
  (`Outcome.stock`). Two sales a system, then it is sold out. One call per
  visit: it asks again only after you have left and come back.
- **Fights.** A committed hostile within 220 units shuts the stalls and the raft
  moves off from it (never more than 260 units from its berth), then drifts home.
- **Seen.** A round raft with awnings and lantern posts, a cyan ring, a small
  teal square on the scope; amber lamps while shut, dim when sold out.

## Repair gantry

A small mend point (`sim/gantry.ts`, `buildGantry`) on the lane of every transit
system except the opening, the first system past Cerro, safe systems and Thren
sky: 65% of the way, 260 units off the line.

- **Mends.** Slow (under 12) inside its 12-unit ring for 6 s mends one plate;
  it has three mends in it, then the arm is spent.
- **Refuses.** A flagged hull (the hunt at 0.6 or more) is turned away; it is
  locked while a committed hostile is within 200 units or you are in danger;
  and it has nothing to do when plating is full. One radio line says which,
  at most every 20 s.
- **Seen.** A teal ring that fills as the mend runs (amber when it refuses or is
  shut, dark when spent); a small teal square on the scope.

## Lantern buoys

The lanterns' lens colour follows the port's mood (`setBuoyMood`, eased with the
port's lamps): cool teal when calm, amber when the port is alert or shut. A
system without a port keeps them teal. It is one shared material, so it costs
nothing per lantern. They are the early warning: lanterns turning amber says a
fight is near the port before you can see it.

## Raider den

A hideout in the rock (`sim/den.ts`, `buildDen`) in every mining system the barge
works, on the side of the course the barge is not: 55% of the way, 480 units off
the line, ringed by seven iron rocks (rock is cover: enemy fire stops on it).

- **Dark.** Hidden until you come within 140 units, or until it has launched or
  been shot. Seen, it is a small red square on the scope and a dull red lamp.
- **Waves.** Come within 220 units and it wakes: a radio line, then one scout
  from the dock, and one more every 30 s (at most 4 waves, 2 of its raiders
  alive at once). Raiders are ordinary Gutter hulls; the director does not count
  them.
- **Flank.** Shoot it and a scout appears 90 units round your flank, not at the
  den (once per 15 s, inside the same two-alive cap).
- **Runs.** At 35% hull it cuts its lights and goes to ground for 20 s, then
  reappears dark at a second den 560 units off with 60% hull and its waves reset.
  Crush it a second time and it is dead.
- **Raid.** Dead, it spills 60 Cyrite and 8 parts and pays 400 points (+0.05
  heat). Bolts and torpedoes hit it (hull 45; a bolt is about 1, a torpedo 30).

## Thren seed

A growth on a rock in a Thren sky (`sim/thrseed.ts`, `buildSeed`; thren above
0.3, not the opening or the first system past Cerro), 50% of the way, 220 units
off the line.

- **Grows** while ignored: knot to bloom in 240 s. A bloomed seed calls two motes
  every 30 s when you come within 200 units.
- **Answers fire.** A bolt or torpedo makes 1 to 3 motes (more when grown), at most
  every 12 s. Hull 40. Burned late (growth over 0.5) it bursts into two more.
- **Goes quiet** if you stay slow (under 8) within 34 units: it stops growing,
  its veins dim, and after 8 s you have studied it once: a radio line, 15 Cyrite,
  6 parts. Firing resets the study.
- **Burn it** and it leaves the same 15 Cyrite and 6 parts, and 150 points.
- **Seen** as a dark knot with pale violet veins and a teal diamond on the scope.

Numbers from `npm run pilot:sites` (docs/BALANCE-SITES.md): a stock hull flown by a
plain script, which does not dodge. Of the dens it reached it crushed a third in
150 s, and lost the ship about as often as the same flight does with no den.

## Solid places

Every built thing is solid to the player (`sim/solids.ts`, `World.stepSolids`): the
depot (a 9-unit core at its berth's side), the audit dock, the relay post and mast,
Ned's yard (its rock, never the pad), neutral traffic (a ward's hull; a ram no longer hurts it or you), the barge, the gantry (7), the Dust Market (9), the den (12), the seed, and a
situation's site (settlement 12, wreck 8, and so on). The ship is pushed back out
and its inward way is lost. A bump faster than 3 units/s flashes the shield
(`shieldHit` with source `solid`, at most every 0.5 s): no charge, no plate, no
grace, no HUD note. The Jump Gate, the berths and the seam and hole sites are
flown through. Lane Control's recovery and the jump have the helm, so they skip it.
The cores are the bodies, not the rings that show where a thing works, so docking,
hailing and mending still work from the ring.

## Not measured

Flak and crane numbers come from tests only; no pilot has flown them and no
phone has run them. The den and seed were flown only by a plain script (no
dodging, no rock cover), never by a person; the render of both is judged from
the bench (`tools/sites.html?prop=den|seed`) only. A new look is built the first time it is needed (about
250 ms for the depot on the cloud machine, a phone will take longer).
