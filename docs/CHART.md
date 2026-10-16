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
3. Which lanes can I take? The next-jump list: at most three of `options(j)`
   (`LANES_SHOWN`), picked to differ: the way straight on, the calmest, and
   whichever differs most from those. A lane that only repeats one of them is
   left off the chart (it stays in the sim; the journey is unchanged).
4. What does each cost? How hard its far end is on you (danger: quiet, watched
   or hostile, from `stance`, three pips), whether it goes straight to the gate
   or is `n` jumps longer, time (`route.days`) and jump fluid (`options.fuel`,
   the lane's base plus the weight surcharge; this is the number the drive
   burns). Supplies show only when the stores do not cover the crossing.
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

Three kinds of mark, drawn in screen pixels (the box is measured on every
draw, so a phone turning redraws it): here on the left, the lanes you can
take in the middle, the gate on the right. The graph itself is not drawn.
Each lane is coloured by its danger (teal quiet, gold watched, red hostile)
and carries its days; from each a dotted line runs on to the gate with the
jumps still to go, so the straight way and the longer ones read at once. The
selected lane is solid and bright. A red halo is the Net as last seen, a red
diamond Calloway's last sighting, a small square a port, a dotted ring a
breather.

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
after arrival, then by jump fluid; on a phone on its side the cards keep the
upside and trade-off (days and jumps are on the map, fluid in the strip); the first row is selected, so Enter alone keeps
the journey moving.

## Tuning

`npm run pilot:forks` audits the forks of many seeds and writes
[BALANCE-FORKS.md](BALANCE-FORKS.md): how often the lanes of a fork differ in
something a player can weigh.
