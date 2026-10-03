# TickMeter

The segmented bar every quantity in the game is read from: progress to the next refit, the overcharge gauge, a capital ship's hull, a ranked stat. Segments read as a count even at a glance, which a smooth bar does not.

Provide: `<div class="ab-ticks" style="--v:.62"></div>` where `--v` is the fill from 0 to 1. Wrap it in `ab-ticks-wrap` to give the lit segments a glow on Bridge. Width comes from the container.

| Variant | Use |
|---|---|
| `ab-ticks` | `signal`: XP rail, overcharge filling |
| `ab-ticks--command` | Overcharge full: the gauge goes amber and the key cap fills |
| `ab-ticks--alert` | A capital ship's hull bar |
| `ab-ticks--tall` + `ab-cursor` | A loading or progress instrument with a cursor tick |
| `ab-pips` | Ten discrete pips for the shakedown stats, ranked: the best hull gets ten, the worst three |

- The XP rail runs the full width of the screen: progress to the next upgrade is the number a run is steered by.
- Pair every meter with its label and its figure; a meter alone is decoration.
- Fill moves tick by tick (see Motion), never as a smooth slide.
