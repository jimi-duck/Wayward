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

## Next (plan: "Living stations and space objects")

The Raider Den (a hideout in a rock field) and the Thren Seed are not built: both
need a new kind of enemy behaviour and a pilot run, and are left for a go-ahead.

## Not measured

Flak and crane numbers come from tests only; no pilot has flown them and no
phone has run them. A new look is built the first time it is needed (about
250 ms for the depot on the cloud machine, a phone will take longer).
