# The look

How Wayward should look, and what to avoid. Brand v1.1 (`branding/`) is the
source; this is the working guide. The tokens are at the top of
`src/styles/main.css`, the same values for canvas and SVG are in
`src/ui/palette.ts`. A UI pass comes with screenshots at desktop and phone
sizes.

The aim is an ore hauler that has been repaired, modified and stolen: *used*,
not *dirty*. History in small doses on top of a clean console.

## Colour

| Colour | Means | Never |
|---|---|---|
| Muted steel blue (`--blue`, the token is still called `amber`) | The player and their hand: the HUD, their ship, the picked row | Enemies |
| Teal (`--cy`) | Information: labels, gains, lights that report | Threats |
| Dull gold (`--caution`) | Caution only: costs, warnings short of danger | Decoration |
| Red (`--alert`, `--threat`) | Threat and nothing else: alerts, enemy marks, a budget past its rating | Loot, buttons |
| Cyrite violet | Cyrite, the find and the money | Anything else |

Two choices to know about. The player's lances burn red with a white-hot core
(`render/weapons.ts`), so enemy fire never uses that red; no faction fires
red. Torpedoes stay amber. Loose finds are never red.

## Type

Three layers, no more: Barlow Condensed for names, Barlow Semi Condensed for
sentences, Share Tech Mono for data. The stencil look is only on the wordmark
and the designation, as a mask on the existing face (`.lk-w`). The
Continuance layer (`Continuance signal`, `Registry`) is mono caps with wide
tracking; the ship's own lines stay Barlow.

## History on the console

Each of these is data or CSS, none is a rule the sim reads.

- **Stamps** on about a quarter of the modules (`content/papers.ts`
  `ORIGIN`): Salvaged, Field mod, Non-OEM and so on. Small mono, in the
  inspector and on the suggestion, never on the web.
- **Tab marks** as ship state (`sim/papers.ts` `tabMark`): stable, upgrade
  ready, damaged, overloaded, offline.
- **Before and after**: a fit ticks each changed rating from its old figure
  (`ui/tick.ts`), 600 ms, off under reduced motion.
- **Ship's papers**: registry, operator and factory profile as half-strength
  mono along the bay and on the pause card; hidden on phones.
- **Voice line**: after a fit the ship answers (`Module compatibility:
  accepted`, `Component: not factory spec`).
- **Pop-up kickers** speak as systems: `Ship system`, `Warning`,
  `Continuance signal`.
- **Wear** (`.wear` in `main.css`): two or three marks per panel, 6 to 14%
  ink, where hands go. CSS only; no new full-screen pass.
- **Wordmark**: a stencil seam, one repainted half, `OB-7731-A` under it.
- **The pause card is a readout**: id line and state word, a large left
  aligned title, the ship's line at a `>` prompt, ruled sections, numbered
  orders. The state word speaks only for yellow and red alert.

## The title

A left-aligned list on the art (`styles/title.css`): mark and wordmark, a
line for a saved journey, then Continue, New journey, Arcade mode and
Settings as bare rows with a hairline at the left. The picked row takes the
shared `--gl-blue-*` tokens. Text sits on dark scrims and holds AA at
1440x900 and 667x375, in English and German. Phones get 40px rows and no
difficulty preview.

## The world

- **One table.** Faction paint, trim, wear and emissive ceilings are in
  `render/look.ts` (`HULL_LOOK`). Hull, rock, gate and pickup materials read
  from it, so one frame never mixes glossy and matt at random.
- **The Wayward is the bar**: painted coat chipped to dark metal, panel seams,
  stencils, hot engines. Enemy hulls (`render/hulls.ts`) follow it, with the
  faction told by the coat, the trim and the engines: Gutter lopsided and
  patched, Custody ordered rows, the Office swept crescents, the Voice foundry
  crust, the Thren dark crystal lit from inside.
- **Lights are real.** A lamp is lit only where something is a light. Glow is
  purposeful and stays under the ceilings.
- **Warnings share one beat** (`HazardView.pulse`): slow and shallow, quicker
  as the moment comes, never a 24 to 30 Hz strobe.
- **Depth.** Far works (`render/farworks.ts`) use the real hull designs washed
  toward the haze, so distance takes contrast first. Each region has its own
  sky.
- **Trails are lines.** The Drive plasma trail is one thin steady strip below
  the bloom threshold, not soft patches over the ship and the HUD.

## Avoid

- Neon, chrome, ornate icons, noise on the HUD, scanlines on the HUD.
- Red on anything that is not a threat, and gold on anything that is not caution.
- Cotton-ball clouds and black boxes with white dots: if it is far away, it
  is still a designed thing.
- New fonts, new full-screen passes, lettering inside pictures.

## Still for a device

Frame rate on a crowded Raider fight (hull shaders, instanced pickups, hazard
rings) has only been counted in a software renderer. Bulwark plating shows its
texture when it fills the screen.
