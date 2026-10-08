# Visual overhaul

One pass over how the whole game looks, so ships, rock, structures, shots and
space read as one place (2026-10-08). The quality bar is the visual reference
pack (three boards); the specification is `SHIPS.md`, `SPACE.md` and
`PLACES.md` (copies in the project's shared folder). The pack's names, stats and
invented details are not used: only its silhouettes, material richness,
faction separation, depth and restraint.

Colour stays as it is: **amber** is the player and their hand, **teal** is
information, **red** is threat and nothing else. Loot is never red. Glow is
purposeful. "Used, not dirty."

Baseline screenshots (1280x720, the review world `?dev`): the project's
`visual-overhaul/before/` folder.

## Audit

### Working well, leave alone

- **The Wayward.** The bar for the rest: a painted coat chipped to dark metal
  at the edges, panel seams, stencilled marks, hot engines. Its materials come
  from the shared kit (`render/kit.ts`, `render/wear.ts`).
- **Krail.** The white, blue, purple ramp is clear and never a number. Cyrite
  is its own deeper violet.
- **Rock.** Dark basalt with lava in the cracks reads at once and the five
  kinds are told apart by glow and tint (the glow is dimmer in a software
  renderer than on a device).
- **Engine light.** Drives, running lights and shots go through one streak
  renderer, so a hull is found by its engines at 500 units.
- **Space features.** Soft light sprites at real depth, the well's black core,
  the aurora. Calm and sparse in the right places.
- **Colour language.** The HUD's tints and the world's glow rarely clash.

### Weakest

1. **Enemy hulls are unpainted bare metal.** The Wayward uses the kit's
   painted coat (`painted: true`); every enemy uses the bare plating with a
   dark tint and metalness 0.55 to 0.7 under a very dark reflection
   environment. At gameplay distance a hull is a dark sliver and only the
   engine flare says who it is. The faction metals (rust, ochre, verdigris,
   charcoal, amber) are in the code but not in the picture. This is the
   largest single gap to the reference.
2. **Silhouettes are built from few primitives.** A scout, a raptor and a
   stalker share a wedge fuselage and a pair of boxes for wings; the Custody
   cruiser is a stack of slabs. Faction language (Gutter asymmetry and
   patches, Custody orderly rows, Office crescents, Voice machine crust,
   Thren facets and blades) is in the spec but barely in the shapes.
3. **The lane gate and the port look like props.** The gate is twelve dark
   boxes round a flat amber disc, with glowing bars standing in for lights;
   the port is a few grey boxes. Neither has scale cues (walkways, tankage,
   service lights, mooring) beside the Wayward.
4. **Loose cargo and cells are plain.** Ore and parts are bare coloured
   specks, cells are a ring round a core. They read, but are not physical.
5. **Warning marks and shots** work but are three different languages: lines,
   rings and filled circles differ in weight and glow between factions, and
   the faction shot styles are close to one another at range.
6. **Space has little near depth.** The sky is a good far layer and the
   features are mid layers, but the foreground is empty: no drifting dust or
   grit, so speed and scale are weak, and a region's identity is only the sky
   palette. The Story regions past the third reuse the three old palettes.
7. **Materials drift by file.** Hull, rock, gate and pickups each pick their
   own roughness, emissive strength and wear, so one frame mixes glossy and
   matt, bright and dim.

### Needs redesign

- Enemy hull materials and, per archetype, the models (scout, raptor, stalker,
  lancer, warbird, drone, weaver, freighter), and capital scaling.
- The lane gate and the port.

### Only needs polish

- Rock tint and glow balance; bulwark scale and silhouette.
- Krail and Cyrite trail and size; cells and loose cargo shapes.
- Shots, charge lines, nova rings and the three circle kinds: one weight, one
  fade, one glow ceiling.
- Space depth: foreground grit, region palettes, feature scale.

### Cheap, large effect

1. Paint the enemy hulls (the Wayward's own method, one coat per faction).
2. One material table and one emissive scale for the whole game.
3. Foreground grit and a gentle depth tint (one instanced points layer).
4. Faction trim lines and lit panels (emissive, no new geometry).

### Leave untouched

Gameplay numbers and rules; the HUD and the title (the Start screen thread
owns it); the player's ship model; the camera; saves; the review world itself.

## Plan

Each phase is one PR off `main`, with before and after screenshots, and
changes no gameplay.

1. **Material system.** One table (`render/look.ts`): faction paint, metal,
   trim, emissive ceilings. Enemy hulls get the painted coat and edge wear;
   rock, structures and pickups read from the same ceilings. Largest gain for
   the least geometry.
2. **Ships.** Silhouette per archetype and faction (built on the existing kit,
   merged to few draws), engine placement as in `SHIPS.md`, capitals built as
   the faction's hull stretched into extra sections, not a scaled copy.
3. **Rock, resources and pickups.** Balance rock tint and glow; physical
   cargo (ore sacks, parts cases) and cells with a housing; Krail kept.
4. **Structures.** The lane gate and the port rebuilt at scale with the kit:
   gantry arms, mooring, service lamps, the Wayward small beside them.
5. **Combat marks.** One language for shots, charge lines, rings and circles.
6. **Space depth.** Foreground grit, the regions' skies, feature polish.
7. **Consistency pass.** Every faction, every environment type, every rock,
   resource, pickup, the gate, the port, fire and telegraphs side by side;
   fix what does not belong.

Browser cost is kept down by merged geometry (one draw per material), the
existing instancing of hulls (`MAX_BATCH`), shared textures, emissive instead of
lights, and sprites for distance. The check for each phase is the frame time of
a crowded review stop; real frame rate is for a device.

## Status

- Phase 1 done: `render/look.ts` holds each faction's coat, undercoat, trim and wear and the emissive ceilings; enemy hulls use the painted, worn plate (`enemies.ts`). The faction reads from the coat at range, not just the engines.
- Phase 2 done: `dress()` in `enemies.ts` adds each faction's outline language to the six archetypes (scout, stalker, raptor, lancer, warbird, freighter) from one small extent table; drone and weaver keep their own shape. Capitals are the same builds at scale, so they carry it too. Cost: a few dozen more boxes per hull, merged into the same draws.
- Phase 3 done: Cyrite, ore and parts are lit instanced shapes (a violet prism, a rock lump, a salvage case) instead of glowing specks; Krail stays the one bright shard. Power-ups sit in a small dark cradle. Rock was left alone (it already reads). Cost: three more instanced draws and ten small cradles.
- Phase 4 done: the lane gate has footed, tapering pylons with collars, emitter coils, ladders and service platforms, girder spans with braces and lamps (some torn), and a control gantry with a mast and hazard-yellow tanks; the port has a habitat ring of cabins round the hub, two docking arms with mooring clamps, a five-drum tank farm with piping and a taller beacon mast. Same kit, same draws; the amber throat and cyan berth rings are unchanged.
- Phase 5 done: the capital ships' rings and the shell, lightning and web circles now share one beat (`HazardView.pulse`: slow and shallow, quicker as the moment comes, no 24 to 30 Hz strobe) and a bright edge ring that marks how far the fill has grown. Colours are unchanged (faction for capital tells, amber, blue-white, violet). Shots already share one streak renderer, so they were left. Cost: one thin ring per mark (48 meshes, shared geometry).
- Phase 6 done: five new sky palettes for the long journey's Salvage Belt, Drift Deep, Breaker Yards, Free Ports and Last Lanes (amber dust, cold indigo with few stars, rust haze, lamplit smoke, near-black violet), chosen by a new `sky` on the region row and carried on the sortie; the Reach, Marches and Hollows keep theirs, and the arcade still draws from the original five. Correction to the audit: foreground grit already exists (the speed-streak dust in `environment.ts`), so no new layer was added. Zero per-frame cost.
- Phase 7 done (consistency pass, review world, `visual-overhaul/phase7/`): hulls of all five factions, capitals, rock, bulwarks, loose finds, power-ups, the gate, the port and the three warning circles were looked at side by side. They share one warm key light, painted worn plate or dark rock with lava, lit lamps only where something is a light, and amber, cyan and red kept to their meanings. No change was needed beyond the earlier phases.

## Left for a device, or later

- **Frame rate.** The software renderer here cannot measure it. The added cost is small (a few dozen merged boxes per hull model, three instanced pickup draws, ten cradles, 48 thin rings) but a phone should be checked on a crowded Raider fight.
- **Hull silhouettes from far away.** The faction outlines are modest additions to the archetype shapes. A real redesign per archetype (SHIPS.md's full roster, with the Office's crescent hulls and the Thren's blades built as whole bodies) is the next large step, and wants the art director's input.
- **Bulwark and large rock close up.** The plating texture magnifies visibly when a bulwark fills the screen. A finer detail layer or a second texture scale would fix it.
- **Thren trim** reads a little flat violet on big blades; a faint gradient would help.
- **Story look.** The new region skies, the gate and the port could only be seen in the review world, not in a flown Story run.
