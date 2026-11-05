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

## Next (plan: "Living stations and space objects")

The rock colony with flak turrets and the salvage crane read the same signals
and add their own behaviour on top.

## Not measured

A new look is built the first time it is needed (about 250 ms for the depot on
the cloud machine, a phone will take longer). Phone frame rate was not measured.
