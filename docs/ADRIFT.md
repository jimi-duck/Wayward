# Adrift and total loss

What a wreck costs in Story, how it reads on screen, and the small piece of
story it carries. Arcade has no journey, so none of this applies there.

## The rule

- Wrecks are counted **for each region** (`Journey.lost`). It starts again at
  zero at every gate (`openChapter`).
- A wreck that is not the last leaves you **adrift**: a day passes (`ADRIFT`),
  and you wake in **another system of the same region** (`driftTo` in
  `sim/journey.ts`). A system you have not visited and the Net does not hold
  is preferred; never the Cerro yards, a gate or the Threshold. The lane out
  is plotted for you, as at the start of a journey.
- **The fee** (the tug's salvage claim): Cyrite, jump fluid and supplies keep
  the mode's share (`voyage.kept`: Drifter 75%, others 50%; supplies never
  below 3). The ship keeps its fitted modules and comes back at 2 plates.
- The mode's `voyage.wrecks` (Drifter 4, Prospector and Raider 3) is the
  wreck that is a **total loss**. The app then loads the chapter save (the
  journey as it stood at the gate that opened the region) and you fly the
  region again, with everything you had then. What you missed there is still
  out there. In the first region there is no gate save, so the journey
  begins again from Cerro with the same seed.
- Unchanged: Hardcore ends at the first wreck. A wreck with Calloway in the
  system is a capture (the region's risk) and ends the journey.

## Where it shows

- Start screen, Story picked: one teal line under the difficulty
  (`#sv-rule`) with the mode's number.
- The cutscene (`ui/adrift.ts`, `#drift`): four short lines over the dark,
  about nine seconds, any key, tap or pad A skips (after a short guard so
  the key that ended the fight does not). `lost` has three lines. Reduced
  motion: the lines appear without the fade.
- The adrift screen (the chart's notice): "Wreck n of N · region", the
  system you were towed to, what the fee took, and the wrecks left. Its
  button is "Fly on".
- The total-loss screen: "Total loss · region", "The region starts again",
  and a "Restart this region" button.

## The story

- **Who finds you:** a Drift tug. The Drift fleets (`sim/scatter.ts`) trade
  and talk and do not fight, and work the wrecks between systems. The tug's
  crew has no name or face.
- **What it costs:** a salvage claim on what is aboard. The share left is the
  drive being patched.
- **Total loss:** the tug brings what remains back to the gate it found you
  at: a new hull, the same file. This is a roguelite rewind told as a tow, not
  a time loop; keep it so.
