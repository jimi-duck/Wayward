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
   whichever differs most from those. The chart is laid out so that nearly
   every system has two lanes on (`makeChart`: each system links to the two
   nearest in the next column, no sideways lanes) and `options` never goes back
   along the chart, so each jump is a real fork, not a list. New charts only:
   a saved journey keeps the lanes it was laid out with.
4. What does each cost? How hard its far end is on you (danger: quiet, watched
   or hostile, from `stance`, three pips), how the Custody's heat goes there, shown only where it differs between the
   lanes shown (`heatAt`: it cools in a breather, is low, climbs, or climbs fast; from the
   kind's start and rate, the region's, a Net blockade and watched space),
   whether it goes straight to the gate
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
- A shortage of jump fluid is said once at the top (`trouble`: the exact amount
  the cheapest lane is short by), and the button reads `Plot course · n more
  jump fluid` in caution gold instead of `Jump to …`. It is not disabled: the
  drive's jump happens at the Jump Gate of the next system once the tank
  holds the lane's cost (`world.ts`), and the fluid is mined and refined on
  the way there, so blocking the plot would leave a ship with an empty tank
  nowhere to go. The tank is never touched here.
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

The region ahead as it really is, drawn in screen pixels (the box is measured
on every draw, so a phone turning redraws it). Columns run left to right from
here to the gate, each system at the height the simulation gives it, and the
lanes between them are the real forward lanes, so the way on reads as a
connected net you cross. Only systems you can still reach are drawn, small and
unnamed. The lanes out of here are coloured by their danger (teal quiet, gold
watched, red hostile) with the lane's days under its name; the selected one is
solid and bright, and the systems and lanes you could reach by taking it are
drawn a little brighter than the rest. A red halo is the Net as last seen, a
red diamond Calloway's last sighting, a small square a port, a dotted ring a
breather.

## What to expect

Each card carries one sentence, chosen in `forks()` (`say`), first match wins,
only from known state: the gate; Calloway last seen there; held by the Net; a
contested system; hostile (raiders, Thren); a hazard in a place already sighted;
a heavy job already sighted; a breather (quiet, not netted); a port (and that a
watched one draws the Custody); a place already sighted; claimed ground; watched
space; rich or open rock; otherwise open space with no port. A sentence about
danger reads red. The map numbers its lanes with the same 1, 2, 3 as the cards
and the keys, and lights only those lanes; the heading names the goal ("Which
way to The Narrows?") and the header's goal block says it again with the jumps
left.

There is no score and no ranking. The list is sorted by the gate's distance
after arrival, then by jump fluid; on a phone on its side the cards keep the
sentence (days and jumps are on the map, fluid in the strip); the first row is selected, so Enter alone keeps
the journey moving.

## Tuning

`npm run pilot:forks` audits the forks of many seeds and writes
[BALANCE-FORKS.md](BALANCE-FORKS.md): how often the lanes of a fork differ in
something a player can weigh.

## Map look

The map sits on a dark backdrop with a fine grid, faint dust and a compass. Lanes bend (each one the same way every draw, from a hash of its ends). Lanes out of here are dashed and coloured by danger; the selected one is solid with a soft underlay and a pill with its jump fluid (gold when short). The rest of the net is small, dashed and unnamed. Systems share one outline weight: the kind is the shape (port square, mining hexagon, transit ring, anomaly diamond in violet, gate double diamond in gold, here double ring), danger is the colour, and a hostile system also carries a red triangle. The same shapes are the icons on the cards, and the resource icons (fluid, Cyrite, supplies, hull) share one size and weight. Heat pips are amber, threat pips teal, amber or red.

## Layout

On a wide window the header, alerts, body and strip share one two-column grid: the title and goal over the map, the four stores over the cards. The type steps down in four sizes: the system name, the section heading and the lane names, the sentence, the small labels. The strip at the bottom is only the selected lane's name and the one action; what the lane takes is on its card.

The goal block ends with one line of quest, per region (`WHYS` in `content/situations.ts`, in the order of the region questions): why the player is going on. Hidden on a phone on its side.
