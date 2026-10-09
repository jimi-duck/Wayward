# The Story economy

One purse, one stock, two ways the ship can be in trouble. Written after the
user's note that food, scrap parts and ore felt loose, and that money had no
point if it did not build the ship.

## What is aboard

| Thing | What it is | Where it comes from | Where it goes |
|---|---|---|---|
| **Cyrite** | The one currency, in both modes: fuel, building material and money. | Violet crystals from mined rock, scrap and wrecks, jobs, favours, places. | The jump (one lane's worth), the bay (price and yard fee together), and the ports: supplies and plates. |
| **Supplies** | The galley and the spares in one stock (max 16, racks add 4 a mark). | Crates on wrecks and capital ships, cards, places, ports. | A lane's days (1 a day), the drive's wear (2 a jump), a plate patch (3). |

Chits and Krail are retired as things the player sees. The content rows (card
costs, fees, tier prices, yard fees) are still written in chits, the old
unit, and the engine converts where a row meets the hold: five chits to a
Cyrite (`sim/purse.ts`, `cy()`), never rounding a small amount to nothing. So
the tuning of those rows stands and only one number sets the exchange.
The hold has no cap of its own worth knowing (999); the HUD shows it against
the jump's cost, so the question is always "do I have the jump, and what is
over".

Scrap and crystals fall as Cyrite, a fifth of a chit's worth each, the odd
part by chance. They drop as bold violet crystals (1, 3 or 5 each) that fly
well clear of the rock, so a mined rock leaves something to fly through. In
the Arcade Cyrite is the same stock, counted one for one.

## The work bay

In the Story the ship is upgraded only docked at a port, the work bay: every
install, not just the yard's modules (the Arcade keeps its own picks in
flight). In flight, B says "Upgrades: dock at a work bay" and the bay badge
is gone.

- **No buying or selling Cyrite.** There is one stock, so nothing to swap. The
  Sensible stop buys supplies, then plates, from what is over the jump's
  Cyrite, and never spends the jump.
- **More of them, close by.** Mining systems have a bay 70% of the time,
  contested 75%, gates always. The bay sits 1,000 along the lane, 200 off
  it, with a 150 call range, so it is a short detour on the way to the lane
  mouth.
- **Safe inside.** The lane mouth and the bay are safe ground: shots do
  nothing inside the ring, hunters circle outside, and the HUD says so.

First guesses; the journey pilot docks once a system to upgrade.

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

Journey version 14. `meta/save.ts` adds the chits aboard to the Cyrite, five
to one (`oneCurrency`), after the older steps (Krail and ore into chits,
food and parts into supplies). The fixture is
`tests/fixtures/journey-v14.json`; older ones stay and migrate.

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
- With one stock, upgrades and fuel compete: every Cyrite spent in the bay is
  not in the tank. That is the point, and the first thing to watch on a
  device. The levers are the rock's Cyrite (`CYRITE` and `ORE` in
  `sim/breakout.ts`), `SCRAP_PRICE`, and the tier prices in `sim/bay.ts`.
- Card fees rise 12% a region out (`FEE_REGION`), so late Cyrite still has a use.
- Pilot (24 journeys): 21 through, 3 captured (was 23 and 1, noise at this size).
  The hold grows to about 100 by the sixth system and 240 by the tenth, the
  old chit pile at a fifth. Late Cyrite is plentiful once the web is fitted;
  missions that pay and cost something are the intended sink.
