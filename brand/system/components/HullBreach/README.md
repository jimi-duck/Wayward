# HullBreach

The end of a run, as a report: the final score, four tiles that compare this run with your best, the run's curve against the best run's curve, and one button.

Built from an `ab-elbow is-alert`. HULL BREACH in `alert` with the label script; SCORE as a `label`; the figure in `numeral-xl`; the summary line in `signal` with "new best" in `nominal`. Tiles are `ab-frame`s with `cut-sm`; a tile that beat its best takes a `nominal` edge and a ▲ figure. The chart draws this run in `signal` and the previous best dashed in `ink-3`, on `rule` gridlines.

- Play again is the only way out, and it is a real button. A run ends with keys held, so "press any key" would start the next run before this one was read.
- Focus lands on Play again when the panel opens; the panel ignores input for 0.4s.
- The chart is labelled for screen readers with the two end values.
