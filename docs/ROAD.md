# The Warden's Road

The Reach is one line of fixed stops (`?classic` brings the chart back) instead of a chart to
choose across. The copy lives in the Claude Docs
"The Reach: Chapter Script" and "WAYWARD: An Authored Road"; this file is how
the code carries it.

## A leg is data

| What | Where |
|---|---|
| The stops, in order: name, kind, holder, port, breather, role, pinned job, script key | `ROAD` in `src/content/road.ts` |
| The journey on the road (`RegionSet` `'road'`, the Narrows as the gate after the last row) | `sim/journey.ts` |
| The Course screen (three layers) in place of the chart | `ui/chart.ts` |
| A stop's lines: one row a beat | `src/content/script/reach.ts`, `narrows.ts` |
| The runner: triggers, queue, card hold | `sim/script.ts` |
| Story cards and Wall clues | `content/story.ts`, `content/wall.ts` |
| Job thread chips (`CardDef.thread`) and replies | `content/missions.ts`, `sim/stage.ts`, script rows |
| German twins | `src/i18n/de/reach.ts`, keyed by the English line |

## Playback rules

- Strictly linear: one gate out of each stop, no sideways lanes.
- The pursuit is counted in days. A leg starts at 2, amber at 1, red at 0.5
  (`sim/hunt.ts`). No pursuit runs at a breather.
- Rows queue and are never dropped (only rows marked `stale` are). Radio and
  notices wait while the player fights or jumps. A card waits for a clear sky
  and holds the queue until answered.
- Rows waiting at a jump are carried (`carry.pending`) and play at the next
  stop's first free moment.
- A row's `wall` flag is set when the row triggers, so jumping early still
  logs the clue.
- The hunch stays non-"straight" until `relay_broadcast` (the handshake at
  the Narrows mast, 2 km out). Then the Course screen's pursuer is Calloway.
- The road's own lines and chips show only with the `on_road` flag, which a
  road journey carries from its first day.

## Add a stop

1. Add a row to `ROAD` with a `script` key.
2. Add rows in `content/script/` with `stop` set to that key (or `*`).
3. Every English line needs a twin in `src/i18n/de/reach.ts`. Comms lines
   stay at 15 words or fewer.
4. A new card goes in `content/story.ts` with its Wall clue in `wall.ts`.
5. `tests/reach.test.ts` checks every row has a stop and a real card.

## The Narrows and the ghost

The Narrows is a `gate`-kind system with script key `narrows`: a blockade
card (Ashgrove), the relay mast (`RELAY_OFF` in `sim/breakout.ts`), Ada's
first note and the Patience. The ghost at Hollis (`sim/ghost.ts`) is a
passive contact outside `aliens`: it holds, matches speed, and is never
explained.

## Balance

`npm run pilot:road` flies Cerro to the Narrows and writes
[BALANCE-ROAD.md](BALANCE-ROAD.md). The pilot does not read or linger, so it
shows the shape, not the pacing. The 40-minute target needs human playtests.

## The first two systems, and a wreck

- The audit dock's system and Northfold are safe (`SortieDef.safe`): no
  raiders from ahead, no chance fights, no crew hails. Only lingering draws
  the police: the first pursuer comes after 150 s, and the heat rises slowly.
- A wreck on the road leaves Juno in the same system, set going again with the
  gate a little off her heading (`SortieDef.off`). No chart, no tow.
