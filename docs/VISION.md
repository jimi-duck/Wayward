# Kestrel: The Shoals

*A design vision for what the game becomes next.*

Status: proposal, for review. Nothing here is built yet. The current game
(the fifteen-minute survival roguelite in [DESIGN.md](DESIGN.md)) stays
playable throughout and becomes one mode of the larger game (see
[What happens to the current game](#what-happens-to-the-current-game)).

---

## The pitch, in one paragraph

Past the last starbase lies **the Shoals**: a vast, shallow sea of subspace
where the stars drift, the charts go stale every few weeks, and a tide no one
understands washes dilithium up onto the rocks and drags ships down into the
deep. Starfleet has sent one ship to chart it: the U.S.S. Kestrel, a survey
tender with a mining refit, a crew of forty and no backup. You are her
captain. Mine to pay your way, trade to make friends, fight when you have to,
and chart what nobody has charted. Out here every hail is a question (trade,
plea, threat or trap?) and every jump costs fuel you might not get back.
Somewhere in the deep, something old is lighting the lanterns again.

**Genre, in a line:** a frontier exploration, mining and trading game with
real-time arcade combat, played in short sorties across a living star chart,
building toward a story with more than one ending.

**Touchstones:** *Star Trek* (the frontier, the hail, the moral choice, the
away-team spirit); *FTL* (the chart, the event card, the fuel squeeze);
*Sunless Sea* (a dark, mysterious sea, a captain's log, a story you uncover);
*Elite* and *Freelancer* (trade runs, contracts, a reputation that follows
you); *Shadow of Mordor* (enemies who remember you).

---

## Why change, and what has to survive

The game today is a strong arcade shooter: the flight feels good, the refits
are readable, the capital-ship fights telegraph well, and the simulation is
cleanly separated from rendering, so it can be balanced by a scripted pilot.
But it has one verb (*survive*) and one clock (*pressure rises until you
die*). Everything else (mining, events, hails) is a garnish on that clock.

The new game keeps the verbs and changes the clock. The ship, the flight
model, the phasers, the barrel roll, the warp core and the capital-ship
fights all survive, because they are good. What changes is **why you are out
there**. You are not waiting to die; you are on a voyage, with somewhere to
go, things to find and people to deal with, and combat is one of the ways a
day can go, not the only one.

### Design pillars

1. **The frontier is the protagonist.** The Shoals should feel bigger than
   you, older than you and indifferent to you. Every system has a reason to
   visit and a reason to leave.
2. **Every hail is a decision.** Contact with other ships is the heart of the
   game. Most meetings are not fights. The ones that become fights should feel
   like they could have gone another way.
3. **Scarcity makes meaning.** Dilithium is fuel, research and power, and
   there is never quite enough. What you carry, what you burn and what you
   sell are the real build.
4. **Many roads, no wrong one.** Science, industry, trade and arms each make
   a different captain with different options, not just bigger numbers.
5. **Short sorties, long voyage.** A phone in a queue should get a complete,
   satisfying five-minute sortie. A long evening should get a voyage that
   remembers what you did.
6. **Telemetry, not intuition.** The scripted pilot stays. Every new loop is
   built so it can be played headless and balanced from numbers.

---

## The setting

### The Shoals

A region of space roughly a hundred light years across, where subspace is
"shallow": thin, turbulent, and prone to tides. Warp drive works, but badly
and expensively. Sensors see less far. Stars appear to drift on the charts
because the routes between them open and close with the tide.

Ships have always come here for one reason: **the tide washes dilithium
up**. Every surge leaves fresh crystal in the rock of the systems it touches,
then recedes. Prospectors follow the tide like gold rushers follow rumours.
Most go home rich or not at all.

The nautical metaphor runs through everything, deliberately:

| Thing | In the Shoals |
|---|---|
| The map | **The chart**: systems and the routes between them, which shift |
| Routes that close | **Shallows**: routes that need more fuel, or a better drive, or the tide in your favour |
| The deep interior | **The Deep**: the region at the centre that no ship has returned from |
| Ancient beacons | **Lanterns**: alien structures that pulse when the tide turns |
| Pirates | **Wreckers**: they light false beacons and loot the ships that come |
| Your ship | **The Kestrel**: a shore bird, built to work the edge of the sea |

### The mystery: the Lamplighters

Long ago, a species now called the **Lamplighters** built the Lanterns: a
network of beacons across the Shoals that held subspace steady and let ships
cross it safely. Then the Lamplighters vanished, the Lanterns went dark, and
the Shoals became what they are now.

The dilithium is the clue. The tide is not natural: it is the Lantern network
trying to restart itself, drawing on the crystal in the rock and depositing
it elsewhere as it cycles. Dilithium is getting rarer each tide because the
network is consuming it. Something in the Deep is relighting the Lanterns one
by one.

The player uncovers this in fragments: Lantern ruins to scan, Driftfolk
stories, Wrecker logs, a Starfleet survey team that went missing thirty years
ago, a dying crystalline entity that is trying to say something. What they do
about it is the ending (see [The Voyage and its endings](#the-voyage-and-its-endings)).

The mystery is the spine, not a gate. A player can ignore it entirely and
spend a voyage as a hauler getting rich, and the game still works; the
mystery just keeps knocking.

### The tone

*Star Trek* at its best: curious, humane, a little lonely, with real danger
and real moral weight. The crew are professionals; the frontier is not
evil, just indifferent; most people you meet have reasons. Tension comes
from uncertainty more than from gore. Humour lives in the hails.

---

## Who is out there

The Shoals has its own people, original to this game, and visitors from the
great powers. The locals give the game an identity of its own; the great
powers keep the existing ships, models, factions and capital-ship fights in
play.

### The locals

**The Assay Guild.** A mining and trading consortium, corporate, polite and
ruthless in the ledger. They own the stations, set ore prices, post contracts
and lend money. They are the closest thing the Shoals has to a government.
Good friends; terrible creditors.
*Gives:* markets, contracts, loans, licences to mine claimed systems.

**The Driftfolk.** Nomads who have lived in the Shoals for generations, in
convoys of patched-together ships. They read the tide like sailors read the
weather. Proud, poor, suspicious of anyone with a uniform. They know where
the Lanterns are.
*Gives:* tide forecasts, route knowledge, rare goods, refugees who need help,
the best story leads.

**The Wreckers.** Pirates, salvagers and opportunists who light false
distress beacons and strip the ships that answer. Not one faction but a
dozen crews with a shared code and a shared fence. Some are cruel; some are
just broke Driftfolk who gave up.
*Gives:* extortion, ambushes, black-market trade, the fence (sell anything,
no questions), and their own nemesis captains.

**The Quiet.** Something crystalline that lives in the dense fields and eats
dilithium. It does not answer hails. It is not hostile, exactly: it swarms
anything carrying a lot of crystal. The science path learns to talk to it,
and it turns out it has been trying to talk all along.
*Gives:* a hazard, a puzzle, and the key to the mystery.

### The visitors

The great powers are here for the dilithium, and they are the heavyweights:

- **The Klingons**: prospecting houses, each wanting glory and claims.
  Honourable in their way; a Klingon captain who announces a hunt will
  actually come, and will respect you for fighting.
- **The Cardassians**: a mining directorate that wants the Guild's stations.
  Bureaucratic, patient, always running a survey of their own.
- **The Romulans**: never hail first. They are watching the Lanterns. They
  know more than they say.
- **The Tholians**: territorial, precise, angry about anyone crossing their
  shallows. Their webs mark borders.
- **The Borg**: a late-voyage threat. A cube drawn by the Lanterns' signal.
  Not a faction you deal with; a storm you survive.
- **Starfleet**: your own side, months away by subspace relay. The
  Admiralty sends orders, wants charts and first contacts, and is not always
  right about what matters out here.

### Reputation

Every faction has a standing with you, from **hostile** to **allied**, moved
by what you do: who you trade with, whose ships you destroy, whose distress
calls you answer, whose contracts you finish, whose secrets you sell. Standing
changes prices, what hails you get, whether stations let you dock, and
whether a faction's captains come to talk or to kill.

Standings pull against each other. The Guild loves you for breaking Wreckers;
the Driftfolk notice the Wreckers you broke were somebody's cousins.

---

## The three scales of play

The game is three nested loops, each with its own decisions.

```
  MOMENT  (seconds)   fly · shoot · mine · dodge · tractor · scan
     │
  SORTIE  (3–8 min)   arrive in a system → scan → choose what to visit →
     │                mine / explore / trade / fight / answer hails →
     │                warp out before the system turns on you
     │
  VOYAGE  (hours)     the chart · fuel and cargo · research and refits ·
                      reputation · nemeses · the tide · the mystery · the ending
```

### The moment

This is the game as it is today, widened. Flight, phasers, torpedoes, the
barrel roll and the warp core all stay. New verbs join them:

- **Scan** (a sensor pulse): reveals what is in range, at a cost of
  revealing you. Rock shows its ore; ships show their strength and intent;
  phenomena show their readings.
- **Mine** (a mining beam, distinct from the phasers): hold the beam on a
  rock to cut it. Each rock has a heat window; keep the cut in it and the
  rock gives up its ore cleanly; overheat and it fractures, scattering a
  fraction of the yield; volatile ore can go off. Blasting rock with
  phasers still works, and is quick, but wastes most of what is inside.
- **Tractor** (already in the game): pull in ore, crystal, salvage, pods,
  people.
- **Hail** (the comms panel): talk to anything in range that will listen.

### The sortie: a system

A **sortie** is one star system: one 3D scene, like the current play space,
but with a shape and a purpose instead of endless waves.

When you drop out of warp, you see a system with a handful of **points of
interest** (POIs), some known, some just "unknown signal":

- **Fields**: asteroid belts and clusters to mine, of different ore grades;
  rare tide-washed fields with dilithium veins.
- **Stations**: Guild outposts, Driftfolk convoys at anchor, Wrecker fences,
  faction bases. Dock to trade, repair, refit, take contracts.
- **Phenomena**: the cosmic events (see [The sky itself](#the-sky-itself)).
- **Wrecks and derelicts**: salvage, logs, traps.
- **Lanterns**: ancient ruins, the story's breadcrumbs.
- **Signals**: unknowns. A scan turns an unknown into one of the above, or
  into a ship.

Traffic moves through the system: traders, patrols, prospectors, Wreckers,
the Quiet. Some of it will hail you.

**Attention.** Every system has a quiet **attention** gauge. Mining,
fighting and scanning raise it; time raises it slowly. As it rises, the
system notices you: Wreckers smell a full hold, patrols come asking
questions, the Quiet drifts towards your crystal. It is the old pressure
clock, but now it is local, readable and escapable: when it gets hot, warp
out. This is what keeps a sortie short and pointed, and what keeps combat a
consequence rather than a constant.

A sortie ends when you **warp out** (to an adjacent system on the chart) or
**dock** (a safe save point).

### The voyage: the chart

The chart is the strategic layer: a map of systems joined by routes, opened
from the Shoals' edge towards the Deep.

- **Fuel.** Every jump burns dilithium. Short hops are cheap; shallows cost
  more; the Deep costs a lot. Running dry leaves you limping on impulse to the
  nearest system and calling for help, which is a hail you may not enjoy.
- **Fog.** Systems you have not visited show only what your sensors or your
  sources say: a class, a rumour, a threat estimate. Charts, bought or
  scanned, lift the fog.
- **The tide.** Every few hours of play (or every N jumps), the tide turns.
  Some routes close, new ones open, new frontier systems appear at the edge
  of the chart, and fresh dilithium washes into a few fields. Driftfolk can
  forecast it. The tide is what keeps the chart from ever being finished.
- **Threat.** Each system shows a threat band (quiet, contested, dangerous,
  lawless) that comes from who is there and how they feel about you.

The chart is where long decisions live: where to sell, where to refuel,
which contract to chase, whether to push into a frontier system with half a
tank.

---

## The economy

### Dilithium: rare again

Dilithium stops being XP that falls out of everything. It becomes the most
precious thing in the Shoals:

- **Fuel** for warp jumps.
- **Power** for the warp core's release and the top tier of research.
- **Currency** in its own right: everyone takes crystal.

It comes from **dilithium veins** in tide-washed fields (rare, contested),
from **capital ships and nemeses**, from **deep phenomena**, from **trade**,
and occasionally from a lucky rock. Carrying a lot of it makes you a target.

### Ore and cargo

The Kestrel has a **hold**: a few cargo slots to start, more with refits.
Mining fills it with ore, in a small number of grades so the decision stays
legible:

| Grade | Where | Value | Note |
|---|---|---|---|
| Common ore | any rock | low | the bread and butter |
| Rich ore | violet-veined rock (already in the game) | medium | |
| Heavy ore | iron rock (already in the game) | medium | slow to cut, heavy |
| Volatile ore | volatile rock (already in the game) | high | goes off if you overheat the cut, or take a hit with it aboard |
| Exotics | phenomena, deep fields | very high | each one wanted by someone specific |
| Dilithium | veins, bosses | precious | also fuel |

Plus **trade goods** bought and sold at stations (medicine, machine parts,
luxuries, weapons, refugees' belongings, contraband) and **data** (survey
charts, scans of phenomena, Lantern readings), which is cargo that weighs
nothing and that the right buyer pays well for.

### Markets

Each station has prices that depend on what it produces, what it needs, who
runs it, the tide, and events: a war raises the price of weapons and
medicine; a fresh tide crashes ore prices near the surge; a blockade makes
smuggling worth the risk. Prices are shown on the chart once you have been
there or bought the data, so trade routes are something you discover.

Not everyone sells everything. The Guild will not touch contraband; the
Wrecker fence takes anything at half its worth; Starfleet buys survey data
but not ore; the Driftfolk barter.

### Money

Credits are the Guild's scrip, honoured almost everywhere. Debt is possible:
the Guild lends, with interest, and collects.

---

## The hail: every contact is a decision

This is the system that turns a shooter into a frontier. Ships hail you;
you hail them; stations broadcast; distress calls come in. Each contact is
a short **comms card**: a portrait, a voice, a situation and two to four
choices. The game pauses (as it does for refits now) or, for the time-critical
ones, slows.

### Kinds of contact

| Contact | What happens | Example |
|---|---|---|
| **Trade** | A ship offers to buy or sell | "You've ore aboard, Kestrel. I'll take the heavy grade off your hands at twelve a ton. Saves you the run to Halyard." |
| **Plea** | Someone asks for help | "Our coolant's gone, we've children aboard. Please." (Real, or a Wrecker lantern?) |
| **Contract** | Someone offers a job | Escort, delivery, survey, salvage, bounty, rescue, smuggling |
| **Extortion** | Pay or fight | "Thirty percent of your hold and you warp out whole. That's the toll." |
| **Warning** | A territorial claim | "You are in Tholian space. You have sixty seconds." |
| **Declaration** | A captain announces intent | "You destroyed eleven of my house's skiffs. I am coming for you, Kestrel. Three jumps. Make ready." |
| **Ambush** | No hail at all | Decloak, fire, fight |
| **Rumour** | Information, free or for a price | "There's a field past Corran nobody's mined since the last tide. For forty, I'll tell you which one." |
| **First contact** | Someone new | The Quiet, a Lamplighter echo, a Driftfolk elder |

### Reading the other ship

Before you answer, your sensors give you a **read**: their hull and
strength against yours, what they are carrying, and an **intent** estimate
("hostile intent: likely"). How good the read is depends on your science
refits. A bad read says "unknown". A good read catches a bluff: the
extortionist who is hailing from a ship with no torpedoes, the plea from a
ship whose life signs read zero.

### Choices that depend on who you are

Every card has the plain choices (agree, refuse, fight, leave) and
**path choices** that only appear if your ship or your standing allows them.
This is where the research paths show up in play:

- With **tactical** refits: *intimidate* ("Look at my torpedo bays and say
  that again.")
- With **science** refits: *call the bluff* ("Your reactor's cold. You're a
  decoy.") or *analyse* their ship for a weakness before the fight starts
- With **operations** refits: *negotiate*, *bribe*, *offer a counter-deal*,
  *transport* goods or people across without docking
- With **engineering** refits: *offer repairs* (a reputation gain for parts),
  *jettison* a decoy cargo pod
- With **standing**: *invoke the Guild*, *call in a Driftfolk debt*, *name
  your Klingon friend's house*

Most cards should have a peaceful way through for at least one path, and a
violent one for anyone.

### How a card is built

Cards are data, like upgrades are now: a trigger (who, where, what state), a
text with slots ("{captain} of the {ship}"), choices with requirements and
outcomes. Outcomes are a small vocabulary: change cargo, credits, fuel,
standing, start a fight, spawn ships, set a flag, schedule a follow-up,
give a contract. A content writer can add a hundred without touching the
simulation. Follow-ups are what make it feel alive: the family you rescued
turns up at a station three systems later with a gift; the extortioner you
paid hails again, asking for more.

---

## Combat, rethought

Combat stays real-time, skill-based and fun. It just stops being constant.

### Frequency and rhythm

A typical sortie has zero, one or two fights, and most of them are the
result of a choice: you took a bounty, refused a toll, mined in a claimed
field, stayed too long. Quiet systems are genuinely quiet. Lawless ones
are not. A good target: around a quarter to a third of play time is combat,
the rest exploring, mining, trading and talking.

### Asteroids

Rock stays destructible, and still splits large to medium to small. The
difference is that now you usually *want* to mine it rather than shoot it,
because mined rock gives ore and shot rock gives scraps. Volatile rock is a
mining puzzle and a combat tool (shoot it next to an enemy).

### Notice, hunters and nemeses

Every faction keeps a **notice** of you: how much harm you have done them.
Destroy their scouts and skiffs and it climbs. At thresholds, they respond:

1. **A warning.** A hail: "That's the third of ours. Stop."
2. **A hunter.** A heavier ship sent after you, sometimes announced,
   sometimes not.
3. **A named captain.** A capital ship with a name, a face and a grudge.
   This is the boss.

Named captains are **nemeses**, and they persist:

- They **announce or ambush**, by personality. A Klingon declares the hunt
  and gives you jumps to prepare. A Romulan never announces. A Wrecker
  captain might send an offer first: "Pay me, and I'll forget the skiffs."
- They **do not always fight** the first time. A captain may hail, scan you,
  decide you are not worth it yet (or are more useful alive), and leave. The
  next meeting is coloured by the first.
- They **remember**. Beat one and they may escape, scarred and angrier, with
  new tech. Lose to one and they may spare you, taking your cargo, and
  gloat next time. Bribe one and they may become a contact. Spare one and it
  may come back as an ally when you need one.
- They are **finite**. Each faction has a handful of named captains per
  voyage, so beating one matters.

The existing capital-ship fights (three phases, telegraphs, faction
signature attacks, salvage tech) become these nemesis fights, unchanged at
their core. The difference is the build-up: you know who she is, why she
is coming and what she wants.

### Losing a fight

Getting beaten does not have to mean death. When the last plate is about to
go, a fight can end in: **surrender** (they take cargo, maybe a module),
**escape** (an emergency warp at a big fuel cost), or **destruction**. Some
enemies accept surrender (Wreckers, Cardassians); some do not (the Borg,
some Klingon houses, the Quiet).

---

## The sky itself

Cosmic phenomena are where exploration lives. Each one is a place to go,
something to learn, something to risk, and something to bring back. The
existing sector events (ion storm, nebula, anomaly, rich field, derelict,
distress, convoy) all fold in.

| Phenomenon | What it is in play | The risk | The reward |
|---|---|---|---|
| **Nebula** (exists) | Sensors fail, fog | Ambushes; you can't read hails | A hiding place; the core charges faster; nebula gas to sell |
| **Ion storm** (exists) | Lightning on telegraphed circles | Hull damage | Near misses charge double; storm readings for science |
| **Gravity well** (exists) | Everything falls in | Crushed at the core | Exotic matter at the edge; rock compressed rich |
| **Pulsar** | A beam sweeps the system on a clock | Timed hull damage | Pulsar readings; the sweep breaks rock and enemies too |
| **Comet** | A fast ice body with a tail | Debris in the tail | Ice and deuterium, cut from a moving target |
| **Subspace rift** | A tear that pulls and spits | Random displacement; things come through | A shortcut to a distant system; rift readings |
| **Tide surge** | The tide arrives in this system, live | Rock and debris churn, the map shifts | Fresh dilithium veins, briefly unclaimed: everyone races for them |
| **Crystal bloom** | The Quiet feeding | The swarm, if you carry crystal | Their shed crystal; first contact, with science |
| **Lantern** | An ancient beacon | Defences that wake up; Romulan watchers | Story fragments, research, a piece of the map |
| **Graveyard** | A field of wrecks from a battle long ago | Mines and automated defences still live | Salvage, old tech, logs |
| **Dark system** | A star gone out; no light, cold | No sensors, no rescue | The Deep's edge; things nobody else has found |

Phenomena feed **science data**, which feeds research, sells to Starfleet,
and unlocks story.

### Frontiers

Regions of the chart have their own rules, like biomes:

- **The Edge**: Guild space, where you start. Lawful, cheap, thin pickings.
- **The Reefs**: dense fields, rich ore, the Quiet, poor sensors.
- **The Wrecking Coast**: Wrecker territory: false beacons, cheap black
  market, bounties on everyone.
- **The Tholian Shallows**: webs and borders; the best exotics; the
  Tholians.
- **The Burning Line**: pulsars and storms: punishing hulls, rich in science.
- **The Deep**: the Lanterns' heart. Costly to reach, nearly impossible to
  leave. The end of the story.

New frontiers open with the tide and with research (the Burning Line needs
radiation shielding; the Deep needs a drive that can cross it).

---

## The ship: research and refits

The three-card refit stays as a quick, in-sortie decision: it is a good
mechanic. What changes is where power comes from and how many directions it
can go.

### Four departments

The Kestrel's crew has four departments, each a research path with its own
tree, its own resources, and above all **its own way of playing**:

**Tactical** (weapons and defence: red)
- Phasers, torpedoes, mines, plasma, the hull arc, shields, armour: all the
  current branches live here.
- *Opens:* bounty contracts, intimidation in hails, the hunter's life, fighting
  nemeses on your terms, escort work.
- *Fed by:* salvage from destroyed ships, faction tech from nemeses,
  credits.

**Engineering** (industry and the ship: gold)
- Mining beam power and heat control, cargo hold, refinery (turn ore into
  ingots aboard, higher value, less space), tractor, drones that mine while
  you fly, damage control, warp drive efficiency (fuel), the drive that
  crosses shallows.
- *Opens:* mining contracts, claims (mark a field as yours), deep-field
  mining, salvage of big wrecks, field repairs for others.
- *Fed by:* ore, salvage, credits.

**Science** (sensors and knowledge: blue)
- Sensor range and resolution, the read on other ships, probes, anomaly
  shielding (radiation, gravity, subspace), xenolinguistics, Lantern
  decoding.
- *Opens:* reading bluffs, safe passage through phenomena, frontier
  regions, first contact with the Quiet, the mystery's deeper endings,
  Starfleet's survey bounties.
- *Fed by:* science data from scans, phenomena, Lanterns.

**Operations** (comms, people and trade: green)
- Comms range, the transporter, cargo concealment, crew quarters (carry
  passengers and refugees), the universal translator, trade computer
  (prices across the chart), diplomatic protocols.
- *Opens:* negotiation and bribery in hails, smuggling, passenger and
  rescue work, trade agreements, hiring escorts, brokering truces.
- *Fed by:* reputation, credits, rescued people, trade.

### How research works

- **Research points** come from each department's own resource (salvage for
  tactical, data for science, and so on), so how you play is what you
  research; there is no single pool.
- **Projects** take time measured in jumps, not seconds; you choose what the
  crew is working on, and it completes while you fly. Starting a project at
  a station with the right parts is faster.
- **Refits** (fitting what you have researched) happen at stations, and
  cost credits and parts. In a sortie, the existing three-card refit
  becomes **field refits**: small, temporary or tuning upgrades dealt when
  your crew finds something (a breakthrough from a scan, a jury-rig from
  salvage).
- **Faction tech** stays: beat a nemesis or befriend a faction and their
  tech enters your tree (Klingon disruptors, Romulan cloak, Tholian snares,
  Borg adaptation, Cardassian compressors), plus local tech: Wrecker false
  beacons, Driftfolk tide sails, Guild refinery licences, and the Quiet's
  crystal resonance.

### Paths cross

The best builds mix two departments, and mixes open things neither does
alone:

| Mix | What opens |
|---|---|
| Science + Operations | Diplomacy with the Quiet; peace-broker endings |
| Engineering + Tactical | Mining under fire; claim defence; the gunboat-hauler |
| Science + Engineering | Deep-field mining inside phenomena; exotic refining |
| Tactical + Operations | Privateering: licensed raids, extortion of your own |
| Science + Tactical | Analysed weaknesses; precision strikes on nemeses |
| Engineering + Operations | The trade empire: refinery, cargo, prices, routes |

### Hulls

The Kestrel remains your ship for the whole voyage (she is the character),
but at major shipyards she can be **rebuilt** around a path: a survey cruiser
refit (science), a heavy hauler refit (engineering), an escort refit
(tactical), a liner refit (operations). A rebuild changes how she flies,
how many slots each department gets, and how she looks. This is where the
old three-hull shakedown can come back, earned rather than picked.

### Crew (a later layer)

Officers, recruited at stations or rescued from wrecks, each with a
department and a trait: a Driftfolk navigator who reads the tide, an
ex-Wrecker who knows the code, a Klingon gunner who will not let you
surrender, a Guild accountant who gets better prices. They add hail options,
small bonuses and their own story beats. Optional in the first version; a
big source of character later.

---

## The voyage and its endings

### Structure

A **voyage** is a campaign: a single Kestrel, from the Edge to an ending.
Target length: six to ten hours for a first voyage, played in sorties of a
few minutes each, saved at every dock.

It runs in three acts, gated by the tide and the mystery rather than by a
clock:

1. **Act I: The Edge.** Halyard Station, the last Guild outpost. Learn to
   mine, sell, dock, hail and jump. The first contract. The first Wrecker
   lantern. The first Lantern ruin. The first nemesis hears your name.
2. **Act II: The Shoals.** The chart opens with the tide. Choose your
   people, your path and your frontier. Nemeses rise. The mystery takes
   shape: the Lanterns are waking, the dilithium is vanishing, the missing
   Starfleet survey team was here first.
3. **Act III: The Deep.** Cross into the Deep with everything you have
   built. The Borg arrive, drawn by the signal. The Lamplighters' last
   Lantern. A choice.

### Endings

The ending is the last decision at the last Lantern, and what it offers
depends on how you played:

- **Relight the Lanterns** (science, with the Quiet's help): the Shoals
  calm and become navigable; dilithium stops vanishing; the frontier closes,
  and the Driftfolk's way of life with it.
- **Douse them** (tactical or engineering): the tide stops for good; the
  remaining dilithium is fixed in place; the Guild and the great powers move
  in to carve it up.
- **Give them to someone**: the Romulans, the Klingons, the Guild, the
  Driftfolk: whoever you have made your ally, with all that follows.
- **Speak for the Quiet** (science and operations, first contact made): the
  Quiet are what is left of the Lamplighters; the Lanterns were their minds.
  Let them decide.
- **Get rich and get out** (any path, enough credits and fuel): leave the
  Shoals before the end, a legend in the Guild's ledgers. A real ending, not
  a failure.

Every ending gets an epilogue in the captain's log: what became of the
people you met, your nemeses, the frontier.

### Death

The Kestrel can be destroyed. Two settings, chosen at the start of a voyage:

- **Captain** (default): destruction ends the sortie, not the voyage. The
  crew escape in pods; the Guild tows the hull back to the last station you
  docked at, and bills you. You lose your cargo, a module or two, and take
  on debt. A nemesis who did it remembers.
- **Ironman**: destruction ends the voyage. The run report, as now, says
  what you built and how it went.

### Between voyages

Meta progression keeps the current rule: **options, not power**. What
carries over is **the Survey Archive**: species met, phenomena catalogued,
Lanterns decoded, endings reached. It unlocks new starting conditions (a
different Starfleet mission brief, a Driftfolk-born captain, an ex-Wrecker
start), new frontiers in the generator, new crew, new hail chains. The
existing logbook and its unlocks fold into the Archive.

---

## A sortie, as it might play

> *Kestrel's log, stardate unknown; the tide charts went bad a week ago.*

You drop out of warp in Corran, a red dwarf system at the edge of the
Reefs. A quarter tank of dilithium. Hold two-thirds full of common ore from
the last system; a Guild contract for twelve tons of heavy ore due at
Halyard in four jumps.

The scan shows: two asteroid fields, one heavy; a Driftfolk convoy at anchor
by the gas giant; an unknown signal on the far side of the star. A little
yellow tick on the threat band: contested.

You fly to the heavy field and start cutting. The mining beam's heat bar
creeps; you ease off just before it fractures, and three tons of iron-grey
ore tumble into the tractor. Two more rocks. Attention ticks up.

A hail. A Wrecker skiff, two of them behind it.

> **"Fine haul, Kestrel. Thirty percent and we'll forget we saw you."**
>
> *Read: three Wrecker skiffs. Light phasers, no torpedoes. Hostile intent:
> certain if refused.*
>
> 1. Pay. (Lose 30% of your ore.)
> 2. Refuse. (Fight.)
> 3. *[Science]* "Your middle ship's running on a cracked plasma coil. Fire
>    one shot and she'll go up." (Call the bluff.)
> 4. *[Standing: Driftfolk, friendly]* "Tell that to the convoy over there.
>    They're mine." (Invoke the Driftfolk.)

You have the standing. The skiffs hesitate, then peel away. One of them
sends a parting message: *"Vash will hear about this."* Vash is the Wrecker
captain whose skiffs you destroyed two systems ago. Her notice of you just
went up a bar.

You dock at the Driftfolk convoy. They will not buy ore but they will trade
fuel for medicine, and one of their elders has a story about the unknown
signal: a Lantern. They will tell you where it is if you carry two of their
young people to Halyard. Passengers take hold space: you would have to sell
some ore cheap, here, to make room.

You take the deal. You visit the Lantern. It is cold, but your scan pulls a
fragment of something: a pattern that matches the tide forecast exactly,
three tides ahead. Science data: plenty. A research breakthrough: the
three-card field refit comes up, and you take the improved sensor read.

Attention is high now; something big is moving out by the star. You do not
wait to see what. Warp out, with eight minutes on the clock, a hold of ore,
two passengers, a piece of the mystery and a Wrecker captain who knows your
name.

---

## What happens to the current game

It stays, as a mode: **Shakedown**. The Kestrel on a fifteen-minute
qualifying run before she is cleared for the Shoals: the survival
roguelite, unchanged, with its score, its records and its balance report.
It is the arcade in the game, the place to learn the flight and the guns,
and its unlocks can feed the Archive.

Almost everything built so far carries into the voyage:

| Built today | In the voyage |
|---|---|
| Flight model, ship, camera, controls | Unchanged |
| Phasers, torpedoes, mines, plasma, arc, shields | The tactical department |
| The three-card refit | Field refits in a sortie |
| Upgrades and branches | Research projects in the tactical tree, plus new trees |
| Rock kinds and formations | Fields in a system, with ore grades |
| Dilithium crystals and the tractor | Dilithium veins; ore and salvage pickups |
| Enemy archetypes, factions, variants, elites | Traffic and hunters in a system |
| Capital ships, telegraphs, salvage tech | Named nemeses |
| The hail (engage / evade) | The comms card, generalised |
| Sector events | Phenomena and system POIs |
| The director | Per-system threat and attention, instead of run time |
| Unlocks and the logbook | The Survey Archive |
| The scripted pilot | Still the balance tool: it learns to mine, trade and answer hails |

---

## How we get there

Each milestone ends in something playable on a phone and balanced by the
pilot, so the game is never broken for long. The simulation rule holds: no
Three.js in `src/sim`, so every new loop runs headless.

**M1. One system.** A sortie as a scene: a system with POIs (two fields, a
station, a signal), no endless waves, the attention gauge driving traffic,
warp out to end. The mining beam and its heat window. Ore in a hold. Dock at
the station to sell. *The question it answers:* is a sortie fun with
combat as an exception?

**M2. The comms card.** Generalise the hail into data-driven cards: trade,
plea, extortion, contract, warning. The read. Path choices stubbed against
fitted systems. A few dozen cards. *The question:* do contacts feel like
decisions?

**M3. The chart.** A handful of systems on a chart, fuel for jumps, fog,
threat bands, prices that differ by station. A save at every dock.
*The question:* does a route of five sorties make a satisfying session?

**M4. Notice and nemeses.** Per-faction notice; warnings, hunters, named
captains who announce, ambush, parley and remember. The existing capital
fights as nemesis fights. *The question:* do bosses feel personal?

**M5. Departments.** The four research trees, research points from play,
station refits, field refits, faction tech. *The question:* do different
paths make different captains?

**M6. The sky.** Phenomena beyond today's events: pulsar, comet, rift,
tide surge, crystal bloom, Lantern, graveyard. Frontier regions with their
own rules. *The question:* is exploring worth the fuel?

**M7. The tide and the story.** Tide cycles reshaping the chart, the three
acts, the Lamplighter mystery, the endings, the epilogue. *The question:*
does the voyage end well?

**M8. The long tail.** Crew, hull rebuilds, more cards, more captains, the
Survey Archive and new starts, the Borg in the Deep.

M1 and M2 together are the **vertical slice**: one system, a station, a
handful of hails. If that slice is fun, the rest is content and scale.

---

## Open questions for you

These are the calls I would like your read on before M1:

1. **Voyage length and death.** Six to ten hours with "Captain" death (debt,
   not game over) as the default: right, or should the voyage be shorter and
   harsher, closer to a roguelite run of an hour or two?
2. **Pause or real time for hails.** I propose pausing for most cards and
   slow motion for urgent ones (an ambush, a declaration mid-fight). Too
   gentle?
3. **How Trek.** I have kept the great powers (they are in the game now) and
   added original local factions so the Shoals is ours. If the game might go
   public beyond the lab, the locals carry the story and the great powers can
   be swapped for original equivalents without changing a mechanic. Keep as
   is, or lean further one way?
4. **The camera at a station.** Docking could be a menu (fast, phone-friendly)
   or a short flown approach with the station in view (more atmosphere).
   I lean menu with a flown arrival.
5. **Crew.** Leave it for M8, or is it core to the fantasy for you?

---

*Next step, if you are happy with the direction: a detailed M1 design (the
sortie, the mining beam, the attention gauge, the station) in DESIGN.md
terms, then build it.*
