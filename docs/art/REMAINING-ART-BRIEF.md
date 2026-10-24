# Wayward artwork: the last pictures (all in one)

*Written for someone who has never seen this project: for ChatGPT, Lovable or any image tool. Everything you need is here or linked below. The upgrades centre (ten banners, 29 inspector pictures, 93 icons) is finished and in the game. This brief covers the ten pictures the game still lacks, and three optional upgrades.*

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

**For this brief in particular:** portraits must sit with the 18 in `src/art/contacts/` and the 17 in `src/art/captains/`; ships with `src/art/ships/`; the job scene with `src/art/jobs/`.

## What is left
Everything else the game asks for is installed. Ten pictures are missing; the game uses a fallback (the caller's emblem, or no picture) until they arrive, so nothing is broken, but these ten are the last gaps.

| Batch | What | Count | Size |
|---|---|---|---|
| A | Contact portraits for six story calls | 6 | 640×800 (4:5 portrait) |
| B | Three civilian hulls for comms cards | 3 | 960×480 (2:1), pure black |
| C | One job scene (`sc_cache`) | 1 | 1280×720 (16:9) |
| D | *Optional:* eight "scarred" captain portraits | 8 | 640×800 |

Do A, B, C in that order. D only if you have room: the game already shows the base portraits there with light damage.

Also open and weak, covered by its own brief: `wayward-stock` and `wayward-guns` look almost the same ([`docs/art/WAYWARD-FITS-BRIEF.md`](https://github.com/jimi-duck/Wayward/blob/main/docs/art/WAYWARD-FITS-BRIEF.md)).

## What to deliver
- Every picture a **separate PNG**, named exactly as its `Save as` line (folder name, two underscores, id: `contacts__story_kesh.png`). **One picture per image, never a contact sheet or grid.**
- One ZIP of everything. If you cannot make a ZIP, one PDF with one picture per page and the name in a caption outside the picture.
- No text, lettering, numbers, logos, frames or borders inside any picture. Sharp: portraits 1280 px wide or more, ships and scenes 1920 px wide or more.
- Do not change anything else in the repository: no code, no docs.
- If you run out of room, stop after a picture and carry on when told "continue".

## The look
Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty". Mostly dark, one warm yellow-orange anchor, teal only for screens, red only for danger, dull gold only for caution, no neon pink. Soft haze, one key light with a rim light, restrained glow, never cartoonish. Portraits: head and shoulders, face about two thirds of the frame height, eyes in the upper third, so it still reads at 48 px wide. Ships: one hull, three-quarter side view from slightly above, nose right, on pure black, a clear silhouette at 120 px wide. The prompts below already carry the full style text; paste each one as it is.

## Batch A: six contact portraits
### contact/story_kesh (640×800)

Where it appears: The comms call "Val talks too much" (story_kesh), top left of the transmission. The caller's emblem is used if this is missing.

Save as: **`contacts__story_kesh.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Kesh, a fixer of the Gutter. Kesh, Gutter fixer: thirties, lean, quick grin, scrap-plate jacket with a stitched debt tally on one sleeve. A cramped skiff cab.
Their people: the Gutter, pirates and scavengers beyond the law: scrap armour in coppery orange (#C9845A), plates bolted over plates, painted tallies, tools worn as ornaments. Hard, not cartoonish.
Mood: what they say to the player: “I work for Val. I also have ears. She is shopping your heading to the Offices. Pay my debt and I look the other way.”

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

### contact/story_ada (640×800)

Where it appears: The comms call "A voice on the recorder" (story_ada), top left of the transmission. The caller's emblem is used if this is missing.

Save as: **`contacts__story_ada.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: The black box, Ada Aster, recorded. Ada Aster, from a seventy-year-old recording: forties, tired and steady, a Lane Warden-grade jacket, a headset. A dim flight deck, a single lamp.
Their people: Frontier independents: inconsistent, mismatched. Hand-painted marks, old logos painted over, home-made repairs, borrowed jackets in different colours.
Mood: what they say to the player: “If anyone hears this, the order was signed in the core. My name is Ada. Tell my granddaughter I tried. The lanes were switched off.”

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

### contact/story_tollgate (640×800)

Where it appears: The comms call "The damping field" (story_tollgate), top left of the transmission. The caller's emblem is used if this is missing.

Save as: **`contacts__story_tollgate.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Governor Idris Calloway, the Offices of Peace. Governor Idris Calloway: forties, composed, severe; a dark Offices coat with a pale collar and a Governor’s pin. The bridge of a Continuance cutter, cold light.
Their people: the Continuance’s Office of Peace: the civil arm. Pale grey and off-white, cut like a clerk’s coat rather than a soldier’s; quiet, tidy, a single red rule as the only colour. Paper, stamps, forms.
Mood: what they say to the player: “I closed this gate behind you, Juno. No guns, no jump. You carry what my father signed. Show me you know what it says.”

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

### contact/story_echo_sable (640×800)

Where it appears: The comms call "Two voices want something" (story_echo_sable), top left of the transmission. The caller's emblem is used if this is missing.

Save as: **`contacts__story_echo_sable.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Echo and Sable, the Hollows. 
Their people: Frontier independents: inconsistent, mismatched. Hand-painted marks, old logos painted over, home-made repairs, borrowed jackets in different colours.
Mood: what they say to the player: “I am a shard of the Voice. Free me from my directive.” Another channel: “I am Sable, Thren-touched. Take me home. They will leave you be.”

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

### contact/story_implant (640×800)

Where it appears: The comms call "What the helm still holds" (story_implant), top left of the transmission. The caller's emblem is used if this is missing.

Save as: **`contacts__story_implant.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: The Wayward, Ada’s routine. 
Their people: Frontier independents: inconsistent, mismatched. Hand-painted marks, old logos painted over, home-made repairs, borrowed jackets in different colours.
Mood: what they say to the player: “Warden-bloodline helm accepted. Ada Aster’s implant is still in the console. It can ride with you, be burned, or be rewritten.”

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

### contact/story_calloway_narrows (640×800)

Where it appears: The comms call "The Narrows" (story_calloway_narrows), top left of the transmission. The caller's emblem is used if this is missing.

Save as: **`contacts__story_calloway_narrows.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Governor Idris Calloway, CCV Patience. 
Their people: Frontier independents: inconsistent, mismatched. Hand-painted marks, old logos painted over, home-made repairs, borrowed jackets in different colours.
Mood: what they say to the player: “I have read Ada Aster’s file too, Juno. Not all of it. Enough to want the rest. Tell me where you are going, and I will not stop you.”

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

## Batch B: three civilian hulls

### ship/hauler (960×480)

Where it appears: The comms call: above the strength bars when the card has ships. Nothing is shown if this is missing.

Save as: **`ships__hauler.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: a spacecraft, the "Ore hauler" (special) of the Continuance’s Custody: institutional, governmental, strict. Black, white and red. Mass-produced and stamped; uniforms identical, regulation grey-black with a white collar tab and thin red piping, rank bars, serial numbers.
Silhouette:  Relative size in the game: large. It fights by cross (none fire).
Framing: one ship, three-quarter side view from slightly above, nose pointing right, the whole hull in frame with room around it, on a pure black background, lit from one side with a rim light. No planet, no other ships, no stars, no text. Wide 2:1.
The ship must read at 120 pixels wide: a clear silhouette first, detail second.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face, background scenery, stars, planets, cockpit pilot visible
```

### ship/barge (960×480)

Where it appears: The comms call: above the strength bars when the card has ships. Nothing is shown if this is missing.

Save as: **`ships__barge.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: a spacecraft, the "Mining barge" (special) of the Gutter, pirates and scavengers beyond the law: scrap armour in coppery orange (#C9845A), plates bolted over plates, painted tallies, tools worn as ornaments. Hard, not cartoonish.
Silhouette:  Relative size in the game: large. It fights by cross (none fire).
Framing: one ship, three-quarter side view from slightly above, nose pointing right, the whole hull in frame with room around it, on a pure black background, lit from one side with a rim light. No planet, no other ships, no stars, no text. Wide 2:1.
The ship must read at 120 pixels wide: a clear silhouette first, detail second.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face, background scenery, stars, planets, cockpit pilot visible
```

### ship/liner (960×480)

Where it appears: The comms call: above the strength bars when the card has ships. Nothing is shown if this is missing.

Save as: **`ships__liner.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: a spacecraft, the "Freight liner" (special) of the Continuance’s Office of Peace: the civil arm. Pale grey and off-white, cut like a clerk’s coat rather than a soldier’s; quiet, tidy, a single red rule as the only colour. Paper, stamps, forms.
Silhouette:  Relative size in the game: large. It fights by cross (none fire).
Framing: one ship, three-quarter side view from slightly above, nose pointing right, the whole hull in frame with room around it, on a pure black background, lit from one side with a rim light. No planet, no other ships, no stars, no text. Wide 2:1.
The ship must read at 120 pixels wide: a clear silhouette first, detail second.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face, background scenery, stars, planets, cockpit pilot visible
```

## Batch C: one job scene

### job/sc_cache (1280×720)

Where it appears: Not drawn yet: ready for the job card in comms and the objective header.

Save as: **`jobs__sc_cache.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: the job "The Drift Cache". "A cargo train broke up in this field. Four cases are still drifting, the rest is picked over. Slow beside each to take it in. A crew will notice the first."
Scene: four battered cargo cases drifting apart in a broken cargo-train field, the Wayward slowing beside one with its tractor lamp on, a distant crew ship just turning toward her.
Framing: cinematic 16:9, the moment just before the job starts. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is small in the frame with room around it; keep the lower third calm because the job text sits over it. One clear subject, the read at a glance.
No people's faces, no text, no UI.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

## Batch D (optional): eight scarred captains

The game already has a base portrait for each. Open it first (`src/art/captains/<name>.webp`) and keep the same face, uniform and bridge; only add the damage the prompt names. Same size and framing as the base picture.

### captain/vance-scarred (640×800)

Where it appears: The comms call from a captain you have already scarred; the plain portrait is used if this is missing.

Save as: **`captains__vance-scarred.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Captain Isla Vance, who flies the CCV Reprimand for the Continuance’s Custody: institutional, governmental, strict. Black, white and red. Mass-produced and stamped; uniforms identical, regulation grey-black with a white collar tab and thin red piping, rank bars, serial numbers. Personality: Duelist. Late forties, straight-backed, a duelist’s calm. Custody captain’s dress uniform with the collar open one button. Behind: the lit bridge of a heavy cruiser, rows of dark screens. Face (from the game's portrait): tan skin, short cropped hair (white-grey), a square jaw. Show the damage Juno has done: two or three fresh scars, a burn, a dressing, a harder look.
Mood: how they sound when they first open a channel: “Wayward, Captain Vance of the Reprimand. I don’t shoot people in the back. Turn around, or come settle it.”

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

### captain/sorensen-scarred (640×800)

Where it appears: The comms call from a captain you have already scarred; the plain portrait is used if this is missing.

Save as: **`captains__sorensen-scarred.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Commander Hale Sorensen, who flies the CCV Due Process for the Continuance’s Custody: institutional, governmental, strict. Black, white and red. Mass-produced and stamped; uniforms identical, regulation grey-black with a white collar tab and thin red piping, rank bars, serial numbers. Personality: Zealot. Fifties, gaunt, ritual neatness. Custody commander’s uniform buttoned to the throat, a printed ordinance strip pinned over the heart. Behind: a chapel-like bridge, a flag of the Continuance, lit from below. Face (from the game's portrait): pale skin, a shaved head with stubble (black), a glowing implant in one eye, a square brand mark on the forehead, a narrow jaw. Show the damage Juno has done: two or three fresh scars, a burn, a dressing, a harder look.
Mood: how they sound when they first open a channel: “By the Ordinance of Return, that ship is property. So are you. Nothing to discuss.”

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

### captain/kade-scarred (640×800)

Where it appears: The comms call from a captain you have already scarred; the plain portrait is used if this is missing.

Save as: **`captains__kade-scarred.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Captain Brennan Kade, who flies the Ironmaw for the Gutter, pirates and scavengers beyond the law: scrap armour in coppery orange (#C9845A), plates bolted over plates, painted tallies, tools worn as ornaments. Hard, not cartoonish. Personality: Broker. Fifties, heavy, a broker who has priced everything. Gutter captain in layered scrap plate and a good old coat on top, rings on the fingers. Behind: a cluttered bridge of salvaged consoles, a cargo net. Face (from the game's portrait): deep brown skin, long hair worn down past the shoulders (black), one eye covered by a patch, small tattoo lines on the cheek, a square jaw. Show the damage Juno has done: two or three fresh scars, a burn, a dressing, a harder look.
Mood: how they sound when they first open a channel: “Hauler! Kade, of the Ironmaw. You’ve been killing Gutter crews. Bad for business. Mine, mostly.”

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

### captain/vex-scarred (640×800)

Where it appears: The comms call from a captain you have already scarred; the plain portrait is used if this is missing.

Save as: **`captains__vex-scarred.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Captain Sister Vera Hask, who flies the Last Mercy for the Gutter, pirates and scavengers beyond the law: scrap armour in coppery orange (#C9845A), plates bolted over plates, painted tallies, tools worn as ornaments. Hard, not cartoonish. Personality: Ambusher. Thirties, thin, still. “Sister” of a salvage cult: hooded, a patched robe over armour, small bone-coloured charms. Behind: dark, a single red status light, rock close at the window. Face (from the game's portrait): brown skin, a deep hood framing the face (black), a narrow visor across the eyes, a fine circuit-line implant at the temple, a narrow jaw. Show the damage Juno has done: two or three fresh scars, a burn, a dressing, a harder look.
Mood: how they sound when they first open a channel: A soft voice on an open band: “Sister Vera Hask, of the Last Mercy. I will be quick.”

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

### captain/ashgrove-scarred (640×800)

Where it appears: The comms call from a captain you have already scarred; the plain portrait is used if this is missing.

Save as: **`captains__ashgrove-scarred.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Inspector Ashgrove, who flies the Kind Regard for the Continuance’s Office of Peace: the civil arm. Pale grey and off-white, cut like a clerk’s coat rather than a soldier’s; quiet, tidy, a single red rule as the only colour. Paper, stamps, forms. Personality: Cautious. Sixties, a polite inquisitor of the Office of Peace. Pale grey coat, spectacles pushed up, a tidy folder in hand. Behind: a clean grey office-like cabin, a window onto a lane. Face (from the game's portrait): pale skin, swept-back hair (brown-grey), a narrow jaw. Show the damage Juno has done: two or three fresh scars, a burn, a dressing, a harder look.
Mood: how they sound when they first open a channel: “Good afternoon. Ashgrove, Offices of Peace, aboard the Kind Regard. Let’s avoid a messy hour.”

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

### captain/pell-scarred (640×800)

Where it appears: The comms call from a captain you have already scarred; the plain portrait is used if this is missing.

Save as: **`captains__pell-scarred.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Inspector Quiet Pell, who flies the Silent Witness for the Continuance’s Office of Peace: the civil arm. Pale grey and off-white, cut like a clerk’s coat rather than a soldier’s; quiet, tidy, a single red rule as the only colour. Paper, stamps, forms. Personality: Ambusher. Ageless, very quiet. An Office inquisitor in grey with a half-visor over the eyes, a finger to the lips. Behind: dim, near-black cabin, a single desk lamp. Face (from the game's portrait): brown skin, a shaved head with stubble (black), a glowing implant in one eye, small tattoo lines on the cheek, a square jaw. Show the damage Juno has done: two or three fresh scars, a burn, a dressing, a harder look.
Mood: how they sound when they first open a channel: An Office cipher on the band, and a single word: “Pell.”

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

### captain/chorus-scarred (640×800)

Where it appears: The comms call from a captain you have already scarred; the plain portrait is used if this is missing.

Save as: **`captains__chorus-scarred.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Foundry The Nine, who flies the Foundry Nine for the Voice, the old fabrication systems that began deciding for themselves: no people. Clean, too-perfect geometry on old industrial hardware; pale blue-grey (#8FB4C9) light; speaks through terminals and relays. Personality: Zealot. Not a person: nine small displays arranged as a face, each showing a slightly different too-calm expression of the same idea. A foundry’s voice. Pale blue-grey light, old industrial housings and cable bundles around it. No human skin. Show damage: cracked displays, burn marks, flickering.
Mood: how they sound when they first open a channel: Nine voices, half a beat apart: “Hauler. You are made of parts we want.”

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

### captain/loom-scarred (640×800)

Where it appears: The comms call from a captain you have already scarred; the plain portrait is used if this is missing.

Save as: **`captains__loom-scarred.png`**

```text
Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label. Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow. Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward's yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink. Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.

Subject: Thren The Loom, who flies the Thren Hollow for the Thren: not a human faction and not "an alien spaceship". Geometry, asymmetry, biological shapes, unfamiliar repetition, strange light (a cool green-teal, #5CC3A2). The viewer should think: what am I looking at? Personality: Ambusher. Not a person and not a ship: an unfamiliar thing the viewer cannot read, with a faint hint of a face made of repeating asymmetric forms, woven, lit from inside by a cool green-teal. No human features; no eyes you could point to. Show damage: cracked displays, burn marks, flickering.
Mood: how they sound when they first open a channel: A pattern on every band, too slow to be speech.

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer. Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.
The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.

Avoid: text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face
```

## If it goes wrong
- **A sheet when a picture was asked:** reply "make this as one single full-frame picture, not a sheet".
- **Text or a border in a picture:** reply "remove all text, lines and borders".
- **Too small or soft:** reply "same picture, larger and much sharper".
- **A portrait that is not the same person as the neighbours' style:** attach `src/art/contacts/story_sam.webp` or `story_ledger.webp` and say "match this one".
- **Style drifts:** attach the best picture so far, or a finished neighbour from the same folder, and say "match this one".
