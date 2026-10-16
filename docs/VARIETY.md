# Variety

What a Story system is like to fly, how it is decided, and how to add to it.
The numbers are in [BALANCE-VARIETY.md](BALANCE-VARIETY.md) (`npm run pilot:variety`).

## The problem it answers

Before this pass most Story systems had an empty sky: one of three calm
backdrops and, one system in ten, a feature. A job's stage, the place's event
and the feature you could see were laid at three different spots (the stage
even sat on the port's side, a few tens of units from the dock). Cover
(`air.conceal`) was never read, so hiding in a shroud did nothing. Neighbouring
systems differed in their label, not in what the player did.

## The composer

`sim/experience.ts` deals every open system a sky once, from the journey seed,
and keeps it on the chart (`Chart.exp`, save v17; older saves are composed on
load). A sky is an expanse, a site (the feature the system's job or place sits
in) and a few ambient features.

- **Data.** `content/profiles.ts` holds one row per region: expanse weights,
  how many ambient features, a lean per feature, and the region's rules.
  `SITE_OF_GOAL` says where a job wants to be (a sneak wants a shroud, a defence
  wants rubble); `SITE_OF_PLACE` says what a place looks like.
- **Memory.** The chart is dealt a column at a time. A candidate is less likely
  the more the last two columns (x0.3, x0.6) and the same column (x0.35) already
  hold it, and a busy expanse after busy ones is damped.
- **Fairness.** One hazard (storm or well) at most per system, never in a
  breather, never the site of a job that is not about it; everything is laid off
  the straight line and clear of the start, the lane mouth and the port.
- **Signature.** objective, expanse, features, holder: the thing the pilot counts.

## One place for everything

`sim/sites.ts` lays the space from the sky. The site's spot is shared by the
feature you see from far off, the place's event (`encounters.ts`: dormant until
you fly in), the job's hail ring and its radar and compass marker
(`stageAnchor` / `placeAnchor`). Story features are still, so a pinned place
cannot drift away from its marker. A storm pays on dwell, not on a fly-past.

## What a region asks

| Region | Rule |
|---|---|
| Reach | Nothing to fear in the sky; cover is shown, not needed |
| Marches | Rich ground is claimed: linger and a Holdfast tender hails (`claim_holdfast`) |
| Salvage Belt | Staked wreck fields: a claim cutter hails sooner (`claim_guild`) |
| Drift Deep | Standing static; lantern lines steady navigation (`Effects.steady`) |
| Breaker Yards | The Custody watches open dark: the hunt runs faster in clear space (`watch`) |
| Free Ports | Lit lanes, convoys, few hazards |
| Hollows | Shroud, relics, carriers and wells; dust is where to wait |
| Last Lanes | Everything above, in pairs, a little watched |

**Cover is real now.** `rules.coverRate`: in cover the pursuit and swarm clocks
and heat run at the cover rate; sneak scan reach scales with it. **Claims**
warn once (a ping), then open a comms card with a fee, forged codes, the
Guild's ledger, a friend or a fight. The crew only comes if you fight or the
bluff fails. Lingering is slowed by `stealthOf`.

## Adding to it

- A new region rule: add a field to `Rules`, read it in `sim/rules.ts` or a
  world step, put the numbers in `PROFILES`, add a German twin.
- A new site for a goal: a row in `SITE_OF_GOAL`.
- A new claim card: `trigger: 'offer'` in `content/cards.ts`, named in
  `Rules.claim.card`.
- Tests: `tests/experience.test.ts`. Re-run `npm run pilot:variety` and keep the
  neighbour-repeat and three-window numbers where the report shows them.

## Not measured

The skies are laid and tested headless. How they look and feel, whether the
claim fee and warning timing are fair, and phone readability need a human
playtest on a device.

## A new verb: recover

`recover` (sim/mission.ts, job The Drift Cache): four cases drift round a
wreck field. Slow beside each to take it; the Rig's ore tractor widens the
reach and shortens the hold, so the same job is flown differently with and
without one. A salvage crew arrives after the first case, so the order and
the pace are the player's. Time out with some aboard pays for those. It is
dealt where a graveyard or breakers lie (`SITE_OF_GOAL.recover`).

## Lanterns stay special

A lantern line is the only thing that makes a static field navigable, so it
should be a find. It is `rare`, passed over six times in ten when it would be
dealt, paired with static only six times in ten, and a smaller share of the
job-site tables. It now shows in about 15% of systems outside Drift Deep
(24%) and the Last Lanes (29%).
