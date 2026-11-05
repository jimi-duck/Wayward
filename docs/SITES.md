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

## Next (plan: "Living stations and space objects")

The Dust Market (trade on the fly) and the lantern buoys read the same signals
and add their own behaviour on top.

## Not measured

Flak and crane numbers come from tests only; no pilot has flown them and no
phone has run them. A new look is built the first time it is needed (about
250 ms for the depot on the cloud machine, a phone will take longer).
