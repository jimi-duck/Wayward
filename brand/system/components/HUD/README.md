# HUD

The in-run heads-up display. Three rules decide where everything goes: progress across the top, what's in your hand along the bottom, and only the capital ship gets a label in the world.

- **Top: the refit rail.** Full width, because progress to the next upgrade is the number a run is steered by. REFIT in `rail-label`, the meter in `signal`, the krail count in `krail` and `signal`.
- **Bottom: three chips.** What I'm flying (score and hull plates), what I can do next (overcharge and its key), what I'm scoring (chain). Each sits on `hull` glass so it stays legible over a lit rock or a nebula.
- **In the world: one callout.** The capital ship carries its name, hull meter and fuse on a tag with a leader line, in target-lock brackets. Off screen, the tag pins to the nearest edge with an arrow. Ordinary enemies are never labelled.
- **The overcharge ring** lives under the ship in the world as well as in the bottom chip: 28 segments on a tilted orbit that light as near misses charge it. The player's eyes are on the ship, so the gauge goes there too.
- **Telemetry** in `annotation` above the bottom-left chip shows true values: velocity, heading, graze count. It is texture that rewards a look.
- The viewscreen frame is four brackets with open sides, so rocks can cross the edge.
- Mobile: see MobileHUD.
