# The HUD

The ship and the world come first. The HUD is smoked glass bolted into the
Wayward's windscreen: a few small panels in the corners, the middle of the
picture left alone, everything else shown only while it matters. The code is
`src/ui/hud.ts` (what is written), `src/ui/targeting.ts` (marks in the world),
`src/ui/guide.ts` (the heading), `src/ui/radar.ts` (the scope) and
`src/styles/hud.css` (all of the look).

## The four corners: lines, not boxes

The corners are hairlines and brackets, with no fill, so the scene reads
through them (the pass from the Space HUD brief; the `lines, not boxes`
block at the end of `hud.css`).

- Upper left: a 1 px rule, a diamond and `OBJECTIVE`, the goal at 18 px, one mono line for the distance.
- Upper centre: one mono line, the heading and the bearing to the goal (`317° · 45° →`); no tape. Never an alert.
- Upper right: a mirrored rule; Hull as skewed pips (teal over two thirds, gold over a third, red below), Energy as a 3 px bar, Fluid in the Story. Gauges ease.
- Lower left: the scope (36 rim ticks, a longer one at each point, two dashed rings, a sweep of one turn in four seconds), then the sector, its name, and `● n hostiles` with a stepped blink.
- Lower right: the alert and the bay prompt, then one mono line of stores (Cyrite, supplies, score), then the one plate: torpedoes, mines and the place's heat, two corner brackets and a translucent fill (no blur, which costs a redraw every frame).
- Safe area: 40 px, 56 px from 1600 px wide; a phone keeps its tight margins. On a phone the plate shows only the heat (the buttons carry the rounds) and the readouts stay up.
- Teal glow on teal values only, never on a label. Labels are 10 px mono, wide-tracked, muted.
- Only the sweep, the hostile count and the eased gauges move.

Kept from the game where the brief differed: the brand fonts (Barlow Condensed, Share Tech Mono), the colour roles (steel blue is the goal and the player, teal information, gold caution and a lock, red threat), jump fluid for Fluid, system heat for Heat, no ETA (the game has no honest one), no demo buttons.

## Three levels

1. **Always:** the objective, the heading, hull / fuel / energy, the scope,
   the sector.
2. **On cue:** the alert, a threat, the capital ship, the target, a neutral
   ship's name, munitions in a fight, power-ups running, the place's effect
   on the ship, the last thing that happened.
3. **Somewhere else:** score in the Story, levels, keys, detailed cargo,
   the hunt's meter, the contacts list. Pause card, bay, chart, logbook.

## What shows where

| Place | What | When |
|---|---|---|
| Upper left | `OBJECTIVE`, the one thing to do, how far (or `6/20` jump fluid, "Fill the tank"), at most two quiet lines (the lane, a job, the optional port) | always; a red line only while a hostile is within 320 m or the Custody is at wanted 3 |
| Upper centre | the heading line (bearing and bearing to the goal), then one card: the capital ship or the target | line always (not on phones); cards on cue |
| Upper right | Hull, Fluid (Story: the drive tank, jump fluid against the lane's cost) and Cyrite (Story: the purse), Energy | always |
| Lower right, under the alert | one line of stores (Story: supplies, gold when low; Arcade: Cyrite, score and chain), then the plate: Torpedoes and Mines (dimmed until a fight, a lock or a reload), the place's heat | always |
| Under the panel | power-ups running, one chip each with a countdown | while they run |
| World | name and distance on the lane mouth, the port, an event, a neutral hull; brackets on hostiles; the target's brackets | in view |
| Edge | a pointer for the objective and the capital ship, a chevron per hull out of view | when off screen |
| Lower left | the scope; sector code and name; the scope's range | always (the text is hidden on phones) |
| Lower right (top right under the ship panel on phones) | the alert (yellow or red, one compact plate); the last thing that happened | on cue |

Colour keeps its meaning: muted steel blue (`--blue`, `--hud`) the player and
the job, teal what the ship knows, red the threat and nothing else. A dull
gold (`--caution`) is left for a yellow alert, a low reading and a cost. Small red type uses `--alert-text`
(`#f08a7e`) so it holds 4.5:1 over a bright sky.

## The alert

Yellow alert (observed) is a quiet line under the tape. Red alert (targeted)
is the loudest thing on the screen: bigger, red-tinted, its edge breathing.
The detection warnings other threads add (a capital ship noticing you in the
Arcade) belong to this card: set `#mode-t` and `#mode-s`, no new element.
Boosters belong to `#powers`: one `span` per booster, label and seconds (×count for plating and warheads, which stay until used)
(`updateSystems` in `hud.ts` builds them from `world.powers`).

## Glass

`.glass` is one component: a 1 px lit hairline cut at 45° (its left end
brighter, like a bracket), a body that lets the picture through, a sheen
along the top, one faint diagonal reflection and two tiny maintenance ticks.
Tokens, in `:root` of `hud.css`, shared with the menu and the pause card:

- built on the menu's tokens in `glass.css` (`--gl-smoke-*`, `--blur`); `--glass-fill`, `--glass-deep` the body, light and deep
- `--glass-edge`, `--glass-edge-hi` the hairline and its lit end
- `--glass-sheen` the top highlight
- `--glass-blur` the backdrop blur
- `--tint` (per panel) a colour wash: red for threat panels

Per-panel `--lit` and `--edge` colour the hairline (blue for the objective,
red for threat, teal for the target card).

## Cost

- The blur is on desktop only. `.touch-ui` and `prefers-reduced-transparency`
  set `--glass-blur: none` and a slightly darker body, so a phone never blurs
  the whole picture every frame.
- Five panels blur at most: the objective, the ship panel, the alert or capital
  card, the target card and the scope. Nothing has a filter on
  an ancestor, because that would stop `backdrop-filter` seeing the picture.
- No new per-frame DOM writes. Text is still written ten times a second and
  only when it changed; the objective rewrites its lines only when their
  text changes; marks are the same pooled spans, with two lines in `data-t`.
- No shimmer or sweep runs on its own. Motion is the HUD powering up, a card
  coming in, the red alert's edge, and the existing blinks. All of it stops
  under `prefers-reduced-motion`.

## Left out on purpose

- The ship's plate (name, class, serial) in the corner: the pause card and the
  menu carry it.
- Icons on the status rows, key chips (`1`, `2`), `Lv` labels, the contacts
  list, the Hunt meter (a red line says it when it matters), the permanent
  score in the Story.
- A separate threat card: the objective's red line and the alert say it.

## To check on a device

Glass over a bright nebula on a real phone; the scope's blur cost on a
mid-range phone; phone layout with a boss and an alert at once; German line lengths at 667 x 375.
