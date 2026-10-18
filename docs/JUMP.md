# The jump

Jumping is flying through the gate. The ring is the way in: nothing to hold
inside, nothing to press.

## How it plays

- The drive charges while the ship is inside the gate's reach (`APPROACH`,
  230 units, or about 46 units for every second the charge needs, so the
  blockade run's eleven seconds reach further). A ship at cruising speed that
  heads straight in is charged as it arrives. The objective reads "Jump drive"
  with the seconds left and "fly through the gate".
- Charged, with the fluid in the tank, and inside the ring (`lane.r`): the
  drive lets go (`World.jump`, event `jumped`). A ship that arrives early
  simply goes through when the charge is done; one that overshoots can turn
  back, the charge only winds down outside the reach.
- Controls and damage are off for the fly-through (`JUMP_T`, three seconds),
  then the sortie ends as before (`finish`). It works the same mid-chase: the
  ring has the damping field round it, and the sim ship is untouched while the
  picture shows the jump.

## What is on screen (`render/warp.ts`)

One clock, the seconds since the drive let go, drives everything, so any frame
can be drawn on its own.

| Seconds | What happens |
|---|---|
| before | The ring's skin fills teal as the charge builds; the strips brighten. |
| 0 – 0.5 | The nose swings to the ring's axis and the ship settles to its middle. The HUD and touch controls fade. |
| about 0.4 | She crosses the ring: it blazes, a ripple runs out of it, the camera shakes. |
| 0.5 – 2.2 | Speed builds to 1500 units a second. Stars stretch to lines (one instanced draw), the lens opens 38 degrees and the camera drops low behind the ship, a pale teal tube closes round the path with a light at its end. |
| 2.2 – 2.9 | The hull draws long and thin; the view goes to pale teal (`#warp`). |
| after | The sortie is over; the veil lifts off the chart over about a second. |

The flying camera is untouched outside the jump. Reduced motion keeps the ring,
the crossing and the veil, and drops the lens change, the shake, the hull
stretch and most of the star streaks.

## Cost

The streaks are 56, 110 and 170 thin ribbons on Low, Medium and High; the tube
is one open cylinder; the Low tier's tube has no pattern. Everything is
additive with no depth writes, so the cost is fill. Not measured on a phone
(cloud has software WebGL only): the first thing to check on a device is the
last second of the jump on Medium.

## Where it lives

- `sim/world.ts` (`stepBreakout`, `jump`), `sim/breakout.ts` (`APPROACH`, `JUMP_T`).
- `render/warp.ts`: the path (`launchFrom`, `pose`), the timing curves, `WarpView`.
- `render/sector.ts` (`jumpClock`): puts the ship, camera and ring on that clock.
- `render/breakout.ts`: the ring's skin and blaze. `render/camera.ts`: `warp`.
- `main.ts`, `styles/hud.css`: the veil and the HUD fade.
- `tests/warp.test.ts`, `tests/breakout.test.ts`.
