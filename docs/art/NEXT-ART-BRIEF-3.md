# Wayward artwork: more places and moments (all in one)

*Written for someone who has never seen this project: for ChatGPT, Lovable or any image tool. Everything you need is here or linked below. Every picture the game already asked for is drawn. This brief covers what is still missing: seven job scenes the new jobs need, eight story moments, five unlock pictures, three mode pictures and four system-kind pictures. 27 pictures in all.*

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


**For this brief in particular:** job and story scenes must sit with the tall scenes in `src/art/jobs/` (960×1440, the same yard-and-haze look, open `sc_toll.webp`, `sc_depot.webp` and `sc_yard.webp` first); the unlock, mode and system-kind pictures with the 16:9 banners in `src/art/baybanners/` and `src/art/regions/`.

## What to make
| Batch | What | Count | Size |
|---|---|---|---|
| A | Scenes for the seven new jobs | 7 | 960×1440 (2:3 portrait) |
| B | Scenes for eight story moments | 8 | 960×1440 (2:3 portrait) |
| C | Unlock pictures for the Archive | 5 | 1280×720 (16:9) |
| D | Pictures for the three modes of play | 3 | 1280×720 (16:9) |
| E | Pictures for the four kinds of system | 4 | 1280×720 (16:9) |

Do them in order A to E (A and B matter most). I add the game slots, the cutter and the screens when the pictures arrive. Ask for nothing from the repo beyond reading it.

## What to deliver
- Every picture a **separate PNG**, named exactly as its `Save as` line (folder name, two underscores, id). **One picture per image, never a contact sheet or grid.**
- One ZIP of everything. If you cannot make a ZIP, one PDF with one picture per page and the name in a caption outside the picture.
- No text, lettering, numbers, logos, frames or borders inside any picture. Sharp: 1920 px on the long side or more.
- Do not change anything else in the repository: no code, no docs.
- If you run out of room, stop after a picture and carry on when told "continue".

## The look
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty". Mostly dark, one warm yellow-orange anchor, teal only for screens and the damping-field ring, red only for danger, dull gold only for caution, no neon pink, and **no red skies, ever**. Soft haze, one key light with a rim light, restrained glow, never cartoonish. The full style text is inside each prompt: paste each one as it is.

## Batch A: seven job scenes (960×1440)
These show full height on the job offer card for the seven jobs the game gained in the latest job rework. Open `src/art/jobs/sc_toll.webp` and two others first: same format, same level of detail.

Save as: **`jobs__sc_lifeboat.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the job "The Lifeboat at Wake": a small Drift lifeboat with its lamps low and faces at the viewports, two raider ships circling it, the Wayward arriving between them. Forty-one aboard, a ransom they cannot pay.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_ransom.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the job "The Ransom Crew": a raider ship with a badly spoofed Guild transponder light, two escorts, the Wayward closing on its engines; a busy salvage exchange glittering behind.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_bend.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the job "Tarik's Bend": an old patched skiff leading the Wayward round a hidden bend in an asteroid lane, faint hand-drawn chart lines glowing teal on the cockpit glass.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_cradle.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the job "The Cradle Crew": a huge Custody ship cradle in a breaker yard, its frame closing, lit windows with workers sealed inside, the Wayward flying in to cut it open.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_recovery.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the job "Recovery Order": a heavy Kellern recovery tug with grapples out and amber hazard stripes, two escorts, closing on the Wayward in a foundry spoil field.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_sable.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the job "Sable's Crossing": a lone small scout leading the Wayward into a lane full of drifting Thren motes, foundry drones waiting at the edge of the swarm.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_ring.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the job "The Ring's Centre": a dead relay mast at the edge of a vast faint ring of other dead relays, the Wayward taking readings, a Continuance cutter watching from afar.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

## Batch B: eight story moments (960×1440)
These show beside the pop-up cards of eight story beats (the Narrows checkpoint, the Last Toll, the Voice, the Thren, the helm, the Long Walk, Kessel Hold, the damping field), the way the four place scenes `sc_depot`, `sc_audit`, `sc_market` and `sc_yard` already do. Open those four first.

Save as: **`jobs__sc_narrows.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the Narrows checkpoint: a Custody inspection station across a narrow gap between two rock walls, a gate arch with teal scanning beams, the black-and-white inspector's cutter with thin red piping parked beside it; the Wayward small at the arch.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_lasttoll.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the Last Toll: an archive station at the very end of the lanes, a vast quiet block of stacked record vaults with one row of warm amber windows lit and a dark toll arch; calm, melancholy, the Wayward small and slow before it.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_foundry.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the Voice's foundry: a huge dormant factory hull whose whole wall is terminals, every screen lit teal in unison, conveyor arms folded, one lit docking cradle waiting; the Wayward small before it.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_followers.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the Thren following: a slow loose formation of grey-violet Thren objects trailing the Wayward, every one turned to follow her; calm and uncanny, not a monster, violet only far in the background.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_helm.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the Wayward's own cockpit seen from behind the pilot seat: a dark cabin of old patched controls, a helm panel where a thin teal routine thread of light is paused mid-line, stars beyond the glass. No pilot visible; the Wayward herself is the subject (so no ship outside).
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_longwalk.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the Long Walk: a long column of old patched Drift ships crossing a dark lane at walking pace, lamps low, a single frail light in each viewport; the Wayward alongside at the tail of the column.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_kessel.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Kessel Hold under attack: a rig-ringed mining hold station, rigs burning in the dark, raider silhouettes closing, defenders' lamps still lit; red only as small fire glimpses; the Wayward small and arriving.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

Save as: **`jobs__sc_dampfield.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the damping field: a jump-gate ring with its teal damping ring lit and a heavy black-and-white Continuance cutter (the governor's ship, thin red piping) parked at it, waiting; the Wayward small and slowing before it.
Framing: tall portrait 2:3, shown full height beside the card text, no text over it. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is in the frame with room around it. One clear subject, read at a glance; keep it in the middle 60% of the width and the middle 80% of the height, because the card crops the sides a little on some screens. No people's faces, no text, no UI.
```

## Batch C: five unlock pictures (1280×720)
These show as small thumbnails beside the unlocks in the Archive once earned (about 150 px wide), so each needs one bold shape that reads tiny. Open `src/art/specs/mo_afterburner.webp` and `df_regenerative.webp` first.

Save as: **`unlocks__u_derelict.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the unlock "Derelict hulks": a dead hull drifting in the dark with a cutting-lamp rig fixed to it, sparks and amber work lights; salvage, not danger.
Framing: 16:9 landscape, one clear bold subject in the middle, readable as a small thumbnail (it shows about 150 px wide); calm dark edges. No people's faces, no text, no UI.
```

Save as: **`unlocks__u_anomaly.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the unlock "Spatial anomalies": a ring of bent starlight, stars and debris smeared round an invisible centre; eerie and quiet, restrained glow, no neon.
Framing: 16:9 landscape, one clear bold subject in the middle, readable as a small thumbnail (it shows about 150 px wide); calm dark edges. No people's faces, no text, no UI.
```

Save as: **`unlocks__u_ion.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the unlock "Drive-red engines": the Wayward's engine pods burning a deep ember red-orange exhaust, a cosmetic colour (not a threat), seen from behind and slightly below.
Framing: 16:9 landscape, one clear bold subject in the middle, readable as a small thumbnail (it shows about 150 px wide); calm dark edges. No people's faces, no text, no UI.
```

Save as: **`unlocks__u_gold.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the unlock "Krail-gold engines": the Wayward's engine pods burning a warm dull-gold exhaust, a cosmetic colour, seen from behind and slightly below.
Framing: 16:9 landscape, one clear bold subject in the middle, readable as a small thumbnail (it shows about 150 px wide); calm dark edges. No people's faces, no text, no UI.
```

Save as: **`unlocks__u_ramjet.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the unlock "Ramjet": the Wayward's bow scoop lit white-hot at the intake, long speed streaks and ion dust sweeping back, a hint of acceleration.
Framing: 16:9 landscape, one clear bold subject in the middle, readable as a small thumbnail (it shows about 150 px wide); calm dark edges. No people's faces, no text, no UI.
```

## Batch D: three mode pictures (1280×720)
These show on the three Survival choices of the start menu. Open `src/art/baybanners/` first.

Save as: **`survivals__drifter.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the Drifter mode, "Calmer skies": the Wayward drifting slowly through a quiet field of sparse rocks under a soft nebula, no enemies, long calm light.
Framing: 16:9 landscape, one clear bold subject in the middle, readable as a small thumbnail (it shows about 150 px wide); calm dark edges. No people's faces, no text, no UI.
```

Save as: **`survivals__prospector.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the Prospector mode, "The way the game was meant to be played": the Wayward mining a big cyrite-veined rock with a teal laser, one distant patrol, steady work.
Framing: 16:9 landscape, one clear bold subject in the middle, readable as a small thumbnail (it shows about 150 px wide); calm dark edges. No people's faces, no text, no UI.
```

Save as: **`survivals__raider.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the Raider mode, "Take it from the dead": the Wayward stripping a broken capital-ship wreck with a tractor beam while hostile ships close in; tense, scavenging, a little red from distant fire only.
Framing: 16:9 landscape, one clear bold subject in the middle, readable as a small thumbnail (it shows about 150 px wide); calm dark edges. No people's faces, no text, no UI.
```

## Batch E: four system-kind pictures (1280×720)
These show on the jump chart beside a system, so a player can tell a port from a mining system, a contested one and a quiet transit at a glance. Open `src/art/regions/` first.

Save as: **`kinds__port.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: a port system: a lane port station with a docking ring and fuel tanks, amber work lights, traffic arriving; safe and busy.
Framing: 16:9 landscape, one clear bold subject in the middle, readable as a small thumbnail (it shows about 150 px wide); calm dark edges. No people's faces, no text, no UI.
```

Save as: **`kinds__mining.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: a mining system: a dense rock field with ore glints and mining laser flashes, a small rig and tug at work; heavy, industrial.
Framing: 16:9 landscape, one clear bold subject in the middle, readable as a small thumbnail (it shows about 150 px wide); calm dark edges. No people's faces, no text, no UI.
```

Save as: **`kinds__contested.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: a contested system: a tense standoff, a Custody cutter and raider ships facing each other across a lane, the Wayward between them in the dark; red only as a hint on one hull.
Framing: 16:9 landscape, one clear bold subject in the middle, readable as a small thumbnail (it shows about 150 px wide); calm dark edges. No people's faces, no text, no UI.
```

Save as: **`kinds__transit.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: a transit system: an almost empty straight lane with a distant jump gate, long and quiet, a few drifting rocks, the Wayward alone.
Framing: 16:9 landscape, one clear bold subject in the middle, readable as a small thumbnail (it shows about 150 px wide); calm dark edges. No people's faces, no text, no UI.
```

## If it goes wrong
- **A sheet when a picture was asked:** reply "make this as one single full-frame picture, not a sheet".
- **Text or a border in a picture:** reply "remove all text, lines and borders".
- **Too small or soft:** reply "same picture, larger and much sharper".
- **The two fits still look alike:** reply "the guns picture needs visibly more hardware: launch rails, heavier prow mounts, extra plates; the stock picture has none".
- **Style drifts:** attach a finished neighbour from the same folder in `src/art/` and say "match this one".
