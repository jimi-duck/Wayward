# WAYWARD: status

What is built, against the game in [VISION.md](VISION.md). How it plays and
where each system lives: [DESIGN.md](DESIGN.md). The house rules are in
[CLAUDE.md](../CLAUDE.md). Every milestone ships to `main`, plays on a phone,
keeps `npm run check` green and has a pilot report that answers its question.

## Where the game stands

The Story is a journey of about 85 stops in eight regions (roughly seven
hours) from Cerro to the Threshold, with Calloway on the trail, the Net
spreading behind you and six endings. It opens on the Breakout story card,
the controls card and a short training run. The Arcade, the endless run the
game grew from, stays as a mode. Three survival modes (Drifter, Prospector,
Raider) change what the game is about. Cyrite is what you find and the money;
the ship's refinery cooks it into jump fluid first, which is all a jump burns
([ECONOMY.md](ECONOMY.md)). The journey save is at version 16. All game sound
is off.

## Milestones

| Milestone | State |
|---|---|
| M0 The rename | Done |
| M1 The Breakout | Done: playable, tested, pilot-balanced ([BALANCE-BREAKOUT.md](BALANCE-BREAKOUT.md)) |
| M2 The comms card | Done: cards, the read, earned choices, the checkpoint, policy pilot ([COMMS.md](COMMS.md)) |
| M3 The chart and the hunt | Done: seeded regions, lanes, the Net, Calloway on the trail, wrecks that cost rather than end, the journey save, the chart panel, a journey pilot ([BALANCE-JOURNEY.md](BALANCE-JOURNEY.md)) |
| M4 Notice and nemeses | Done: per-faction notice and standing, named captains with a memory, Calloway's file and the last meeting at the Threshold |
| M5 The ship | Done: four systems, their modules, resources and comms choices, the ghost echo, a ship pilot |
| M6 Crew | Dropped: the Wayward is a one-person ship |
| M7 The Scatter | Done: regions out through gates, the factions acting on their own, the Thren as swarms drawn to jump fluid, places |
| M8 The story | Done: three acts, story beats that piece the Severance file together, six endings with epilogues, the Archive ([BALANCE-ENDINGS.md](BALANCE-ENDINGS.md)) |
| R The refit bay | Done: the web as data and rules, the bay on screen, the budgets felt, the work bay in the Story, the console pass |
| SM Survival modes | Done: Drifter, Prospector and Raider, one table in `content/survival.ts` ([BALANCE-SURVIVAL.md](BALANCE-SURVIVAL.md)) |
| AR Arcade opening | Done: first wave at 3 s, wrecks pay 2.5x, one difficulty ([BALANCE-ARCADE.md](BALANCE-ARCADE.md)) |
| C Story communications | Done: one comms desk decides when anything is heard ([COMMS.md](COMMS.md), [BALANCE-COMMS.md](BALANCE-COMMS.md)) |
| S Scale-up | Built: the eight regions are the default for new Story journeys (`?short` plays the old three), with breathers, the clocks, chapters at region gates and a longer story. A playtest of the long journey is still to do |
| E The environment | Built, on by default (`?nospace` turns it off): features, expanses and their effects on the ship ([ENVIRONMENT.md](ENVIRONMENT.md), [BALANCE-SPACE.md](BALANCE-SPACE.md)). Pace and polish are left |
| G Situations | Done: the situation layer for the Story ([SITUATIONS.md](SITUATIONS.md), [BALANCE-SITUATIONS.md](BALANCE-SITUATIONS.md)) |
| Dev The review world | Done: `?dev` ([REVIEW.md](REVIEW.md)) |
| V Visual overhaul | Done: one look table (`render/look.ts`), designed hulls with a faction layer, rock, Cyrite, gate and port. A device look is pending |
| Eco The Story economy | Done, first guesses: one purse, jump fluid, supplies, the work bay ([ECONOMY.md](ECONOMY.md)). A device look is pending |
| Up Story upgrades | Built, first guesses: endless ladders, balance parts that never run out, prices that climb with every part, hulls and jobs scaled by depth ([ECONOMY.md](ECONOMY.md), [BALANCE-UPGRADES.md](BALANCE-UPGRADES.md)). A playtest of the climb is still to do |
| Mis Missions | Done: seven goal kinds, 32 jobs, on a timetable so every region has them ([MISSIONS.md](MISSIONS.md)) |
| Onb Onboarding | Done: a short lesson on every new Story journey, once in the Arcade ([ONBOARDING.md](ONBOARDING.md)) |
| H The HUD | Done, pending a device look: a quieter, contextual HUD ([HUD.md](HUD.md)) |
| J The jump chart | Done: header, map, a next-jump list of at most three lanes that differ (danger, straight on or longer, days, fluid, one upside and one trade-off) and a map of just here, those lanes and the gate; the rest sits behind Intel ([CHART.md](CHART.md), [BALANCE-FORKS.md](BALANCE-FORKS.md)). A device look is pending |
| Jmp The jump | Built: the drive charges on the way in, and jumping is flying through the gate: the ring blazes, the ship runs down its axis with streaking stars, a low wide camera, a pale teal tube and a light at the end, then the view goes pale teal into the chart ([JUMP.md](JUMP.md)). A device look and frame rate are pending |
| A Artwork slots | Built: nine slots with the current look as fallback; 64 generated pictures are installed and the rest wait on the set ([ART-SLOTS.md](ART-SLOTS.md)) |
| Var Variety | Built, first guesses: a seeded sky composer with column memory, one shared spot for each site, regional rules (claims, watch, lanterns), cover that works ([VARIETY.md](VARIETY.md), [BALANCE-VARIETY.md](BALANCE-VARIETY.md)). A playtest is still to do |
| SR Story rewrite | Built in a draft PR: the Cerro slice (archive wake, Sam, registry card, Krail reveal, the Wall, save v18), client and ally follow-ups in every region, Calloway's tollgate with the signature chain, Echo or Sable, the implant, and new epilogue lines. Oren's three questions and Draper's reveal are in. Calloway's Narrows (a gate beat) and the Threshold finale (Draper's fleet, a turned or hostile Calloway) are in. The opening is rebuilt as Contract 08-441 (see [ONBOARDING.md](ONBOARDING.md)): in flight with 800 of 1,000 Cyrite held, a Work Bay that takes no cargo and finances the launcher (credit 4, 2 left after charges, 80 CR owed on breach), two UNKNOWN raiders who pause the world with a pay-or-refuse offer (paying restarts the opening), a missile on refusing that destroys the hold, a chase to a gate 8 km on, then the breach notice, Lane Control's forced recovery (controls locked, autopilot to the audit dock for 40 s), Sam's private offer of the override, the rename, and one archive contradiction; dying before the gate restarts the opening from fresh. The Civic Score is removed from the game (owner, 2026-10-20; save v20 drops it). Names follow the third naming pass (Sam, Governor, Councillor, Marlow). Story pop-ups carry a one-line gist; five ledgers (account, breach, seized, lock, archive). Save is v20. Still to do: a 3D repaint of the hull at the rename, a journey pilot that finishes. Region plans in [STORY_BIBLE.md](STORY_BIBLE.md); brief in [CLAUDE_STORY_REWRITE_BRIEF.md](CLAUDE_STORY_REWRITE_BRIEF.md). Not playtested; saves are v20 in code (this table's older notes may say v16) |
| PJ Post-jump level | Built in a draft PR: the first system past Cerro is a worked-out industrial system with an audit dock, an optional supply depot on the way to the Jump Gate, three worlds in the sky and nine ships of friendly traffic that answer fire with a fair, local guard. The objective is the audit dock until Sam's code lifts the owner lock (`ship_stolen`), then the Jump Gate. "Lane entrance" is now "Jump Gate" in the player-facing text and docs. The whiteout report could not be reproduced: see [POSTJUMP.md](POSTJUMP.md). Not playtested on a device |

Real-device play is still to do for most of the later milestones: no pilot
can judge feel or frame rate ([PERF.md](PERF.md)).

## Next

- Playtest the long journey (the wording, the pacing) and play the later
  milestones on real devices.
- Fill the remaining artwork slots.
- The environment's last stage: pace and polish.
- The long tail: more cards, captains, factions, places, modules and
  endings. The systems should multiply each other; expand combinations
  before adding combat.
