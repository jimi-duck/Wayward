# The Story economy

Two things to find a use for, one thing to find. Written after the user's
notes that food, scrap parts and ore felt loose, that money had no point if it
did not build the ship, and then that fuel and upgrade money being the same
stock meant holding some back to jump even when you had already collected
enough.

## The model in four lines

1. You find **Cyrite**: mined rock, wrecks, jobs, favours.
2. The ship's refinery cooks it into **jump fluid** first, until the drive
   tank is full. Nothing to decide, nothing to hold back.
3. What the tank cannot take stays **Cyrite**, your money: upgrades at a work
   bay, supplies, plates, favours.
4. A jump burns the lane's worth of jump fluid, and only that. Upgrades never
   touch the tank.

So there is one number to watch to leave (fluid against the lane's cost) and
one to spend (Cyrite). The story reason: Krail runs humanity, but a drive
needs Cyrite cooked down, and the Wayward is an ore hauler with a good
refinery. She cooks as she collects.

## What is aboard

| Thing | What it is | Where it comes from | Where it goes |
|---|---|---|---|
| **Jump fluid** | The drive tank: exactly the plotted lane's jump, no more (replot to a dearer lane and it asks for a little more). | The refinery, from every Cyrite you pick up or are paid, until the tank is full. Ports sell a top-up. | The jump (one lane's worth, plus a heavy ship's surcharge). Cards can ask for it (a Thren swarm takes five). |
| **Cyrite** | The purse, in both modes. | What the tank cannot take: rock, scrap, wrecks, jobs, favours, places. | The bay (one price, yard work included), the ports (supplies, plates, fluid), card costs. |
| **Supplies** | The galley and the spares in one stock (max 16, racks add 4 a mark). | Crates on wrecks and capital ships, cards, places, ports. | A lane's days (1 a day), the drive's wear (2 a jump), a plate patch (3). |

Arcade: there is no jump, so no fluid. Cyrite is the one stock and the bay
spends it, as before.

Chits and Krail are retired as things the player sees. The content rows (card
costs and fees) are still written in chits, the old
unit, and the engine converts where a row meets the hold: five chits to a
Cyrite (`sim/purse.ts`, `cy()`), never rounding a small amount to nothing. So
the tuning of those rows stands and only one number sets the exchange.

Scrap and crystals fall as Cyrite, a fifth of a chit's worth each, the odd
part by chance. They drop as bold violet crystals (1, 3 or 5 each) that fly
well clear of the rock, so a mined rock leaves something to fly through.

### The refinery (`refine` in `sim/purse.ts`)

Every positive Cyrite that comes aboard in the Story goes through it: pickups
(`World.collect`), a card that pays (`applyOutcome`), a place's reward
(`bank` in `sim/journey.ts`). The tank takes what it has room for, the purse
the rest. A loss (a toll, a bribe, a surrender) comes out of the purse only.
A card that gives or takes fluid says so (`fuel` on an outcome or a cost) and
the chip reads "jump fluid".

The cost of this is that a ship on an empty tank has an empty purse: the
first lane's worth of Cyrite you mine goes to the tank, not the bay. That is
the same Cyrite the old stock needed to leave, so reaching the lane takes
what it always took; what is new is that the purse is only ever spare.

### The port

- **Top up.** Fluid is a rescue, not an economy: about two Cyrite a unit
  (`FLUID_PRICE` 0.4 of the board's Cyrite price, so three under the Net).
  The jump fluid and supplies cells each have a Fill button that buys up to
  the tank or hold as far as the purse reaches. Hull plates are not sold: the
  yard mends the hull on docking.
- The status strip reads `Cyrite 31 to spend · Jump fluid 9/20 · Supplies`.
  The 20 is the plotted lane's jump plus the weight of a heavy ship
  (`World.jumpCost`), so the departure block names the same number.
- The refit bay is free to enter; its card counts the modules the bay would let
  you fit right now (`affordable` in `sim/bay.ts`: price, power and place all
  met); with none, it names the cheapest part's price.

### On screen

- Status panel: `Fluid 9/20` (a bar that turns ready at the jump's cost) and
  `Cyrite 31`. The objective says "Fill the tank" with the same count until
  the tank holds the jump, then "Head for the Jump Gate".
- The chart's stock strip: `Jump fluid` and `Cyrite`, each with a tooltip.
  Lane costs on the chart and the chart's list are fluid.

## The work bay

In the Story the ship is upgraded only docked at a port, the work bay: every
install, not just the yard's modules (the Arcade keeps its own picks in
flight). In flight, B says "Upgrades: dock at a work bay" and the bay badge
is gone.

- **Upgrades come from the purse only.** The tank is never in the sum, so
  there is nothing to hold back for the jump.
- **More of them, close by.** Mining systems have a bay 70% of the time,
  contested 75%, gates always. The bay sits 1,000 along the lane, 200 off
  it, with a 150 call range, so it is a short detour on the way to the lane
  mouth.
- **Safe inside.** The Jump Gate and the bay are safe ground: shots do
  nothing inside the ring, hunters circle outside, and the HUD says so.

## Upgrades: the one thing to spend on

The ship is the point of the money. Every part has an upside and a downside,
and there is always something to fit.

- **Three loads, felt as Acceleration, Top speed and Cooldown.** Every part
  loads Power, Heat or Mass (`WEB` in `content/web.ts`). Each nudges the ship a
  little (`sim/budgets.ts`), nothing is refused, and a warning light comes on
  past a rating. Over the Heat rating the guns cycle slower; over the Mass
  rating the ship is slower off the mark and each jump burns more fluid.
- **Balance parts, with no end.** The reactor core (+3 power, 1 heat), the heat
  coolant loops (+4 heat, 1 mass) and the frame (+4 mass, 1 power) are open at
  every work bay and have no top level. Each takes a little of the next gauge,
  so a big ship needs about one balance part for every three or four parts
  it carries, and a ring of them never runs out.
- **Ladders that go on.** Stat upgrades, and the yard modules that change the
  stat block, have no top level. Past the written top a level gives half of
  a written level, each one a tenth less (`overhaul`), until the ship's own
  limits (`CAPS`) leave nothing to gain; the bay then says "At its limit".
  Single-purchase parts (a system, a specialisation, a flag) are bought once.
- **Prices climb** (`STORY_PRICE`, `cost` in `sim/bay.ts`): a first fit costs
  20, 27, 36 or 48 Cyrite by tier (the balance parts 25, climbing a ninth a
  level); each further level of the same part costs a quarter more; and every
  level fitted anywhere on the ship adds 7% to every price. The Arcade's price
  stays flat.
- **Life without them gets harder.** Hostile hulls are tougher by the depth of
  the chart (`threatAt`: 1 in Cerro to 8 at the Threshold) and fire a quarter of
  that excess oftener, so a ship that stays as it left falls behind. Jobs pay
  more the same way (`bountyAt`: 1 to 2.5), so jobs stay the way to the next
  part.

Prices in Cyrite, for the 1st, 3rd, 6th and 10th level of one part, on a ship
with 0, 20 and 40 levels fitted:

| Part | 0 | 20 | 40 |
|---|---|---|---|
| Laser emitters (tier 1) | 20 / 30 / 60 / 150 | 50 / 75 / 145 / 360 | 75 / 120 / 230 / 565 |
| Warhead yield (tier 2) | 25 / 40 / 80 / 200 | 65 / 100 / 200 / 485 | 105 / 160 / 315 / 765 |
| Reactor core (balance part) | 25 / 30 / 45 / 70 | 60 / 75 / 105 / 165 | 95 / 120 / 165 / 265 |

Numbers and what they do to a journey: [BALANCE-UPGRADES.md](BALANCE-UPGRADES.md)
(`npm run pilot:upgrades`). First guesses; the feel of the climb needs a
playtest.

## When it goes wrong

The ship still flies. It flies worse.

- **Supplies low** (4 or fewer): a quiet gold line on the HUD, the chart and
  the port. Nothing else yet.
- **Out of supplies**: thrust, turning and the guns' cycle run at 85%
  (`EMPTY_STORES`), patching stops, and each jump in the lane costs a plate
  (never below one). A crate brings it back at once.
- **Heavy** (mass over the frame's rating of 8): acceleration and turning fall by
  the overload rule in `sim/budgets.ts` (down to 55 and 60%), and each jump burns one
  more Cyrite per point over, up to six (`WEIGHT_FUEL`). The chart shows the
  full price of each lane.
- **Running hot** (heat over the rating): the guns recharge and reload slower.

The port shows the same lines under its stock row, with where each is mended:
supplies there, weight and heat in the bay.

## Saves

Journey version 15. `meta/save.ts` splits an older save's Cyrite into the new
tank and purse: the tank takes up to 40 (what it always was, the jump's
fuel), the purse the rest (`driveTank`). Nothing is lost. The fixture is
`tests/fixtures/journey-v15.json`; older ones stay and migrate (14 added the
chits to the Cyrite, five to one, after the older steps).

## Numbers

From `docs/BALANCE-JOURNEY.md` (three regions, 48 journeys, first guesses):

- 45 of 48 journeys reach the Threshold (the old single-currency report had
  21 of 24); the other three were captured. None got stuck for want of fluid.
- The tank is empty again after almost every jump (0 to 2 units left), so the
  fluid never piles up. The purse is what grows: about 47 Cyrite after the
  first system, 75 by the middle and 200 to 300 near the end.
- Late journeys were rich. Upgrades now cost several times what they did and
  climb, so the purse is spent as it comes through most of the chart; see
  [BALANCE-UPGRADES.md](BALANCE-UPGRADES.md).
- Not measured: how the refinery rule feels in play, and whether about 2
  Cyrite a unit at a port is right.
