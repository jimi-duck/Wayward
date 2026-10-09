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

First guesses, read from `npm run pilot:journey` (24 journeys, three regions,
[BALANCE-JOURNEY.md](BALANCE-JOURNEY.md)):

- The pilot fits upgrades in flight from one purse now, and every journey
  gets through (21 of 24 before). The ship is stronger earlier because scrap
  money builds it too. If real play is easier than it should be, the first
  lever is `SCRAP_PRICE` (2), then the Story rock's Krail multiplier.
- Supplies were never short for the pilot (about 12 aboard from the second
  system on), so the empty-stores penalty is covered by tests, not by the
  pilot. A human who ignores the galley will meet it.
- The pilot's builds are over the mass rating from the fourth system on (and
  always by the eighth). The surcharge tops out at 6 Cyrite a jump, about a
  third of a lane, and a frame module (`hl_frame`, +4 mass a mark) fixes it.
- Chits pile up once the web is fitted (about 1,500 by the tenth system).
  The bay is the only big sink, so a later tier of yard work is the next
  thing to add if that feels empty on a device.
