# The jump chart

The screen between two systems, where the next jump is chosen. The panel is
`ui/chart.ts` (markup in `index.html`, look in `styles/chart.css`); the facts it
shows come from `sim/forks.ts`, which reads the journey and adds nothing of its
own to the rules.

## What it answers

1. Where am I? The header: `ARRIVED · system`, the region and the day.
2. How far is the way out? The header: the gate's name, the jumps remaining
   (counted on the graph by `jumps()`, never from the screen) and a bar from the
   region's way in.
3. Which lanes can I take? The next-jump list: exactly `options(j)`, nothing else.
4. What does each cost? Time (`route.days`), jump fluid (`options.fuel`, the
   lane's base plus the weight surcharge; this is the number the drive burns),
   supplies (`options.supplies`, days plus the drive's wear) and the jumps left
   to the gate after arriving.
5. What does each offer and ask? One upside and one trade-off, only from what
   the chart knows (below).
6. Which one am I taking? The strip at the foot: the selected lane's four
   numbers and the one button, `Jump to …`.

## Rules of the screen

- A tap, a click, the arrows, `1`–`6` or the pad's d-pad only **select**. Enter,
  Space, the pad's A or the button jump. Hovering changes nothing.
- Nothing locks. A lane the tank cannot yet pay for shows `n short` in gold and
  still selects: the jump itself waits on the refinery, as before. The tank is
  never touched here.
- Escape (or the pad's B) closes Intel. There is no screen behind the chart (the
  last system is over), so there is no Back button; it would have nowhere to go.
- `I` (or the pad's X) opens Intel: what the last system changed, the story's
  questions, the file, Calloway's trail, the Net's size, each faction's notice,
  ship trouble (weight, hot guns) and the factions on the move. Nothing was
  removed from the game; it moved here.
- Alerts show only what is true now: out of or low on supplies, no lane the tank
  can pay for, the Net holding this system, Calloway in this system or one jump
  behind.

## The map

Drawn in screen pixels (the box is measured on every draw, so a phone turning
redraws it). Columns keep the order and the rows the heights the simulation has;
the columns round the ship get more width than the far ones so the lanes out are
readable. The lanes you can take are dashed steel blue with their jump fluid on
a small plate; the selected one is solid and bright. Everything else is a faint
line and a small plain dot. Names go to here, the gate, the lanes out and the
selected system, each on the first free side of its node.

| Mark | Meaning |
|---|---|
| Ringed white, `HERE` | where the ship is |
| Bright ring and solid lane | the selected lane |
| Dashed lane | another lane out |
| Red halo (and a triangle, on a lane out) | the Net, as last seen |
| Red diamond | where Calloway was last seen |
| Violet diamond | a known anomaly (a gravity well, a Thren lane) |
| Gold diamond, `GATE` | the region's way out |
| Teal square | a port |
| Dotted teal ring | a breather |

## Upside and trade-off

Chosen in `forks()` in this order, first match wins, and only from known state.

- Upside: the gate itself; a port (trade, supplies, refit); a breather (the
  system is `quiet` and the Net has not reached it); a place already sighted;
  rich rock (a survey if it has not been flown); the cheapest jump or the
  shortest crossing, when the lanes differ.
- Trade-off: Calloway last seen there; the Net as of the day you last had news;
  a contested system; hostile (raiders, Thren); a watched port; the days in a
  two-day lane; no port.

There is no score and no ranking. The list is sorted by the gate's distance
after arrival, then by jump fluid; the first row is selected, so Enter alone keeps
the journey moving.

## Tuning

`npm run pilot:forks` audits the forks of many seeds and writes
[BALANCE-FORKS.md](BALANCE-FORKS.md): how often the lanes of a fork differ in
something a player can weigh.
