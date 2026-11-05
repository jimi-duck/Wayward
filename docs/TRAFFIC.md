# Living traffic

Space is busy even when nothing is chasing you. Code: `src/sim/traffic.ts`
(`trafficPlan`, `Traffic`). The first system past Cerro keeps its own hand-laid
level ([POSTJUMP.md](POSTJUMP.md)); every other system gets the same machinery
with a plan dealt from the course.

## What a system holds

- **Haulers on routes.** Unarmed wards (`sim/enemies.ts`, temper `meek`) fly
  lines laid from the course: two freight crossings, one far fast passage, and
  in a mining system the miners' circuit. A line that would pass through the
  Jump Gate or a dock is dropped. The target card reads them "Civilian · Not
  hostile"; the director never counts them.
- **Port traffic.** A port adds its own lines: ships coming in from two sides
  and ending at the ring's edge (docking), ships casting off, and a slow
  harbour loop round it.
- **How many** (`KIND_N`): port 7, crossing 4, gate 4, mining 3, contested 3,
  edge 1. Home (the opening) and stage scenes have none. Voice or Thren space
  has none and a raid halves it. Phones fly the same counts; the hulls are the
  same cheap wards as in the first system.
- **Shooting a hauler** works as in the first system: it runs, its neighbours
  scatter, a second hit within a minute or a kill calls the dock's guards. The
  "busy yard" escalation (Wanted to the top) stays with the first system only.

## Patrols that check you

A pair of Custody pickets (wards, temper `wary`) drops by 75-110 s after
arrival and every 150-220 s after, at most three a system. Never in a safe
system or at the edge, and never while a fight, a stage scene or a dock or
gate is near.

1. They come in from beside and behind (never ahead: the flight path stays
   clear) and keep station 55 units off the beam.
2. One radio line: "Routine check. Hold your course." Pacing is the floor's
   (`sim/floor.ts`); nothing is said when they leave.
3. After six seconds: if Wanted is below 0.6 they peel away. At 0.6 or above
   the line is "Your hull is flagged. Stand down." and they turn on the ship
   as ordinary pickets, giving up after 70 s like the dock's guards.
4. Shooting a patrol turns it at once. A fight starting nearby sends it away.

The target card reads a patrol "Custody · Routine check".

## Balance

Patrols are the only part that can cost hull, and only for a ship already at
Wanted 0.6 or more, where a pursuit is due anyway. Not re-piloted at length;
`pilot:road` after the change: 36/36 journeys reached the Narrows, 0 stuck, 0.0-0.5 wrecks a journey ([BALANCE-ROAD.md](BALANCE-ROAD.md)). Not measured on a phone.
