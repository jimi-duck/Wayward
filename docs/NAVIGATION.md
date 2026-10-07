# Navigation

How the player reads where to go and who is where. The numbers live in
`src/sim/guide.ts` (plain data, tested in `tests/guide.test.ts`); the drawing
is `src/ui/guide.ts` (the heading), `src/ui/radar.ts` (the scope) and
`src/ui/targeting.ts` (marks and edge pointers).

## The heading

The compass tape at the top centre, with the objective on it: an amber
diamond slides along the tape at the objective's bearing and pins to the end
as a chevron when it is further round than the tape shows (behind you it
sits at the end you turn toward, and pulses). Either side of the heading
number: how far off the nose ("30° left") and how far away. The objective is
an event's marker, else the lane mouth (the port while the clamps close).
Phones keep the tape hidden, as before; the objective card and the edge
pointer carry it there.

## The world and the scope

- The lane mouth and the port are marked in the world at any range, larger
  and glowing, with name and distance; off screen, the edge pointer says
  the same.
- The scope draws a dashed amber line to the objective and an amber
  arrowhead on its bezel.
- Edge chevrons for hulls out of view are ranked by `threats()`: armed and
  near first, a hull you cannot see counts more, convoy hulls last. The top
  one says how far.

## Travel and fight

`inFight()` (an armed hull in gun reach, a capital ship close, or red alert,
held two seconds) sets `data-focus` on the HUD. In a fight the hull
chevrons grow and the objective's edge pointers dim; in travel the
objective's pointers are larger.

## Left out on purpose

Above/below: hulls fly on the ship's plane (#108). A separate bar of
contacts (tried in #121) read as a second map beside the scope and was
removed.
