# Wayward artwork: new places (all in one)

*Written for someone who has never seen this project: for ChatGPT, Lovable or any image tool. Everything you need is here or linked below. Every picture the game defined is already drawn; this brief covers places the game gained since: four place scenes, three station photographs, two Wayward fits to redo, and one hull.*

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

## What to make
| Batch | What | Count | Size |
|---|---|---|---|
| A | Place scenes for four cards that open at a place | 4 | 960×1440 (2:3 portrait) |
| B | Photographs of three new stations | 3 | 1920×1440 (4:3) |
| C | Redo `wayward-stock` and `wayward-guns` (they look alike) | 2 | 1920×960 (2:1) on pure black |
| D | A repair gantry hull for the comms hull strip | 1 | 1920×960 (2:1) on pure black |

Do them in order A, B, C, D. I add the game slots, the cutter and the screens when the pictures arrive. Ask for nothing from the repo beyond reading it.

## What to deliver
- Every picture a **separate PNG**, named exactly as its `Save as` line (folder name, two underscores, id). **One picture per image, never a contact sheet or grid.**
- One ZIP of everything. If you cannot make a ZIP, one PDF with one picture per page and the name in a caption outside the picture.
- No text, lettering, numbers, logos, frames or borders inside any picture. Sharp: scenes and photographs 1920 px on the long side or more; ships 1920 px wide or more.
- Do not change anything else in the repository: no code, no docs.
- If you run out of room, stop after a picture and carry on when told "continue".

## The look
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty". Mostly dark, one warm yellow-orange anchor, teal only for screens and the damping-field ring, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, restrained glow, never cartoonish. The full style text is inside each prompt: paste each one as it is.

## Batch A: four place scenes (960×1440)
These show on the pop-up cards that open when the Wayward arrives at a place. Open `src/art/jobs/sc_toll.webp` and two others first: same format, same level of detail, the scene's own place as the subject.

Save as: **`jobs__sc_depot.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Frontier Supply Depot, a yellow-orange industrial supply depot with a docking ring, a thin teal damping-field ring around the dock, work lights, fuel tanks, cargo racks and one berthed hauler. The Wayward is approaching the ring.
Framing: tall portrait 2:3, shown full height down the right side of a card, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is small in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_audit.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Kellern Audit Dock, an off-white company yard with a big inspection arch, stencilled bay numbers and cold white work lights; a teal scanning beam sweeping a waiting hull; Custody grey-black with a thin red stripe on the arch. The Wayward is nose-on to the arch.
Framing: tall portrait 2:3, shown full height down the right side of a card, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is small in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_market.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the Dust Market, a raft of Dust Traders' stalls adrift on a lane: patched awnings, hanging lanterns in warm amber, crates of warheads and plating plates, tethered skiffs, the back deck open to space. The Wayward is slowing alongside.
Framing: tall portrait 2:3, shown full height down the right side of a card, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is small in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_yard.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Ned's yard, a small independent paint yard built into the side of an asteroid, off the lane: lit steel gantries and paint rigs bolted to the rock, a ring of teal light marking the work pad, work lights in warm amber. The Wayward hangs in the ring with her hull just changed from company grey to clear yellow-orange, one panel still masked. The Wayward fills the middle third of the frame, the yard around it.
Framing: tall portrait 2:3, shown full height down the right side of a card, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is large in the middle of the frame. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

## Batch B: three station photographs (1920×1440)
These are collected as found photographs in the Archive once the player has seen the place. Open the Voice and Thren pictures in `src/art/sightings/` first (for example `voice_direct.webp` and `thren_lane.webp`) and match their grain and distance.

Save as: **`sightings__raider_den.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: a raider den: a hollowed asteroid hideout with scrap-plate hull patches in coppery orange (#C9845A), a launch bay glowing amber, pirate ships tethered or pulling out.
Framing: 4:3 landscape, a found photograph: seen from a distance through a long lens, slightly grainy and soft, a little off-centre, as if taken by someone who should not have been there. One clear subject. No people's faces, no text, no UI.
```

Save as: **`sightings__thren_seed.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: a Thren seed: a slow grey-violet growth fixed to a rock, spined and lattice-like, small motes drifting off it. Calm and alien, not a monster. Violet only in the far background; nothing glows brightly.
Framing: 4:3 landscape, a found photograph: seen from a distance through a long lens, slightly grainy and soft, a little off-centre, as if taken by someone who should not have been there. One clear subject. No people's faces, no text, no UI.
```

Save as: **`sightings__relay_post.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: a Custody relay post: a black-and-white regulation mast with a dish and a scan array, thin red piping, a patrol pair docked on its arms. Cold and institutional.
Framing: 4:3 landscape, a found photograph: seen from a distance through a long lens, slightly grainy and soft, a little off-centre, as if taken by someone who should not have been there. One clear subject. No people's faces, no text, no UI.
```

## Batch C: finish the Wayward fits (1920×960 on pure black)
`wayward-stock` and `wayward-guns` are the Wayward as fitted at the start and with the gun upgrades, and today they look almost the same. Open `src/art/fleet/wayward-stock.webp`, `wayward-guns.webp`, `wayward-rig.webp` and `wayward-signals.webp` first. Keep the hull, the angle and the black background of the other two; change only what the prompt names. The full earlier brief is [`docs/art/WAYWARD-FITS-BRIEF.md`](https://github.com/jimi-duck/Wayward/blob/main/docs/art/WAYWARD-FITS-BRIEF.md).

Save as: **`fleet__wayward-stock.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the Wayward exactly as she leaves the yard: a long, low, worn yellow-orange ore hauler with split side engine pods, no extra equipment, the stock hull with plain gun mounts, no launch rails, no lens pods, no added plates. This is the plain baseline the other fits build on.
Framing: three-quarter side view from slightly above, nose pointing right, the whole hull in frame with generous room around it, on a pure black background, lit from one side with a soft rim light. A clear silhouette that reads at 120 pixels wide. No planet, no other ships, no stars, no people, no text.
```

Save as: **`fleet__wayward-guns.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the Wayward with every weapon upgrade fitted: the same hull as the stock picture, now with a pair of launch rails along the top of the hull, heavier gun mounts at the prow, extra armour plates over the pods and visible ammunition feeds. It must be obviously different from the stock picture at a glance, with more hardware and heavier weapons.
Framing: three-quarter side view from slightly above, nose pointing right, the whole hull in frame with generous room around it, on a pure black background, lit from one side with a soft rim light. A clear silhouette that reads at 120 pixels wide. No planet, no other ships, no stars, no people, no text.
```

## Batch D: one hull (1920×960 on pure black)
Open `src/art/fleet/barge.webp` and `salvager.webp` first (the same family of working hulls).

Save as: **`fleet__gantry.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: a repair gantry: a stationary repair rig seen as a ship-sized working frame: a girder cradle with hanging tool arms, welding lights in warm amber, a half-open hull plate being held, patched grey-black and yellow hazard paint. It reads as a hull on the comms strip.
Framing: three-quarter side view from slightly above, nose pointing right, the whole hull in frame with generous room around it, on a pure black background, lit from one side with a soft rim light. A clear silhouette that reads at 120 pixels wide. No planet, no other ships, no stars, no people, no text.
```

## If it goes wrong
- **A sheet when a picture was asked:** reply "make this as one single full-frame picture, not a sheet".
- **Text or a border in a picture:** reply "remove all text, lines and borders".
- **Too small or soft:** reply "same picture, larger and much sharper".
- **The two fits still look alike:** reply "the guns picture needs visibly more hardware: launch rails, heavier prow mounts, extra plates; the stock picture has none".
- **Style drifts:** attach a finished neighbour from the same folder in `src/art/` and say "match this one".
