# Wayward artwork: the upgrades centre (proposal and prompts, all in one)

*Written for someone who has never seen this project: for ChatGPT, Lovable or any image tool. Everything you need is here or linked below. Proposal first, then the prompts.*

## The project
**WAYWARD** is a 3D space-survival roguelite for desktop and phone browsers (TypeScript, Three.js, Vite). You are a fugitive on a stolen, worn yellow-orange ore hauler, the *Wayward*, carrying proof that a regime hid a purge for seventy years. The mood is industrial cyberpunk frontier: old, patched, regulated technology, "used, not dirty".

**Repository: https://github.com/jimi-duck/Wayward** (branch `main`). Read, in this order:
1. [`docs/VISION.md`](https://github.com/jimi-duck/Wayward/blob/main/docs/VISION.md): what the game is.
2. [`docs/ART-SLOTS.md`](https://github.com/jimi-duck/Wayward/blob/main/docs/ART-SLOTS.md): how pictures reach the game, sizes, what is done.
3. [`docs/DESIGN-GUIDELINES.md`](https://github.com/jimi-duck/Wayward/blob/main/docs/DESIGN-GUIDELINES.md): the UI style (Neon Glass, calm, restrained).
4. [`src/content/upgrades.ts`](https://github.com/jimi-duck/Wayward/blob/main/src/content/upgrades.ts), [`src/content/web.ts`](https://github.com/jimi-duck/Wayward/blob/main/src/content/web.ts), [`src/content/modules.ts`](https://github.com/jimi-duck/Wayward/blob/main/src/content/modules.ts): every upgrade, its tab and its text.
5. [`src/ui/bay.ts`](https://github.com/jimi-duck/Wayward/blob/main/src/ui/bay.ts) and [`src/ui/icons.ts`](https://github.com/jimi-duck/Wayward/blob/main/src/ui/icons.ts): how the bay draws them.
6. [`public/icons/node/`](https://github.com/jimi-duck/Wayward/tree/main/public/icons/node): the 77 icons that exist today.

**Reference pictures for the look:** title art https://github.com/jimi-duck/Wayward/blob/main/docs/art/reference/wayward-title-art.jpg and menu art https://github.com/jimi-duck/Wayward/blob/main/docs/art/reference/wayward-menu-art.jpg. Good examples already made: `src/art/fleet/wayward-rig.webp`, `src/art/fleet/wayward-signals.webp`, `src/art/fleet/capital-vance.webp`, `src/art/jobs/sc_toll.webp`.

## 1. What the upgrades centre is
The **refit bay** is where the player spends Cyrite (the money) on upgrades. On desktop it is one screen: a left column of **ten tabs** (Suggested, Hull, Weapons, Ordnance, Engines, Defence, Utility, Signals, Reactor, Synergies), the real 3D Wayward at the top with a painted station behind it, a **grid of upgrade icons** in the middle (about 77 of them), and an **inspector** on the right (icon, name, level pips, what it changes, the Fit button). On phones it is the same data in a compact layout where the **icons carry everything**: they must read at 40 px.

## 2. What is there and what is missing
| Where | Today | Missing |
|---|---|---|
| Behind the ship, top of the bay | one painted station, the same for every tab | a picture per tab, so the bay changes with the tab |
| Inspector (desktop) | an icon only | a picture for the 24 specialisations and 5 salvage techs, the choices that define a build |
| Icons (desktop and phone) | 77 glyphs cut at 96 px from one sheet; blurry on 3× phones | the 16 yard modules have **no icon at all**; the rest are too small for modern phones |
| The four ship systems | no pictures | the four Wayward fit pictures now exist (`src/art/fleet/wayward-stock|guns|rig|signals`), ready to use as system headers |

## 3. The proposal, in three layers
Do them in this order; each is useful alone.
- **A. Icons (mobile first), 16 missing + 77 redrawn.** Draw the 16 missing yard-module icons first (they are the only blanks). Then redraw the 77 existing ones at high resolution in the same style so phones are crisp. Solid white glyphs on black, one object, no frame (the game draws the octagon frame itself and tints the glyph in steel blue, teal or dull gold). Delivered as sheets, 12 glyphs per sheet, because the game cuts glyphs out automatically (`tools/cut-bay-icons.py`).
- **B. Ten tab banners (desktop).** One wide painted picture per tab, shown behind the ship in the top of the bay, fading at the left and right edges. Subject in the middle band, the left third calm.
- **C. 29 inspector pictures (desktop).** One 16:9 picture each for the 24 specialisations and 5 salvage techs, shown at the top of the inspector when the player selects one. These are the choices that make a build feel like something, so they get a picture; the 50 plain upgrades do not.

I will add the game slots, the cutter and the screens when the pictures arrive: `bay` banners, `spec` pictures, and the new icon files. Ask for nothing from the repo beyond reading it.

## 4. The look
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture.

**The Wayward** is the player's ship: a long, low, aerodynamic ore hauler in worn yellow-orange, split side engine pods. In pictures where it appears it is small and must be the same ship as in the title art.

**Icon style (match `public/icons/node/*.png`):** bold solid-fill glyphs, thick even strokes, slightly technical and angular, rounded corners at most 10%, one simple object that reads at 40 px, a small second mark allowed (an arrow, sparks, waves) but never more than two parts. No outline-only thin lines, no gradients, no shading, no text, no frame. White on pure black. Centred with a margin of about 12% on every side.

## 5. What to deliver
- Every picture a **separate PNG**, named exactly as its `Save as` line (two underscores after the folder name, for example `baybanners__weapons.png`). **Icons are the one exception: deliver them as sheets (see batch C)**.
- One ZIP of everything. If you cannot make a ZIP, one PDF with one picture per page and the name in a caption outside the picture.
- No text, lettering, numbers, logos, frames or borders inside any picture. Sharp: banners 3000 px wide or more, inspector pictures 1920 px wide or more.
- Do not change anything else in the repository: no code, no docs.
- Do the batches in order A, B, C. If you run out of room, stop after a picture and carry on when told "continue".

## Batch A: icons (93 glyphs in 9 sheets)
**Sheet layout:** a 4 × 3 grid on pure black (up to 12 glyphs per sheet), each glyph centred in its own equal cell with at least 15% empty black around it, the glyphs in the order listed (left to right, top to bottom), **no labels, no numbers, no cell lines**. Square sheet, 4096 px or more. This is the one place where sheets are wanted, because the game cuts the glyphs out automatically.

### Sheets `yard-1` and `yard-2`: the 16 missing yard-module icons (do these first)
These are the only upgrades with no icon at all.

Save as: **`icons__yard-1.png`**

```text
A sheet of 12 bold solid-white game icons on pure black, in a 4 by 3 grid, each icon centred in its own equal cell with large empty black margins, no labels, no numbers, no grid lines. Style: thick even strokes, slightly technical and angular, rounded corners, one simple object per icon that reads clearly at 40 pixels, a small second mark allowed (an arrow, sparks, waves), solid fills, no thin outline-only lines, no gradients, no shading, no text. The icons, left to right, top to bottom: Hardpoints (heavy gun mounts on the hull); Armour plate (a thick bolted plate); Gunnery rig (a gunner's targeting rig); Shield projector (a dish that throws a shield); Cargo racks (stacked cargo racks); Machine shop (a small workshop with a tool arm); Ore tractor (a tractor beam emitter pulling a rock); Capacitor bank (a bank of capacitors); Baffles (engine baffles that hide the heat); Long-range array (a large sensor dish and mast); Jammer (a radio jammer spike); Transponder spoofer (a transponder chip with a false mark). Square image, as large as possible.
```

Save as: **`icons__yard-2.png`**

```text
A sheet of 4 bold solid-white game icons on pure black, in a 4 by 3 grid, each icon centred in its own equal cell with large empty black margins, no labels, no numbers, no grid lines. Style: thick even strokes, slightly technical and angular, rounded corners, one simple object per icon that reads clearly at 40 pixels, a small second mark allowed (an arrow, sparks, waves), solid fills, no thin outline-only lines, no gradients, no shading, no text. The icons, left to right, top to bottom: Ghost echo (a ship outline with a fading echo behind it); Guild ledger (an open ledger with a seal); Names in the Gutter (a hooded figure silhouette with a whisper mark); Friends on the docks (two figures clasping hands before a dock crane). Square image, as large as possible.
```

### Sheets `redraw-1` to `redraw-7`: redraw the 77 existing icons
Look at the current icon of each name in [`public/icons/node/`](https://github.com/jimi-duck/Wayward/tree/main/public/icons/node) first and keep its idea; only draw it larger, sharper and as bold. The names are the game's ids (the prefix says the branch: `ph` lasers, `tp` torpedoes, `mn` mines, `pl` plasma, `cl` close combat, `mo` drive, `df` defence, `ut` utility, `rx` reactor, `sy` synergy, `tech` salvaged tech, `hl` hull frame).

Save as: **`icons__redraw-1.png`**

```text
A sheet of 12 bold solid-white game icons on pure black, in a 4 by 3 grid, each icon centred in its own equal cell with large empty black margins, no labels, no numbers, no grid lines. Style: thick even strokes, slightly technical and angular, rounded corners, one simple object per icon that reads clearly at 40 pixels, a small second mark allowed (an arrow, sparks, waves), solid fills, no thin outline-only lines, no gradients, no shading, no text. The icons, left to right, top to bottom: cl_arc; cl_arc_power; cl_arc_reach; cl_juggernaut; cl_ram; cl_shock; cl_storm; df_armour; df_bulkheads; df_control; df_fortress; df_reactive. Square image, as large as possible.
```

Save as: **`icons__redraw-2.png`**

```text
A sheet of 12 bold solid-white game icons on pure black, in a 4 by 3 grid, each icon centred in its own equal cell with large empty black margins, no labels, no numbers, no grid lines. Style: thick even strokes, slightly technical and angular, rounded corners, one simple object per icon that reads clearly at 40 pixels, a small second mark allowed (an arrow, sparks, waves), solid fills, no thin outline-only lines, no gradients, no shading, no text. The icons, left to right, top to bottom: df_regen; df_regenerative; df_repair; df_shield; hl_frame; mn_chain; mn_field; mn_gravity; mn_layer; mn_racks; mn_seekers; mn_yield. Square image, as large as possible.
```

Save as: **`icons__redraw-3.png`**

```text
A sheet of 12 bold solid-white game icons on pure black, in a 4 by 3 grid, each icon centred in its own equal cell with large empty black margins, no labels, no numbers, no grid lines. Style: thick even strokes, slightly technical and angular, rounded corners, one simple object per icon that reads clearly at 40 pixels, a small second mark allowed (an arrow, sparks, waves), solid fills, no thin outline-only lines, no gradients, no shading, no text. The icons, left to right, top to bottom: mo_afterburner; mo_dampers; mo_drift; mo_evasion; mo_impulse; mo_jets; mo_thrusters; ph_array; ph_bank; ph_capacitors; ph_cone; ph_cone_wide. Square image, as large as possible.
```

Save as: **`icons__redraw-4.png`**

```text
A sheet of 12 bold solid-white game icons on pure black, in a 4 by 3 grid, each icon centred in its own equal cell with large empty black margins, no labels, no numbers, no grid lines. Style: thick even strokes, slightly technical and angular, rounded corners, one simple object per icon that reads clearly at 40 pixels, a small second mark allowed (an arrow, sparks, waves), solid fills, no thin outline-only lines, no gradients, no shading, no text. The icons, left to right, top to bottom: ph_emitters; ph_fire_control; ph_lance; ph_lance_cap; ph_lenses; ph_pierce; pl_corona; pl_flow; pl_heat; pl_ignite; pl_vent; pl_wake. Square image, as large as possible.
```

Save as: **`icons__redraw-5.png`**

```text
A sheet of 12 bold solid-white game icons on pure black, in a 4 by 3 grid, each icon centred in its own equal cell with large empty black margins, no labels, no numbers, no grid lines. Style: thick even strokes, slightly technical and angular, rounded corners, one simple object per icon that reads clearly at 40 pixels, a small second mark allowed (an arrow, sparks, waves), solid fills, no thin outline-only lines, no gradients, no shading, no text. The icons, left to right, top to bottom: rx_core; rx_sinks; sy_arc_shield; sy_arc_torps; sy_detonator; sy_plasma_torps; sy_ramjet; tech_custody; tech_gutter; tech_office; tech_thren; tech_voice. Square image, as large as possible.
```

Save as: **`icons__redraw-6.png`**

```text
A sheet of 12 bold solid-white game icons on pure black, in a 4 by 3 grid, each icon centred in its own equal cell with large empty black margins, no labels, no numbers, no grid lines. Style: thick even strokes, slightly technical and angular, rounded corners, one simple object per icon that reads clearly at 40 pixels, a small second mark allowed (an arrow, sparks, waves), solid fills, no thin outline-only lines, no gradients, no shading, no text. The icons, left to right, top to bottom: tp_bay; tp_cluster; tp_heavy; tp_magazine; tp_painter; tp_precision; tp_swarm; tp_swarm_volley; tp_tracking; tp_yield; ut_matrix; ut_prospector. Square image, as large as possible.
```

Save as: **`icons__redraw-7.png`**

```text
A sheet of 5 bold solid-white game icons on pure black, in a 4 by 3 grid, each icon centred in its own equal cell with large empty black margins, no labels, no numbers, no grid lines. Style: thick even strokes, slightly technical and angular, rounded corners, one simple object per icon that reads clearly at 40 pixels, a small second mark allowed (an arrow, sparks, waves), solid fills, no thin outline-only lines, no gradients, no shading, no text. The icons, left to right, top to bottom: ut_quiet; ut_salvager; ut_scanner; ut_tactical; ut_tractor. Square image, as large as possible.
```

## Batch B: tab banners (10)
**Shape:** a wide landscape picture (16:9). Keep the subject in the **middle 55% of the height** and the **right two thirds**; the left third must be calm and dark because the game fades the left edge into the UI. The wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) may appear very small for scale. One picture only, full frame, not a sheet.

### baybanners/suggested

Save as: **`baybanners__suggested.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: the "Suggested" tab of the refit bay. A wide view of the whole refit bay workshop at work: the Wayward in a cradle, gantry arms, parts racks, a technician silhouette far off, warm work lights. Wide landscape picture (16:9), subject in the middle band and the right two thirds, the left third calm and dark. One picture only, full frame, not a sheet or a grid.
```

### baybanners/hull

Save as: **`baybanners__hull.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: the "Hull" tab of the refit bay. The Wayward's plating and frame: armour plates and ribs being fitted along the hull by gantry arms, the prow in close three-quarter view, sparks of a welder. Wide landscape picture (16:9), subject in the middle band and the right two thirds, the left third calm and dark. One picture only, full frame, not a sheet or a grid.
```

### baybanners/weapons

Save as: **`baybanners__weapons.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: the "Weapons" tab of the refit bay. A laser emitter and capacitor bay: heavy emitter barrels in a test rack, a bank of capacitors, cooling pipes; one cold teal test beam crossing the frame. Wide landscape picture (16:9), subject in the middle band and the right two thirds, the left third calm and dark. One picture only, full frame, not a sheet or a grid.
```

### baybanners/ordnance

Save as: **`baybanners__ordnance.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: the "Ordnance" tab of the refit bay. A torpedo and mine magazine: racked torpedoes on a loading rail, a mine layer drum, ammunition crates stencilled in worn paint, dull gold caution stripes. Wide landscape picture (16:9), subject in the middle band and the right two thirds, the left third calm and dark. One picture only, full frame, not a sheet or a grid.
```

### baybanners/engines

Save as: **`baybanners__engines.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: the "Engines" tab of the refit bay. A drive test cradle: the Wayward's engine pod mounted on a test stand, exhaust glowing a restrained engine blue, thruster vanes, a plasma vent behind. Wide landscape picture (16:9), subject in the middle band and the right two thirds, the left third calm and dark. One picture only, full frame, not a sheet or a grid.
```

### baybanners/defence

Save as: **`baybanners__defence.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: the "Defence" tab of the refit bay. A shield projector and armour workshop: a shield emitter dish, layered armour plates stacked, a damage-control bay with cables; a faint teal shield shimmer. Wide landscape picture (16:9), subject in the middle band and the right two thirds, the left third calm and dark. One picture only, full frame, not a sheet or a grid.
```

### baybanners/utility

Save as: **`baybanners__utility.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: the "Utility" tab of the refit bay. The tractor and scanner rig: an ore tractor beam emitter, a scanner mast, ore sample cases and a Cyrite crate; a rock held in a soft teal beam. Wide landscape picture (16:9), subject in the middle band and the right two thirds, the left third calm and dark. One picture only, full frame, not a sheet or a grid.
```

### baybanners/signals

Save as: **`baybanners__signals.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: the "Signals" tab of the refit bay. A dim signals room: an antenna array and dish, a jammer module, baffles on the engines, one teal screen glowing; quiet and a little ghostly. Wide landscape picture (16:9), subject in the middle band and the right two thirds, the left third calm and dark. One picture only, full frame, not a sheet or a grid.
```

### baybanners/reactor

Save as: **`baybanners__reactor.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: the "Reactor" tab of the refit bay. The ship's core: a reactor core in a cage, heat exchangers and coolant pipes, a frame truss; warm light from the core, steam, no more than a restrained glow. Wide landscape picture (16:9), subject in the middle band and the right two thirds, the left third calm and dark. One picture only, full frame, not a sheet or a grid.
```

### baybanners/synergies

Save as: **`baybanners__synergies.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: the "Synergies" tab of the refit bay. Two fitted parts linked: salvaged tech from a defeated capital ship bolted next to a native part, thin teal cables joining them like a schematic coming to life. Wide landscape picture (16:9), subject in the middle band and the right two thirds, the left third calm and dark. One picture only, full frame, not a sheet or a grid.
```

## Batch C: inspector pictures (29)
**Shape:** 16:9, one clear subject filling the frame, readable as a thumbnail. These show a part of the ship or a weapon doing its thing, in the workshop or just after use; the Wayward may be small in the background. One picture only, full frame, not a sheet.

### spec/ph_cone

Save as: **`spec__ph_cone.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Laser cone", a specialisation of the lasers branch. What it does in the game: Every shot becomes a fan of three lances. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/ph_lance

Save as: **`spec__ph_lance.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Heavy lance", a specialisation of the lasers branch. What it does in the game: Slow, heavy lances that punch through a line of targets. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/ph_array

Save as: **`spec__ph_array.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Targeting array", a specialisation of the lasers branch. What it does in the game: Your lances bend onto the hull nearest your nose. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/tp_heavy

Save as: **`spec__tp_heavy.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Heavy payload", a specialisation of the torpedoes branch. What it does in the game: Quantum warheads: each torpedo is a much bigger blast. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/tp_swarm

Save as: **`spec__tp_swarm.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Swarm launcher", a specialisation of the torpedoes branch. What it does in the game: Each press fires three micro-torpedoes at different targets. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/tp_precision

Save as: **`spec__tp_precision.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Precision guidance", a specialisation of the torpedoes branch. What it does in the game: Your torpedoes lock in every direction, fly faster and hit hulls harder. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/mn_field

Save as: **`spec__mn_field.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Minefield doctrine", a specialisation of the mines branch. What it does in the game: Twice the mines, lasting twice as long. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/mn_chain

Save as: **`spec__mn_chain.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Chain reaction", a specialisation of the mines branch. What it does in the game: A blast sets off every mine near it and leaves a burning cloud. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/mn_gravity

Save as: **`spec__mn_gravity.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Graviton mines", a specialisation of the mines branch. What it does in the game: Your mines drag hulls and rock in before they go off, harder. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/pl_ignite

Save as: **`spec__pl_ignite.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Ignition", a specialisation of the plasma branch. What it does in the game: Hulls that touch your trail keep burning after they leave it. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/pl_wake

Save as: **`spec__pl_wake.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Afterburner wake", a specialisation of the plasma branch. What it does in the game: Your barrel roll dumps a ring of plasma, and comes round sooner. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/cl_storm

Save as: **`spec__cl_storm.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Arc storm", a specialisation of the close combat branch. What it does in the game: Your arcs jump on from each target to one more. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/cl_juggernaut

Save as: **`spec__cl_juggernaut.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Juggernaut", a specialisation of the close combat branch. What it does in the game: An extra hull plate, and rams that hit nearly twice as hard. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/mo_drift

Save as: **`spec__mo_drift.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Drift drive", a specialisation of the drive and handling branch. What it does in the game: Off the throttle you keep your speed and turn faster, and your lances hit harder. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/mo_evasion

Save as: **`spec__mo_evasion.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Evasive pattern", a specialisation of the drive and handling branch. What it does in the game: A longer roll, and it comes round much sooner. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/df_fortress

Save as: **`spec__df_fortress.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Fortress", a specialisation of the defence branch. What it does in the game: Another hull plate and a second shield charge. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/df_reactive

Save as: **`spec__df_reactive.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Reactive armour", a specialisation of the defence branch. What it does in the game: Losing a plate or a shield blasts away the fire around you. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/df_regenerative

Save as: **`spec__df_regenerative.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Regenerative hull", a specialisation of the defence branch. What it does in the game: Voice alloy: your hull mends itself faster, even with hostiles close. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/pl_corona

Save as: **`spec__pl_corona.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Plasma corona", a specialisation of the plasma branch. What it does in the game: While you thrust, plasma wreathes your hull: anything you brush burns. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/cl_shock

Save as: **`spec__cl_shock.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Shock prow", a specialisation of the close combat branch. What it does in the game: Every ram discharges an arc into the hulls near what you hit. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/mo_afterburner

Save as: **`spec__mo_afterburner.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Afterburner", a specialisation of the drive and handling branch. What it does in the game: A much higher top speed. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/ut_prospector

Save as: **`spec__ut_prospector.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Prospector", a specialisation of the utility branch. What it does in the game: Rock gives up Cyrite half again as often. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/ut_salvager

Save as: **`spec__ut_salvager.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Salvage drones", a specialisation of the utility branch. What it does in the game: Hull repairs turn up more often, and boosters last half again as long. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/ut_scanner

Save as: **`spec__ut_scanner.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Deep scanners", a specialisation of the utility branch. What it does in the game: Boosters turn up twice as often, and elites carry twice the Cyrite. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/tech_gutter

Save as: **`spec__tech_gutter.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Gutter scatterguns", a salvaged piece of enemy tech taken from a defeated capital ship. What it does in the game: Every fourth laser shot is a scattergun slug at triple damage. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/tech_custody

Save as: **`spec__tech_custody.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Custody compressors", a salvaged piece of enemy tech taken from a defeated capital ship. What it does in the game: Your lances reach further and pierce one more target; torpedo blasts widen. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/tech_office

Save as: **`spec__tech_office.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Offices of Peace cloak", a salvaged piece of enemy tech taken from a defeated capital ship. What it does in the game: A barrel roll cloaks you: hostile hulls hold their fire for a moment. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/tech_voice

Save as: **`spec__tech_voice.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Voice adaptive shield", a salvaged piece of enemy tech taken from a defeated capital ship. What it does in the game: Your shield adapts: it recharges sooner and faster. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

### spec/tech_thren

Save as: **`spec__tech_thren.png`**

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor (the Wayward), teal only for screens and information, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, small restrained glow, never cartoonish. No text, lettering, numbers, logos, watermark or border anywhere in the picture. Subject: "Thren snares", a salvaged piece of enemy tech taken from a defeated capital ship. What it does in the game: Your torpedo and mine blasts snare the hulls they catch, slowing them hard. Show it as an installed, working piece of the Wayward's gear in a realistic workshop or in use in space, one clear object, lit from one side with a rim light. Wide landscape picture (16:9). One picture only, full frame, not a sheet or a grid.
```

## If it goes wrong
- **A sheet when a picture was asked (batches B and C):** reply "make this as one single full-frame picture, not a sheet".
- **Icons look thin or outlined:** reply "bolder, solid white fills, thick strokes, like a game HUD icon".
- **Icons have frames, text or numbers:** reply "remove every frame, label and number; the glyphs only, on black".
- **Icons are not centred in their cells:** reply "each icon centred in an equal cell with large margins; do not let any touch a neighbour".
- **Text or a border in a picture:** reply "remove all text, lines and borders".
- **Too small or soft:** reply "same picture, larger and much sharper".
- **Style drifts:** attach the best picture so far and say "match this one".
