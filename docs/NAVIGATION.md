# Navigation

How the player reads where to go and who is where, in about a second.
The numbers live in `src/sim/guide.ts` (plain data, tested in
`tests/guide.test.ts`); the drawing is `src/ui/guide.ts` (the strip),
`src/ui/radar.ts` (the scope) and `src/ui/targeting.ts` (edge markers).

## The strip

Top centre, on every screen size. The bar is the horizon round the ship:
the nose in the middle, left on the left, behind at the two ends.

- amber diamond: the one thing to go to (an event's marker, else the lane
  mouth; the port while the clamps close). Hollow diamonds: the other places
  (amber lane, teal port).
- red square: a capital ship. Red ticks: hulls, the most pressing one taller;
  a hull that is not armed is shorter and dimmer. Teal ring: a convoy hull.
- teal caret under the bar: the way the ship is really travelling, so a
  drift or a slide after a break reads against the nose.

Above the bar, the objective's row: an arrow turned toward it, its name
(wide screens), "30° left", how far, and the time at the current closing
speed (or "Away" when the gap is opening). The arrow pulses when the
objective is behind.

## Travel and fight

`inFight()` is true when an armed hull is within `FIGHT_RANGE`, a capital
ship is close, or the alert is red; the strip holds the fight for two
seconds after. `data-focus` on the HUD is `nav` or `combat`.

| | travel | fight |
|---|---|---|
| strip | objective row only; bar shows armed hulls | a red row first (nearest hull or capital ship: side, distance, ×count), the objective's row beneath, every hull on the bar |
| scope | full detail, amber line to the objective | rock and pickups at half weight |
| edge markers | objective pointers larger | hull chevrons larger, objective pointers dimmed |

Hulls rank by `score` in `guide.ts`: armed and near first, a hull you
cannot see (to the side, behind) counts more, convoy hulls last. The top
chevron off screen says how far.

## Left out on purpose

Above/below: hulls fly on the ship's plane (#108), so elevation would be
noise. The old compass tape (000–359, north at the start) is gone; the scope
bezel keeps N/E/S/W for orientation.

## Needs a real-device look

Strip size and legibility on a phone, how the fight row feels at speed, the
pulse on "behind" after a break, the ETA with a drifting ship.
