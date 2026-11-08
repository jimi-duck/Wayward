# Wayward artwork: icons (all in one)

*Written for someone who has never seen this project: for ChatGPT, Lovable or any image tool. Everything you need is here or linked below. The refit bay's 77+ upgrade icons are bold painted-style glyphs, but the small icons around them (the ten bay tabs, the job offer, settings, locks, the chart's system marks) are thin outline drawings that look weaker. This brief makes them match, and redraws twelve upgrade icons that read unclearly. Three icon sheets, 36 icons.*

## The project
**WAYWARD** is a 3D space-survival roguelite for desktop and phone browsers (TypeScript, Three.js, Vite). You are a fugitive on a stolen, worn yellow-orange ore hauler, the *Wayward*, carrying proof that a regime hid a purge for seventy years. The mood is industrial cyberpunk frontier: old, patched, regulated technology, "used, not dirty".

**Repository: https://github.com/jimi-duck/Wayward** (branch `main`). Read, in this order:
1. [`docs/VISION.md`](https://github.com/jimi-duck/Wayward/blob/main/docs/VISION.md): what the game is.
2. [`docs/ART-SLOTS.md`](https://github.com/jimi-duck/Wayward/blob/main/docs/ART-SLOTS.md): how pictures reach the game, sizes, what is done.
3. [`docs/DESIGN-GUIDELINES.md`](https://github.com/jimi-duck/Wayward/blob/main/docs/DESIGN-GUIDELINES.md): the UI style (Neon Glass, calm, restrained).

**Reference pictures for the look:** title art https://github.com/jimi-duck/Wayward/blob/main/docs/art/reference/wayward-title-art.jpg and menu art https://github.com/jimi-duck/Wayward/blob/main/docs/art/reference/wayward-menu-art.jpg. Good examples already made: the ten finished bay banners in [`src/art/baybanners/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/baybanners) (these set the look for the upgrades centre: a dark industrial yard, one warm yellow-orange subject, teal only on screens and beams), `src/art/fleet/wayward-rig.webp`, `src/art/fleet/wayward-signals.webp`, `src/art/fleet/capital-vance.webp`, `src/art/jobs/sc_toll.webp`.

## Check the repository's current pictures first, then match them
The game already has about 280 finished pictures. **Before you draw anything, open the ones that sit next to yours and make the new picture look like they belong with them.** Do not work from this file's words alone.
1. Open the folder for each picture on GitHub (links below). The files are `.webp`; GitHub shows them in the browser.
2. Look at **at least five neighbours** in that folder, and the single closest one to each picture you are about to make.
3. Match what you see: the **palette** (dark and muted, one warm yellow-orange anchor, teal only on screens, red only for danger), the **lighting** (one key light and a rim light, soft haze), the **level of detail and wear**, the **camera and framing**, and how much of the frame the subject fills.
4. Where a picture replaces an existing one, open the old one and keep what works (the ship, the subject, the angle) and fix only what the brief names.
5. If you cannot open the repository, say so before you start and ask for the neighbouring pictures to be attached. Do not guess the style.

Folders: ships [`src/art/ships/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/ships), fleet [`src/art/fleet/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/fleet), jobs [`src/art/jobs/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/jobs), phenomena [`src/art/phenomena/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/phenomena), places [`src/art/places/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/places), regions [`src/art/regions/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/regions), gates [`src/art/gates/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/gates), planets [`src/art/planets/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/planets), debrief [`src/art/debrief/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/debrief), icons [`public/icons/node/`](https://github.com/jimi-duck/Wayward/tree/main/public/icons/node).

**For this brief in particular:** place scenes must sit with the 25 tall job scenes in `src/art/jobs/` (960×1440, the same yard-and-haze look); the station photographs with `src/art/sightings/` (the Voice and Thren photographs); the fits with `src/art/fleet/wayward-*`; the hull with `src/art/fleet/barge.webp`.


**For this brief in particular:** open `public/icons/node/` first (for example `ph_cone.png`, `df_shield.png`, `rx_core.png`, `md_array.png`): every new icon must have exactly that weight, angularity and readability. The old thin versions, for comparison, are the line drawings in `index.html` (`<symbol id="i-laser">` and its neighbours): do not copy those.

## What to make
| Sheet | What | Count |
|---|---|---|
| `ui-1` | the ten tabs of the refit bay, the job offer and settings | 12 |
| `ui-2` | small marks used across the screens, and the four kinds of system on the jump chart | 12 |
| `redo-8` | twelve existing upgrade icons that read unclearly, redrawn with a clearer idea | 12 |

Do them in order `ui-1`, `ui-2`, `redo-8`. I add the game slots, the cutter and the screens when the sheets arrive. Ask for nothing from the repo beyond reading it.

## What to deliver
- Each sheet a **separate PNG**, named exactly as its `Save as` line. **Icons are the one exception to one-picture-per-image: deliver them as sheets**, 12 glyphs per sheet in a 4 by 3 grid, because the game cuts the glyphs out automatically (`tools/cut-bay-icon-sheets.py`).
- Solid white glyphs on pure black, one object per cell, no frame (the game draws the frame itself and tints the glyph), no text, no numbers, no grid lines. Square image, as large as possible, the glyphs centred with about 12% margin in each cell.
- One ZIP of everything. Do not change anything else in the repository: no code, no docs.
- If you run out of room, stop after a sheet and carry on when told "continue".

## Sheet `ui-1`: the ten tabs of the refit bay, the job offer and settings

Save as: **`icons__ui-1.png`**

```text
A sheet of 12 bold solid-white game icons on pure black, in a 4 by 3 grid, each icon centred in its own equal cell with large empty black margins, no labels, no numbers, no grid lines. Style: thick even strokes, slightly technical and angular, rounded corners, one simple object per icon that reads clearly at 40 pixels, a small second mark allowed (an arrow, sparks, waves), solid fills, no thin outline-only lines, no gradients, no shading, no text. Match the weight and look of the existing icons in public/icons/node/ (for example ph_cone.png, df_shield.png, rx_core.png). The icons, left to right, top to bottom: Suggested picks (a checklist with one star-marked line); Hull (a bolted hull plate with ribs); Weapons (a laser cannon firing one bolt); Ordnance (a finned torpedo); Engines (an engine nozzle with a short flame); Defence (a shield with a plate welded on); Utility (a mining rock with a pick); Signals (an antenna mast with two signal arcs); Reactor (a reactor core with a lightning mark); Synergies (two linked chain links); Job offer (a clipboard contract with a seal); Settings (a gear with a notch). Square image, as large as possible.
```

Cell order for the cutter: `tab_picks tab_hull tab_weapons tab_ordnance tab_engines tab_defence tab_utility tab_signals tab_reactor tab_synergies job gear`.

## Sheet `ui-2`: small marks used across the screens, and the four kinds of system on the jump chart

Save as: **`icons__ui-2.png`**

```text
A sheet of 12 bold solid-white game icons on pure black, in a 4 by 3 grid, each icon centred in its own equal cell with large empty black margins, no labels, no numbers, no grid lines. Style: thick even strokes, slightly technical and angular, rounded corners, one simple object per icon that reads clearly at 40 pixels, a small second mark allowed (an arrow, sparks, waves), solid fills, no thin outline-only lines, no gradients, no shading, no text. Match the weight and look of the existing icons in public/icons/node/ (for example ph_cone.png, df_shield.png, rx_core.png). The icons, left to right, top to bottom: Locked (a padlock); Jump fluid (a droplet with a spark); Supplies (a strapped crate); Cyrite (a faceted crystal); Port system (a station with a docking ring); Mining system (a rock with a mining pick and sparks); Contested system (two facing ships with a spark between them); Transit system (a straight lane with a gate arch at the end); Alert (a warning triangle with a bar and dot); Hostile contact (a diamond marker with a crosshair); Capital ship (a long ship hull inside a corner bracket); Event (a diamond with an exclamation mark). Square image, as large as possible.
```

Cell order for the cutter: `lock fluid supplies cyrite kind_port kind_mining kind_contested kind_transit alert hostile capital event`.

## Sheet `redo-8`: twelve existing upgrade icons that read unclearly, redrawn with a clearer idea

Save as: **`icons__redo-8.png`**

```text
A sheet of 12 bold solid-white game icons on pure black, in a 4 by 3 grid, each icon centred in its own equal cell with large empty black margins, no labels, no numbers, no grid lines. Style: thick even strokes, slightly technical and angular, rounded corners, one simple object per icon that reads clearly at 40 pixels, a small second mark allowed (an arrow, sparks, waves), solid fills, no thin outline-only lines, no gradients, no shading, no text. Match the weight and look of the existing icons in public/icons/node/ (for example ph_cone.png, df_shield.png, rx_core.png). The icons, left to right, top to bottom: Hull frame (a ship's rib skeleton, not a boxed X); Dampers (a coil spring between two plates); Side jets (a ship with two small side thrusters firing); Mine layer (a mine dropping from a rack); Quiet running (a ship with a sound wave cut through); Arc reach (a bolt of arc reaching a far target); Piercing beam (a beam passing through two plates); Baffles (a vent with stacked baffle plates); Heat sinks (a block with cooling fins and heat arrows); Torpedo bay (bay doors open with a torpedo in the slot); Deflector (a wedge deflecting a shot); Mine racks (a rack holding three mines). Square image, as large as possible.
```

Cell order for the cutter: `hl_frame mo_dampers mo_jets mn_layer ut_quiet cl_arc_reach ph_pierce md_baffles rx_sinks tp_bay mo_deflector mn_racks`.

## If it goes wrong
- **A sheet when a picture was asked:** reply "make this as one single full-frame picture, not a sheet".
- **Text or a border in a picture:** reply "remove all text, lines and borders".
- **Too small or soft:** reply "same picture, larger and much sharper".
- **The two fits still look alike:** reply "the guns picture needs visibly more hardware: launch rails, heavier prow mounts, extra plates; the stock picture has none".
- **Style drifts:** attach a finished neighbour from the same folder in `src/art/` and say "match this one".
