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

Krail is retired: chits are the only money in both modes. In the Arcade the bay spends them too (no prices shown, it opens itself at 30). Ore is not a stock: a lump
of scrap pays chits the moment it is picked up (`SCRAP_PRICE`, moved by the
survival mode), so there is no hold to fill and no sale to make.

## The work bay

In the Story the ship is upgraded only docked at a port, the work bay: every
install, not just the yard's modules (the Arcade keeps its own picks in
flight). In flight, B says "Upgrades: dock at a work bay" and the bay badge
is gone. The port also does the rest of the trade:

- **Sell spare Cyrite.** Whatever the tank holds beyond one jump pays
  `CYRITE_SELL` (3 chits) a unit. Scrap already pays at pick-up.
- **Rush price.** Buying Cyrite while the tank is short of the jump costs
  `CYRITE_RUSH` (x2). Once the tank covers the jump it is the plain price.
  The Sensible stop uses the rush price for the first units.
- **More of them, close by.** Mining systems have a bay 70% of the time
  (was 40%), contested 75% (50%), gates always. The bay sits 1,000 along
  the lane, 200 off it, with a 150 call range, so it is a short detour
  on the way to the lane mouth.

First guesses; the journey pilot docks once a system to upgrade and sell.

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
chits (the Arcade keeps no journey, so only its records and tuning keep the old `krail` name), food and parts into supplies (to the maximum), and renames the systems'
food richness and the ports' price lists. The fixture is
`tests/fixtures/journey-v13.json`.

## Numbers

First guesses, read from `npm run pilot:journey` (24 journeys, three regions,
[BALANCE-JOURNEY.md](BALANCE-JOURNEY.md)):

- The pilot fits upgrades in flight from one purse now, and every journey
  gets through (21 of 24 before). The ship is stronger earlier because scrap
  money builds it too. If real play is easier than it should be, the first
  lever is `SCRAP_PRICE` (2), then the rock's chit multiplier.
- Supplies were never short for the pilot (about 12 aboard from the second
  system on), so the empty-stores penalty is covered by tests, not by the
  pilot. A human who ignores the galley will meet it.
- The pilot's builds are over the mass rating from the fourth system on (and
  always by the eighth). The surcharge tops out at 6 Cyrite a jump, about a
  third of a lane, and a frame module (`hl_frame`, +4 mass a mark) fixes it.
- Chits pile up once the web is fitted (about 1,500 by the tenth system).
  Every card fee (tolls, bribes, favours) now rises 12% a region out
  (`FEE_REGION`), so late money still has a use. A later tier of yard work is
  the next step if that feels thin on a device.
