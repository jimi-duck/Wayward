# The environment

One world, two ways to fly it. This is the plan for making space itself
worth flying through: what is out there, how it behaves, how the two modes
share it, and the order it gets built in. The data is in
`src/content/features.ts`, the system in `src/sim/space.ts`.

Status: stages 1 to 4 done (the library, the system, how the first
features look, and what they do to the ship; all behind `?space` until the
balance pass). See [Stages](#stages).

## What the game does today

Read from the code, not guessed.

- **The sky is one picture per system.** `render/sky.ts` bakes a painted
  backdrop (band, nebulae, a planet, a star) once, from a seed. Story seeds
  it from the system; Arcade rolls one at the start of the run and keeps it
  for the whole run. Three palettes, one per region tier, so Story's eight
  regions reuse three looks.
- **Nothing is somewhere.** Rock tiles into a band around the ship and is
  topped up as it is cleared (`sim/field.ts`). The director changes the
  *mix* with the clock (`sim/director.ts`), never with the place. The field
  at minute nine is the field at minute one with more iron in it.
- **Weather is a switch.** The nebula, the ion storm and the anomaly are
  sector events (`sim/encounters.ts`): one at a time, on a timer, dropped a
  few hundred units ahead of the ship, gone after 26 to 75 seconds. The
  nebula is a global fog and a global "sensors down" flag; it has no edge
  you can see from afar, avoid, or fly into on purpose.
- **Depth is thin.** Parallax is a layer of wisps and dark debris far below
  the plane (`Parallax`). The far bodies (planet, star) ride with the
  camera, so they never get nearer. Nothing in the distance is ever a place.
- **Story already has the hook.** Chart places (`content/phenomena.ts`) pin
  an event to a system, and the sortie plays it once. That is the right seam
  for Story, but it plays the same timed event, so the place is a mini-game
  and not a location.
- **Two hooks already exist for effects.** `World.sensorsDown` (radar, lock)
  and `World.navNoise` (the lane mouth swims) are the same idea as a gas
  cloud and a static field, wired to one event and to the Thren.

## Why it feels repetitive

1. The background is the same for the whole run (Arcade) or the whole system
   (Story). It can change between sorties, never while flying.
2. Nothing is *there*. A thing that arrives on a timer cannot be seen from
   far off, so nobody ever thinks "what's that?" and turns toward it.
3. Nothing is permanent or avoidable, so the environment is never a choice.
4. Nothing stands against the dark. There is no silhouette, no scale
   reference and no light that is not the sun.
5. The pace has no place in it. Combat has a rhythm (`sim/pacing.ts`);
   looking and exploring have none.

## The identity

**A working sky, long abandoned.** The Wayward is a small stolen hauler in a
universe that was built, mined, fought over and left. Space is weather and
ruin: the weather is old, the ruin is human. Three rules follow.

1. **Light is the language.** Every place has one colour it throws on the
   hull and into the haze. Entering it should change the ship before it
   changes a number. Amber stays the player, teal stays what the ship tells
   you, red stays threat; environmental light lives between them (cold
   blue-grey, verdigris, violet, ochre-brown, bruised magenta) and stays dim.
   A test keeps every tint off amber and red.
2. **Scale by silhouette.** Big things are dark shapes against something
   bright: a slab against the band, a gantry against a cloud, a convoy
   against the star. Size comes from occlusion and parallax, not from
   particle counts.
3. **Evidence of use.** Almost nothing is pure nature. A seam has cut marks,
   a belt has a beacon someone left, a cloud has a wreck in it. The player
   reads history before anyone tells it.

## The shape of it

Two layers of data.

- A **feature** is one thing in space: a veil, a wreck field, a well. Radius
  of a few hundred units (a lane is about 2,400; the ship's top speed is
  about 39 units a second, so a feature is 10 to 25 seconds across).
- An **expanse** is a stretch of space with a character, 2,000 to 3,800
  units across: what the sky is for the next minute. It deals a few features
  from its roster and sets what the rock does there.

An expanse is a minute or so of flight. In ten minutes an Arcade run crosses
about ten of them, with open dark between.

### Expanses

| Expanse | Load | What it is for | Features it deals |
|---|---|---|---|
| **Open dark** | calm | long sightlines; the place to breathe | curtain, passage, lanterns, carrier, seam |
| **The Scrap** | busy | cover, mining, crowded fights | breakers, graveyard, seam, shroud |
| **The Veil** | calm | beauty, hiding, getting lost | veil, shroud, curtain, seam, graveyard |
| **The Front** | busy | instruments argue; the sky is lit | static, storm, curtain, lanterns |
| **The Shoals** | busy | risk and reward on a slope | well, breakers, static, relic |
| **The Yards** | busy | exploring ruins of a human place | slipway, lanterns, graveyard, breakers |
| **The Hush** | calm | mystery, near-silence, something watching | relic, carrier, lanterns, curtain |

### Features

Purposes: V visual, E exploration, R resource, T tactical, H hazard, M
mystery, N navigation, S story, · neutral. Most are not hazards; five do
nothing to the ship at all.

| Feature | Purpose | Scale | Rarity | What it does | What it does not | Looks like |
|---|---|---|---|---|---|---|
| **Dust veil** | V · | 420–900 | common | nothing; drifts; light on the hull goes cold blue | no damage, no jam | a bank of lit dust, seen from 3,600 off |
| **Shroud** | T M | 280–520 | uncommon | sensors 40%, lock 50%, hulls see you from 45% as far | no damage | dense violet murk, the sky dims behind it |
| **Curtain** | V · | 600–1,100 | uncommon | nothing; ribbons breathe over 38 s | no jam, no alert | verdigris aurora, tall, seen from 6,000 |
| **Static field** | N T | 380–760 | uncommon | lane mouth swims, lock 25%, radar 70%, pulses | no damage | faint blue haze with crawling fine lines |
| **Storm cell** | H R | 260–480 | rare | shields charge twice as fast; lightning on telegraphed circles | only strikes hurt | a cloud that flashes from inside |
| **Breaker field** | T R | 260–560 | common | rock ×2.6, torpedo lock 55%, Krail ×1.3 | no direct damage | rubble in a loose ring round a dead hull |
| **Graveyard** | E S R | 320–620 | uncommon | rock ×1.4, Krail ×1.6; wrecks to salvage | none | a battle's worth of hulks, drifting very slowly |
| **Gravity well** | T H M | 300–600 | rare | pulls everything toward it; heavy going | outer edge is a gentle lean, only the core hurts | a lens: stars bend round a dark centre |
| **Cyrite seam** | R E | 180–340 | uncommon | rock ×1.6, veined +40% | none | violet glints in dark rock |
| **Slipway** | E S V | 200–380 | rare | Krail ×1.5 (strip the yard) | none | gantry frame, an unfinished hull, lamps on a timer |
| **Lantern line** | N E | 140–260 | uncommon | none; the buoys lead to the next place | none | lit buoys in a line, teal |
| **Relic** | M S V | 160–300 | singular | radar 85% close in | none | a dark slab, facing you, larger than anything near |
| **Passage** | V · | 6–14° | uncommon | none; it is sky | cannot be reached | a mile of lit windows crossing the far dark |
| **Carrier** | M N S | 2–4° | rare | none; a bearing on the scope | cannot be reached until followed | a pulse on the nav strip toward a feature |

Each row has an audio hum and grit in the data (`voice`). Audio is stage 5;
the idea is one low bed per feature, blended by how far in the ship is, so
the player learns "that tone is a static field" without a word.

### Behaviour

Features are not set dressing. In the data:

- **Drift.** A veil moves 2 units a second, a storm 3, rubble 1, a hulk 0.5.
  Slowly enough that you never see it, quickly enough that the sky is
  different when you come back.
- **Pulse.** Strength breathes with a period: a static field comes and goes
  over 11 s (so you can wait it out or time a run), a curtain over 38 s.
- **Edges.** Effects fade in over the outer 45% of the radius, so every
  condition has a visible threshold and a gentle slope.
- **Later:** a storm cell travelling along a front, a seam that stays mined
  out, wrecks that arrive from fights the player did not see.

## How it plays

The loop the brief asks for is **see, wonder, react, use, keep flying**.

- **See.** Every feature has a far look (`look.far`): a glow or a silhouette
  from 2,200 to 9,000 units, so something is visible before it is relevant.
  The expanse is dealt about 2,100 units ahead of the ship, so there is
  always something in the distance in the direction you are flying.
- **React.** A mechanical effect gets a quiet report (see HUD). A visual one
  gets nothing.
- **Use.** The features that change combat are the ones the player chooses:
  a breaker field is cover and a trap (rock stops fire from both sides,
  torpedoes lose lock); a shroud hides you from a pursuer, and you from him;
  a static field breaks lock on both of you; a well pulls everything,
  hulls too, so a pursuit through the Shoals is a different fight.
- **Discover.** Lantern lines and carriers point; the player decides.

### Rhythm (Arcade)

The composer (`Space.step`) deals one expanse ahead whenever the last one's
rim is under 2,400 units away. It has a memory and two hard rules:

- never the same expanse twice running;
- never a third busy expanse in a row;
- the first 35 seconds are the ship's own, and the first expanse is calm;
- strange things are held back by clock (`from`): a storm cell not before
  3:30, a relic not before 3:20, a well not before 4:00;
- the survival mode's `hazard` multiplier scales the busy ones.

Tests fly the composer for ten minutes over many seeds and check it: at
least five kinds of expanse in ten minutes, no repeats, no three busy in a
row, four to ten expanses in ten minutes.

### The HUD

Principle: the world speaks, the ship reports only what it changes.

- A visual feature is **not reported at all**. No banner, no alert.
- A feature that changes how the ship works gets **one chip, two at most**,
  teal, under the navigation strip, in the ship's voice: *Sensors degraded*,
  *Torpedo lock unreliable*, *Navigation interference*, *Gravity pull*,
  *Heavy going*, *Hidden from hulls*. It appears when the hold passes 30%
  and goes when the effect does.
- **Alerts keep their meaning.** Yellow means observed, Red means targeted.
  An environmental condition never raises either. The one exception is a
  hazard that can actually hurt (a well's core, a lightning circle): it
  uses the existing red threat treatment, because then it is threat.
- Nothing new on the map. The chart and the strip already carry places;
  the feature shows on the strip only when it is a Story target.

## Story

Same rows, deliberate use. `NAMED` in `features.ts` gives a feature a name
and a place in the story: **The Veyr Belt** (breakers), **The Cerro Debris**
(graveyard), **The Sable Well** (well), **Halloran's line** (lanterns). The
id is what the story code keys off.

How each kind serves a story, so the same object can be scenery in Arcade
and a place in Story:

| Kind | Arcade | Story |
|---|---|---|
| Veil / shroud | beauty, hide from a pursuer | the known route nobody takes; where the Gutter keeps a camp; a wreck inside |
| Curtain | wow | a landmark people navigate by; "the lights over Cerro" |
| Static field | broken lock, a swimming lane | jams comms; hides a signal; a smuggler's lane |
| Breakers / graveyard | cover, salvage | a battlefield with a history; clues; a character's ship |
| Gravity well | risk and reward | a mystery; a route; the place something was lost |
| Seam | mining | what the Gutter fights over |
| Slipway / yard | exploration | a dead Kellern yard; where the Wayward was meant to be built |
| Lantern line | follow it | a courier route that leads to a person |
| Relic / carrier | wonder | the Voice, the Thren, the Threshold |

Rules:

- **Story does not own separate environments.** A sortie gets the same
  `Space`, built by hand: `compose: false`, then `addExpanse` and `place`.
- **Not everything is lore.** Procedural features in Story are unnamed and
  cost the story nothing. A named one is a deliberate beat.
- **Transmissions go through the comms manager.** A feature carries story
  tags (`place`, `route`, `cover`, `wreck`, `signal`, `site`, `history`);
  the story reads them. The environment never fires its own comms.
- **The chart's places become locations.** Ion storm, nebula and gravity well
  map to storm, shroud and well features: the system *has* one, you can see
  it on arrival, and the old timed event is its mini-game on top.
- **The familiar world.** The same kind seen twice should say so ("the same
  kind of well as Cerro"): the ship's catalogue line (`NAMED.note`) shows
  once, the first time you are in a named place.

## Performance

- The simulation is a few dozen circles. `sample(x, z)` loops them, once per
  step for the ship, and is allowed to be called for hulls and rock.
- At most 36 features are alive; expanses are dropped 6,500 units behind.
- Nothing is a particle system. Air is a few large additive billboards and
  one fog/tint blend; far features are sprites; matter is instanced meshes
  (the rubble reuses the rock instancing from `render/rocks.ts`).
- The baked sky is untouched. Mood is a tint and a fog blend, free per frame.

## Architecture

```
content/features.ts   FEATURES, EXPANSES, NAMED: the rows
sim/space.ts          Space: place, addExpanse, step (drift, pulse, deal), sample, reports
render/space.ts       (stage 2) builds a look per feature shape; reads Space only
```

- **`Space` is plain data and the seeded Rng.** No Three.js. Pilots and
  tests fly it headless.
- **`sample(x, z)` is the one question.** It returns plain numbers
  (`sight`, `lock`, `jam`, `drag`, `ax`/`az`, `conceal`, `rock`, `rich`,
  `krail`, `shield`, `fog`, `dim`, `tint`). The world applies the ones it
  cares about; the renderer reads `fog`, `dim` and `tint`.
- **Adding a feature** is one row, a `FeatureId`, a place in an expanse's
  roster, a look in the renderer's shape table and a German line. Adding a
  *kind* of effect is one optional number in `Effects`.
- **Story and Arcade differ in who calls it**, not in what it is.
- **Existing hooks map straight on.** `sensorsDown` becomes
  `sample().sight < 0.7`; `navNoise` takes `max(existing, sample().jam)`;
  torpedo seek multiplies by `lock`; the field's density multiplies by `rock`.

## Stages

Small PRs off `main`, one stage at a time, each shippable.

1. **Foundation** (done in this PR). This document, the library, `Space`,
   tests. Nothing visible, nothing wired, nothing changes in play.
2. **Look** (done). `render/space.ts`: the far look and the mood tint
   (`Environment.weather`). The dust veil, curtain and passage have their
   own look; every other feature shows as a faint glint until stage 4. The
   breaker field's rubble waits for stage 3, when rock density follows it.
   Behind `?space` (Arcade only); the world owns the `Space`, and nothing in
   play reads it yet. Screenshots in the project's `environment/` folder.
3. **Play** (done, behind `?space`). `World.stepSpace` samples the place at
   the ship each step and applies sensors, torpedo lock, navigation noise,
   rock density (`Field.zone`), drag and pull (the ship and every hull);
   the HUD shows `World.conditions` as up to two teal lines under the
   alerts. Not applied yet: `conceal` (hulls losing you), `krail`, `shield`
   and the storm's lightning, which come with their features in stage 4.
   A pilot report with the flag on, and the switch to default, wait for
   stage 6.
4. **The rest of the library** (done, behind `?space`). Every feature has a
   look now: shroud, static and storm are cloud and haze sprites; breakers,
   graveyard, slipway, relic and well are also real dark meshes, raised when
   the ship is within 700 units of the rim and put away after; lantern line,
   seam and carrier are blinking lights. Krail from a graveyard or slipway
   pays more. Still not applied: `conceal` (hulls losing you), `shield`, and
   the storm's lightning and the well's crushing core, which want the
   telegraph and alert work in stage 6.
5. **Story.** Chart systems carry a site; places map to features; the four
   named places; comms tags through the central manager; palettes by region.
6. **Pace and polish.** Rarity and rhythm from pilot reports, per-feature
   audio, transitions, the ship lit by the place it is in.

Real-device checks (frame rate, glow, how it reads on a phone) are the
owner's, as ever.

## Deliberately later

- Weather that moves and changes (a front that crosses a region).
- Features the player permanently changes.
- Faction territory over expanses.
- Showing expanses on the chart as a layer.
- A repaint of the sky when crossing into a new expanse; today the baked sky
  stays and the mood tint does the work.
- True volumetrics. The first version fakes depth with layered billboards.
