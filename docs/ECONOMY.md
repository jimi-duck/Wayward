# The Story economy

One purse, one stock, two ways the ship can be in trouble. Written after the
user's note that food, scrap parts and ore felt loose, and that money had no
point if it did not build the ship.

## What is aboard

| Thing | What it is | Where it comes from | Where it goes |
|---|---|---|---|
| **Chits** | The one currency. | Scrap and rock picked up, jobs, favours, wreck loot, places. | The bay (price and yard fee together), and the ports: supplies, Cyrite, plates, news. |
| **Supplies** | The galley and the spares in one stock (max 16, racks add 4 a mark). | Crates on wrecks and capital ships, cards, places, ports (9 chits). | A lane's days (1 a day), the drive's wear (2 a jump), a plate patch (3). |
| **Cyrite** | Fuel. One jump's worth for one lane. | Violet rock, wrecks, ports. | The jump, plus a weight surcharge (below). |

Krail is the Arcade's run currency and nothing else. Ore is not a stock: a lump
of scrap pays chits the moment it is picked up (`SCRAP_PRICE`, moved by the
survival mode), so there is no hold to fill and no sale to make.

## When it goes wrong

The ship still flies. It flies worse.

- **Supplies low** (4 or fewer): a quiet gold line on the HUD, the chart and
  the port. Nothing else yet.
- **Out of supplies**: thrust, turning and the guns' cycle run at 85%
  (`EMPTY_STORES`), patching stops, and each jump in the lane costs a plate
  (never below one). A crate brings it back at once.
- **Heavy** (mass over the frame's rating of 8): thrust and turning fall by
  the overload rule in `sim/budgets.ts` (down to 60%), and each jump burns one
  more Cyrite per point over, up to six (`WEIGHT_FUEL`). The chart shows the
  full price of each lane.
- **Running hot** (heat over the rating): the guns recharge and reload slower.

The port shows the same lines under its stock row, with where each is mended:
supplies there, weight and heat in the bay.

## Saves

Journey version 13. `meta/save.ts` folds Krail and ore (at the scrap price) into
chits, food and parts into supplies (to the maximum), and renames the systems'
food richness and the ports' price lists. The fixture is
`tests/fixtures/journey-v13.json`.

## Numbers

First guesses, to be tuned from `npm run pilot:journey` (see
[BALANCE-JOURNEY.md](BALANCE-JOURNEY.md)).
