# Wayward artwork: two pictures to fix (all in one)

*Written for someone who has never seen this project. Everything you need is here or linked below. Two pictures, `wayward-stock` and `wayward-guns`, which currently look almost the same.*

## The project
**WAYWARD** is a 3D space-survival roguelite for desktop and phone browsers (TypeScript, Three.js, Vite). You are a fugitive on a stolen, worn yellow-orange ore hauler, the *Wayward*, carrying proof that a regime hid a purge for seventy years. The mood is industrial cyberpunk frontier: old, patched, regulated technology, "used, not dirty".

**Repository: https://github.com/jimi-duck/Wayward** (branch `main`). Read, in this order:
1. [`docs/VISION.md`](https://github.com/jimi-duck/Wayward/blob/main/docs/VISION.md): what the game is.
2. [`docs/ART-SLOTS.md`](https://github.com/jimi-duck/Wayward/blob/main/docs/ART-SLOTS.md): how pictures reach the game, sizes, what is done.
3. [`docs/art/briefs.md`](https://github.com/jimi-duck/Wayward/blob/main/docs/art/briefs.md): the full prompt for every picture in the game.
4. [`src/art/fleet/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/fleet): the finished fleet pictures, including the four Wayward fits.

**Reference pictures for the look:**
- Title art: https://github.com/jimi-duck/Wayward/blob/main/docs/art/reference/wayward-title-art.jpg (this is the Wayward; match this exact ship)
- Menu art: https://github.com/jimi-duck/Wayward/blob/main/docs/art/reference/wayward-menu-art.jpg
- The current fits, to keep the hull the same: `src/art/fleet/wayward-stock.webp`, `wayward-guns.webp`, `wayward-rig.webp` (good: the cargo racks and tractor emitter read clearly), `wayward-signals.webp` (good: dishes and masts read clearly).

## Check the repository's current pictures first, then match them
The game already has about 280 finished pictures. **Before you draw anything, open the ones that sit next to yours and make the new picture look like they belong with them.** Do not work from this file's words alone.
1. Open the folder for each picture on GitHub (links below). The files are `.webp`; GitHub shows them in the browser.
2. Look at **at least five neighbours** in that folder, and the single closest one to each picture you are about to make.
3. Match what you see: the **palette** (dark and muted, one warm yellow-orange anchor, teal only on screens, red only for danger), the **lighting** (one key light and a rim light, soft haze), the **level of detail and wear**, the **camera and framing**, and how much of the frame the subject fills.
4. Where a picture replaces an existing one, open the old one and keep what works (the ship, the subject, the angle) and fix only what the brief names.
5. If you cannot open the repository, say so before you start and ask for the neighbouring pictures to be attached. Do not guess the style.

Folders: ships [`src/art/ships/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/ships), fleet [`src/art/fleet/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/fleet), jobs [`src/art/jobs/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/jobs), phenomena [`src/art/phenomena/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/phenomena), places [`src/art/places/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/places), regions [`src/art/regions/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/regions), gates [`src/art/gates/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/gates), planets [`src/art/planets/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/planets), debrief [`src/art/debrief/`](https://github.com/jimi-duck/Wayward/tree/main/src/art/debrief), icons [`public/icons/node/`](https://github.com/jimi-duck/Wayward/tree/main/public/icons/node).

**For this brief in particular:** open all four `src/art/fleet/wayward-*.webp` and keep the same hull, camera and black ground; only the fit changes.

## What is wrong
The ship has four fits, and the player sees them side by side in the refit bay and the debrief. Two of them are the problem:
- **`wayward-stock`** is meant to be the bare ship as she starts, but it is dressed with greebles and a small dish, so it reads as a fitted ship.
- **`wayward-guns`** is meant to be clearly armed, but it only adds one small dish; it looks like `wayward-stock` with a bit more clutter.
The difference must be readable **at thumbnail size** (about 240 px wide), as a silhouette first.

## The Wayward, in one line
The Wayward is a long, low, aerodynamic ore hauler in worn yellow-orange, with split side engine pods, a sloped nose and a long spine. It must look like the same ship as in the title art, and the same hull as the existing `wayward-rig` and `wayward-signals` pictures, with only the fittings changing. Same angle in all four: three-quarter side view from slightly above, nose pointing right.

## The look
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor, teal only for screens, red only for danger, no neon pink. Soft haze, one key light with a rim light, small restrained glow. No text, lettering, numbers, logos, watermark or border anywhere in the picture.

## What to deliver
- Two separate PNGs named exactly `fleet__wayward-stock.png` and `fleet__wayward-guns.png` (two underscores after the folder name). They replace the files of the same name.
- Hand them back in one ZIP. If you cannot make a ZIP, one PDF with one picture per page and the name in a caption outside the picture.
- At least 2000 px wide, sharp, **no frame line or border** (edge lines were a flaw in earlier batches).
- Do not change anything else in the repository: no code, no docs.

## Picture 1: fleet/wayward-stock

Save as: **`fleet__wayward-stock.png`**

**Details.** The bare ship, as she starts: clean and plain compared with the others. No gun barrels, no dish, no cargo, no antennae, no extra plates. Smooth worn yellow-orange hull panels, a bare dorsal spine, the two engine pods with a faint blue glow, a few cockpit lights, brand marks WAYWARD and OBEDIENCE CLASS as faint stencils (as marks only, not legible text). Slightly less dirty than the fitted versions: scuffed, not battered. The silhouette should be the smoothest of the four.

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor, teal only for screens, red only for danger, no neon pink. Soft haze, one key light with a rim light, small restrained glow. No text, lettering, numbers, logos, watermark or border anywhere in the picture. The Wayward is a long, low, aerodynamic ore hauler in worn yellow-orange, with split side engine pods, a sloped nose and a long spine. Show her exactly as she starts, nothing added: a clean, bare spine with no turrets, no dishes, no antennae and no cargo; smooth worn yellow-orange hull panels, scuffed but not battered; two engine pods with a faint blue glow, a few cockpit lights, faint stencilled brand marks. Keep the hull identical to the title art. Wide landscape picture (3:2), one ship, three-quarter side view from slightly above, nose pointing right, pure black background, the whole ship in frame, centred, filling about 80% of the width. One picture only, full frame, not a sheet or a grid.
```

## Picture 2: fleet/wayward-guns

Save as: **`fleet__wayward-guns.png`**

**Details.** The same hull, visibly turned into a gunboat. The silhouette must bristle compared with stock: **two twin gun turrets on the spine** (one behind the cockpit, one mid-ship) with long barrels, **a sponson gun pod on each flank** with a barrel pointing forward past the nose line, extra armour plate welded over the flanks and the cockpit brow, a **shield projector dish** on top behind the cockpit, ammunition feed cables, scorch marks near the muzzles, a dull gold caution stripe on one plate. Still unmistakably the Wayward, only armed.

```text
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor, teal only for screens, red only for danger, no neon pink. Soft haze, one key light with a rim light, small restrained glow. No text, lettering, numbers, logos, watermark or border anywhere in the picture. The Wayward is a long, low, aerodynamic ore hauler in worn yellow-orange, with split side engine pods, a sloped nose and a long spine. Show her fitted for Guns: the same hull with two twin gun turrets on the spine with long barrels (one behind the cockpit, one mid-ship), a sponson gun pod on each flank with a barrel reaching forward, extra armour plate welded over the flanks and the cockpit brow, a shield projector dish behind the cockpit, ammunition feed cables, scorch marks around the muzzles and a dull gold caution stripe on one plate. Clearly more armed than the bare ship, still the same ship as the title art. Wide landscape picture (3:2), one ship, three-quarter side view from slightly above, nose pointing right, pure black background, the whole ship in frame, centred, filling about 80% of the width. One picture only, full frame, not a sheet or a grid.
```

## If it goes wrong
- **Stock still looks dressed:** reply "remove everything on the spine: no dish, no turrets, no antennae, plain panels".
- **Guns still looks like stock:** reply "make the guns bigger and longer, two turrets on the spine and a barrel on each flank, readable as a silhouette".
- **A sheet or two ships in one picture:** reply "one single full-frame picture of one ship, not a sheet".
- **The ship looks different from the title art:** attach the title art and say "this exact ship, only the fittings change".
- **A border or text in the picture:** reply "remove all text, lines and borders".
