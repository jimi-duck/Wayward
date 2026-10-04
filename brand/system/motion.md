# Motion and feedback

Motion follows rule 2: it marks something becoming live. Interface motion is short and mechanical; impact motion is loud and brief. Everything here has a reduced-motion fallback that keeps the information.

## Timing

| Name | Duration | Easing | Use |
|---|---|---|---|
| Snap | 70ms | linear | Knob, key cap fill, tick lighting |
| Shift | 140ms | `cubic-bezier(.2,.7,.2,1)` | Card selection lift, hover edges |
| Boot | 180ms per step | `cubic-bezier(.2,.7,.2,1)` | Panel open sequence |
| Fade | 600ms | ease | Coaching pills leaving |

## A panel boots

When an elbow panel opens, it draws itself the way a console powers up, in three steps of 60ms each:

1. The elbow's sweep draws from the outer corner along the rail and down the bar.
2. The glass fills behind it, and the cards rise 6px into place, left to right, 40ms apart.
3. Titles and figures appear; figures count up to their value in `data`.

The panel ignores input until step 3 ends (0.4s). Under reduced motion it appears complete in one frame.

## Meters

Tick meters light one segment at a time at Snap speed, never as a smooth slide, so a filling gauge reads as counting. When a meter fills, it holds lit for one beat, then switches colour (`signal` to `command` for the overcharge) and its key cap fills.

## Alerts

- Yellow alert: the placard drops in from the top, stripes crawling at 24px/s, for the 2.6s warning.
- Red alert, one hull plate left: the last plate blinks at 1.1s, the screen edge carries a faint `alert` vignette.
- Under reduced motion: the stripes stop and the plate holds steady in `alert`. The words still say it.

## The language of impact

From the original game, unchanged: three effects that make a laser hit, a warbird going up and a capital ship breaking apart read as the same event at three volumes.

| Effect | What it is | Small hit | Kill | Capital ship |
|---|---|---|---|---|
| Bloom | The flash | 24px | 48px | 120px |
| Trauma | Screen shake, squared on its way to an offset, 15px at most | 0.15 | 0.35 | 0.9 |
| Freeze | The held frame, which stops the run clock too | none | 30ms | 110ms |

None of it touches the simulation: a held frame does not cost score, cooldowns or difficulty. Under reduced motion, shake and freeze are skipped and the bloom is kept.

## What never moves

Text never animates letter by letter in a run. Nothing loops at rest. The HUD does not bob, breathe or scan.
