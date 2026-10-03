# WAYWARD

*A design vision for what the game becomes next. Working title.*

Status: proposal, second draft, for review. Nothing here is built yet. The
current game (the fifteen-minute survival run in [DESIGN.md](DESIGN.md))
stays playable and folds into the new one (see
[What happens to the current game](#what-happens-to-the-current-game)).

This draft replaces the first one entirely. Every name is new: no franchise
names, ships, species or terms carry over. The current code's names
(the Kestrel, dilithium, the factions) are placeholders to be renamed when
the work starts.

---

## The pitch

Once there was the Accord: a hundred bright worlds, fabricators that could
make anything, ships that went out to see what was there. That was a long
time ago. Today the Accord's light is kept by **the Continuance**, which
rations it out by loyalty. Your implant scores you; your score feeds you.
The cities still glow, the anthems still play, and the cutters of the
**Custody** patrol every lane.

You were nobody: an ore-cutter on a company moon. Then you found a file you
were never meant to see, and the Custody came for you. Now you have a stolen
hauler, a handful of people who ran with you, a hold with nothing in it, and
the only door out of the Continuance: the old lanes into **the Scatter**,
the outer systems cut off seventy years ago and left to rot.

Out there, nothing is the way the Continuance said. People survived. Some
thrived. Some went strange. Something is reopening the lanes, and the
Continuance is coming through them, right behind you.

Stay one step ahead. Mine what you need. Manage what you have. Make friends
where you can. And when you have to fight for it, fight.

**In a line:** a fugitive's journey across a dangerous, unmapped frontier:
exploring, mining and trading to stay alive, with real-time combat when it
comes to that, and a hunter who never stops following.

**Touchstones** (for tone and structure only): *The Expanse* (grit, physics
you can feel, working people in a big indifferent space, a conspiracy behind
it all); the best of classic exploration science fiction (the hail, the
first contact, the moral choice); cyberpunk (surveillance, implants, a
glossy authoritarian centre and a ragged edge); *FTL* (the chart, the event
card, the pursuing fleet); *Sunless Sea* (a story you uncover a fragment at
a time); *Shadow of Mordor* (enemies who remember you).

---

## Why change, and what survives

The game today is a strong arcade shooter: the flight feels good, the refits
read quickly, the boss fights telegraph well, and the simulation is cleanly
separated from rendering, so a scripted pilot can balance it. But it has one
verb (*survive*) and one clock (*pressure rises until you die*).

The new game keeps the verbs and changes the clock. The flight model, the
guns, the barrel roll, the core release and the boss fights all stay. What
changes is **why you are out there**: you are running, you need to eat, and
the only things that keep you alive are what you can dig out of the rock,
what you can trade for, who will help you, and how well you can fight.

### Design pillars

1. **Always one step ahead.** The hunt is the clock. It is felt on the
   chart, not as a timer bar: the Continuance spreads behind you, and a
   named hunter follows your trail. Lingering has a cost; cleverness buys
   time.
2. **What you have is what you are.** Fuel, food, parts, ore, crystal,
   crew, hull. Every one runs short. Managing them is the real build.
3. **Every contact is a gamble.** Most ships you meet are not enemies, and
   none of them are simply friends. Each hail is a read and a decision.
4. **Everything is new.** The Scatter has had seventy years alone. Every
   system should have something nobody back home has seen.
5. **Earned, and worth defending.** Combat is not the point; it is what
   happens when someone wants what you have built. It should feel like
   protecting something.
6. **Short sorties, long journey.** A complete, satisfying five-minute
   sortie on a phone; a journey across an evening that remembers what you
   did.
7. **Telemetry, not intuition.** The scripted pilot stays. Every loop runs
   headless and gets balanced from numbers.

---

## The world

### How it went wrong

**The Accord** (two hundred years ago to seventy years ago). A union of
worlds linked by **fold lanes**: corridors where a ship's drive could fold
space and cross light years in hours. Fabricators turned feedstock into
anything. Nobody went hungry; plenty went exploring. The Accord's
fabricators and fold drives both ran on one thing: **glass**.

**Glass** (formally *eigenglass*) is a lattice crystal that holds a fold.
It is found in rock, never made. Drives burn it to jump. Fabricators burn
it to build. Weapons and shields run hotter with it. Everyone wants it, and
there is less of it every year.

**The Thinning.** The glass ran short. A civilisation that had forgotten
scarcity met it all at once. Riots, shortages, panics.

**The Severance** (seventy years ago). The fold lanes to the outer colonies
failed in a single night. The official story is a cascade accident: tragic,
unpreventable, mourned every year with candles. The outer colonies, the
Scatter, were written off as lost.

**The Continuance.** The emergency Directorate that took power during the
Thinning, "to continue the Accord's light until the crisis passes". The
crisis has not passed. Fabrication is rationed by **Standing**, a loyalty
score kept in everyone's neural implant and read at every door, every
ration counter, every lane gate. The Directorate deputised the great
fabrication houses, which became the corporations that run everything that
is not the Custody. It looks like the Accord: same flags, same anthems,
brighter neon. It is not the Accord.

**Now.** The outer lanes are reopening, one by one. Nobody in the
Continuance knows why, and the Directorate wants the Scatter's untouched
glass back before anyone finds out what happened to it.

### The file

You found the **Severance file** on a dead Custody officer's drive, in an
ore crusher on Cerro, the company moon where you cut rock. It is the
engineering record of the night the lanes failed. They did not fail. They
were cut, on the Directorate's order, to keep the last of the glass for the
core worlds and let the colonies starve.

The file is why the Custody is after you. It is also the most valuable
thing in the Scatter: proof. Who you give it to, sell it to, or broadcast it
to is the ending.

### The Scatter

The outer systems, cut off for seventy years. No fold lanes until now; no
help; no news. They survived the way people do: badly, cleverly, cruelly,
kindly. The Scatter is not one place but dozens of isolated pockets, each
of which went its own way.

- The lanes are unreliable: they open, close and drift as whatever is
  reopening them works.
- Sensors are poor; charts are rumours; old Accord beacons still broadcast
  seventy-year-old warnings.
- There is glass here: not much, but more than the core has seen in
  decades.

### Tone

Lived-in and working-class. Ships are cramped, patched and loud. Neon and
propaganda at the centre; rust, improvisation and hard bargains at the
edge. People have reasons. The frontier is not evil, just indifferent, and
the Continuance is evil mostly in the polite, procedural way: forms,
scores, curfews, and very occasionally a cutter that opens fire on a
refugee hauler because the paperwork said to. Humour lives in the hails.
Hope lives in the people who help you anyway.

---

## The ship and her people

### The ship

You steal a Continuance ore hauler: **Obedience-class**, a blunt, ugly,
reliable mining tug with a cargo spine, a cutting laser, a single point-
defence turret and a fold drive rated for short hops. The Continuance names
its ships after civic virtues: *Obedience*, *Diligence*, *Gratitude*,
*Patience*.

The first thing you do in the Scatter is scratch the name off the hull and
paint a new one. The player names her. The suggested name is ***Wayward***,
and it is the game's title because it is what she is.

She is the character. You keep her all journey and she becomes something
else as you rebuild her: a gunboat, a prospector, a ghost, a trader (see
[The ship: four shops](#the-ship-four-shops)).

### You

An ore-cutter from Cerro with a Standing implant you cannot remove (yet),
a price on your head and the file. The player chooses a background at the
start (cutter, Custody deserter, corporate tech, smuggler), each with its
own opening contacts, a skill and a problem.

### The crew

A handful who ran with you, more who join along the way. Each has a station
(**helm, guns, rig, signals, contacts**), a trait, a past and a few story
beats. They open options in hails and on the ship, and they cost food,
space and sometimes trouble. A crew member with Continuance family might
want to send a message home, which is exactly how they track you.

Crew is lighter than a full RPG: a name, a portrait, a station, one or two
traits, a loyalty that moves. But it is core to the fantasy: you are not
just running for yourself.

---

## Who is out there

### The Continuance

The empire at your back. Always polite, always procedural, always closer.

- **The Custody**: the Continuance's navy and police. Pickets, cutters,
  interdictors, carriers. They scan transponders, run checkpoints and
  follow trails.
- **The Quiet Office**: the Custody's intelligence arm. Cloaked ships,
  informers in every port, bounties posted through third parties. They
  never hail first.
- **The Houses**: the deputised fabrication corporations (Halvard-Okoye,
  Meridian Fabrication, the Kessel-Dray Combine). In the Scatter ahead of
  the Custody, buying claims and stations. They will trade with you, and
  sell you out the moment it pays.

### The hunter

The Custody assigns your case to **Prefect Idris Calloway**: patient,
courteous, relentless, and convinced she is the hero of this story. She
never stops following your trail. She talks to you: a hail from three
systems back, a message left at a station you just docked at, a family
photograph of one of your crew sent without comment.

Calloway is the game's recurring antagonist, and a person, not a timer.
She can be fought, misled, outrun for a while, bargained with, and in one
ending, turned.

### The Scatter

**Holdfasts.** The settlements that survived: domed rocks, spun habitats,
ice moons. Each is its own small nation with its own rules: a mining
democracy, a theocracy that worships the old Accord, a corporate remnant
still issuing scrip for a company that died seventy years ago. Most are
suspicious of anyone from the core; all of them need something.

**The Drift.** Ship-dwelling nomads who never settled after the Severance.
Convoys of patched ships, generations aboard. They know the lanes better
than anyone and trust nobody with an implant. Win them over and they are
the best friends in the Scatter.

**Gutter crews.** Pirates, wreckers and salvagers who gut ships for parts.
Fast, aggressive, loud; they extort before they kill, and some can be
bargained with. Each crew has a captain, and the captains have names.

**The Choir.** Machine minds. The Accord's fabricator control systems,
abandoned in the Scatter, woke up during the Severance and kept building.
Now they run whole systems of automated mines and foundries, speak in
overlapping voices, and trade in ways nobody fully understands. They adapt
to whatever you hit them with. Some Holdfasts worship them; some fight them.
The Choir knows who is reopening the lanes.

**The Pale.** Not people. Something that lives in folded space, seen only
where the lanes are thin: drifting lattices of light that spin webs across
routes and swarm ships carrying glass. They have been in the Scatter longer
than humans. They are the mystery.

### Standing with each of them

Every faction keeps a **standing** with you, from hostile to trusted, moved
by what you do: who you trade with, whose ships you destroy, whose calls you
answer, whose jobs you take, whose secrets you sell. Standing changes prices,
which hails you get, who lets you dock, and whether their captains come to
talk or to kill. Standings pull against each other: the Holdfast that loves
you for breaking a Gutter crew does not know the crew's captain was the
Drift elder's son.

---

## The three scales of play

```
  MOMENT   (seconds)   fly · shoot · cut rock · dodge · tractor · scan · spoof
     │
  SORTIE   (3–8 min)   drop into a system → scan → choose what to visit →
     │                 mine / salvage / trade / fight / answer hails →
     │                 fold out before the system turns on you
     │
  JOURNEY  (hours)     the chart · the hunt · fuel, food, parts, cargo ·
                       crew · the ship's rebuild · standing · nemeses ·
                       the file · the ending
```

### The moment

The game as it plays today, widened. Flight, guns, the roll and the core
release stay. New verbs join them:

- **Scan**: a sensor pulse reveals what is near (rock composition, a ship's
  loadout and intent, a phenomenon's readings) and reveals you too.
- **Cut**: a mining laser distinct from the guns. Hold it on a rock; keep
  the cut inside its heat window and the ore comes out clean; overheat and
  the rock fractures and scatters; volatile ore can go off. Blasting rock
  with the guns still works, quickly, and wastes most of what is in it.
- **Tractor**: pull in ore, glass, salvage, pods, people.
- **Spoof** (with the signals shop): flip the transponder to a stolen
  identity, jam a picket's scan, drop a decoy.
- **Hail**: talk to anything in range that will listen.

### The sortie: a system

A **sortie** is one star system: one 3D scene, like the current play space,
with a shape and a purpose instead of endless waves.

When you fold in you see a handful of **points of interest**, some known,
some just "unresolved contact":

- **Fields** to mine, of different ore grades; rare fields with glass seams.
- **Ports**: Holdfast stations, Drift convoys at anchor, Gutter fences,
  Choir foundries, Continuance checkpoints. Dock to trade, repair, rebuild,
  recruit, take jobs.
- **Phenomena** (see [The sky](#the-sky)).
- **Wrecks**: salvage, logs, traps.
- **Accord ruins**: lane relays, abandoned stations, old beacons. Pieces of
  the story.
- **Unresolved contacts**: a scan turns one into any of the above, or into a
  ship.

Traffic moves through the system: haulers, Holdfast patrols, prospectors,
Gutter crews, Choir drones, Custody pickets. Some of it will hail you.

**Heat.** Every system has a **heat** gauge: how much attention you have
drawn here. Mining, fighting, scanning, docking under your own name and time
all raise it. As it rises the system closes in: Gutter crews smell a full
hold, the local patrol comes asking questions, a Custody informer sends a
message. It is the current game's pressure clock, made local and readable:
when it gets hot, fold out. It is what keeps a sortie short and makes combat
a consequence rather than a constant.

A sortie ends when you **fold out** to a neighbouring system, or **dock**
(the save point).

### The journey: the chart and the hunt

The chart is the strategic layer: systems joined by lanes, from the
Continuance's edge out into the Scatter.

- **Glass for every jump.** Short hops are cheap; thin lanes cost more;
  the far Scatter costs a lot. Running dry leaves you crawling on thrusters
  to the nearest port and broadcasting for help, which is a hail you may not
  enjoy.
- **Supplies.** Food and air for the crew, parts for the ship. Both run
  down with each jump and each day; both can be bought, traded, salvaged or
  grown (with the right rebuild).
- **Fog.** Unvisited systems show only what your sensors or your sources say:
  a class, a rumour, a danger estimate. Charts, bought or scanned, lift it.
- **Danger.** Each system shows who holds it and how they feel about you.

**The hunt** is the clock of the whole journey, and it works in two ways.

**The front.** The Continuance spreads across the chart behind you, a few
systems per day of travel. A system the front reaches becomes **lit**:
checkpoints at the lane mouths, pickets on patrol, ports scanning implants,
prices up, friends gone quiet. Lit systems can still be crossed, at a cost
and a risk. The front does not move evenly: it follows glass and lanes, and
the Scatter can **push it back** (help a Holdfast hold its lanes, arm the
Drift, break a Custody supply line, and the front stalls there).

**The trail.** Calloway follows *you*, not the front. Every jump leaves a
trail; she is always some number of jumps behind, shown on the chart as a
shadow. Lingering lets her close. You can lay **false trails** (a decoy
transponder fired down a different lane), **go dark** (cold running, slow,
no scans, no docking), **pay** a Drift convoy to run interference, or
**turn and fight**. When she catches you, it is a boss encounter; when you
beat her, she withdraws, rebuilds and comes back harder, never quite
gone.

The chart is where long decisions live: where to sell, where to refuel,
which job to chase, which friend to stop for, whether to push into an
unmapped system with half a tank and Calloway two jumps back.

---

## Keeping alive: the economy

### Glass, rare and precious

Glass is not something that falls out of every rock any more. It is the most
precious thing you can carry:

- **Fuel** for every fold.
- **Power** for the core release, the best weapons and the top tier of
  rebuilds.
- **Currency** everyone accepts.

It comes from **glass seams** in a few fields (rare, contested), from
**capital ships and nemeses**, from **deep phenomena**, from **trade**, and
now and then from a lucky rock. A hold full of it makes you a target; the
Pale can smell it.

### Ore, salvage, goods, data

The hold has a few slots to start, more with rebuilds. What goes in it:

| Cargo | Where | Value | Note |
|---|---|---|---|
| Common ore | any rock | low | the bread and butter |
| Rich ore | veined rock (in the game now) | medium | |
| Heavy ore | dense rock (in the game now) | medium | slow to cut |
| Volatile ore | volatile rock (in the game now) | high | goes off if overheated, or if you take a hit carrying it |
| Exotics | phenomena, deep fields | very high | each wanted by someone particular |
| Salvage | wrecks, kills | varies | parts for your own ship, or for sale |
| Glass | seams, bosses | precious | also fuel |
| Goods | ports | varies | food, medicine, machine parts, implants, weapons, contraband |
| Data | scans, ruins, contacts | varies | charts, readings, secrets; weighs nothing |
| People | rescues, fares | varies | passengers, refugees, prisoners; they eat |

### Markets and money

Each port prices goods by what it makes, what it needs, who runs it, and
events: a siege raises the price of food and weapons; a fresh seam crashes
ore prices next door; the front arriving makes everything dear. Prices show
on the chart once you have been there or bought the data, so trade routes
are discovered, not given.

Not everyone buys everything. The Holdfasts barter; the Houses pay in House
scrip; the Choir takes ore and pays in fabrication; the Gutter fence takes
anything at half its worth. **Chits**, the Scatter's common currency, are
honoured almost everywhere outside a lit system.

Debt is possible: Houses and some Holdfasts lend. They collect.

---

## The hail: every contact is a gamble

This is what turns a shooter into a frontier. Ships hail you; you hail them;
ports broadcast; calls for help come in. Each contact is a short **comms
card**: a portrait, a voice, a situation and two to four choices. The game
pauses for most of them (as it does for refits now) and slows for urgent
ones.

### Kinds of contact

| Contact | What happens | Example |
|---|---|---|
| **Trade** | Buy or sell | "That's Cerro ore in your hold, I can smell it. I'll take the heavy at twelve a ton. Saves you a jump." |
| **Plea** | Someone asks for help | "Air scrubbers are gone. We've got kids. Please." Real, or a Gutter lure? |
| **Job** | Someone offers work | Haul, escort, salvage, survey, rescue, smuggle, bounty |
| **Shakedown** | Pay or fight | "Thirty percent of your hold and you fold out whole. That's the toll." |
| **Warning** | A claim | "This is Holdfast Teague. You are in our lane. You have sixty seconds." |
| **Declaration** | A captain announces intent | "You burned eleven of my skiffs. I'm coming for you. Three jumps. Get ready." |
| **Checkpoint** | The Continuance asks for your papers | "Transponder mismatch. Cut your drive and prepare to be boarded." |
| **Ambush** | No hail at all | A decloak, a volley, a fight |
| **Rumour** | Information, free or for a price | "There's a seam past Orrin nobody's cut since the lanes came back. Forty chits." |
| **Message** | Calloway, or someone from home | "Your mother is well, Mr Osei. She asks after you. So do I." |
| **First contact** | Something new | The Choir, the Pale, a Holdfast no one has heard from in seventy years |

### Reading the other side

Before you answer, your sensors give you a **read**: their strength
against yours, their loadout, what they are carrying, and an **intent**
estimate ("hostile intent: likely"). How good the read is depends on your
signals rebuilds and your crew. A bad read says "unknown". A good read
catches the bluff: the toll-taker with no torpedoes, the plea from a ship
with no life signs.

### Choices that depend on who you are

Every card has the plain choices (agree, refuse, fight, run) and **earned
choices** that appear only if your ship, crew or standing allows them:

- **Guns**: *intimidate* ("Count my launch tubes and say that again.")
- **Signals**: *call the bluff* ("Your reactor's cold. You're a decoy."),
  *spoof* the checkpoint with a stolen identity, *hack* the drone
- **Contacts**: *negotiate*, *bribe*, *counter-offer*, *hide* the
  passengers in the smuggling hold
- **Rig**: *offer repairs* for parts and goodwill, *jettison* a decoy pod
- **Crew**: your ex-Custody gunner knows this picket's captain; your Drift
  pilot speaks the cant
- **Standing**: *invoke* the Holdfast, *call in* a Drift debt, *name* the
  Gutter captain you spared

Most cards have a peaceful way through for someone, and a violent one for
anyone.

### Cards are data

Like upgrades now: a trigger (who, where, what state), text with slots, and
choices with requirements and outcomes from a small vocabulary (cargo,
chits, glass, supplies, standing, crew, heat, trail; start a fight, spawn
ships, set a flag, schedule a follow-up, give a job). A writer can add a
hundred without touching the simulation. Follow-ups make it alive: the
family you saved is waiting at a port three systems on with a gift; the
toll you paid brings the same crew back asking for more; the checkpoint you
spoofed reports a discrepancy two days later, and Calloway's shadow on the
chart jumps a system closer.

---

## Fighting for what you have

Combat stays real-time, skill-based and fun. It stops being constant.

### Frequency and rhythm

A typical sortie has no fight, or one, or two, and most of them follow a
choice: you took a bounty, refused a toll, cut rock in a claimed field,
stayed too long, ran a checkpoint. Quiet systems are genuinely quiet. Lit
and lawless ones are not. A target to start from: a quarter to a third of
play time in combat, the rest flying, mining, trading and talking.

### What you are protecting

A full hold, a crew, a ship you rebuilt, the file. Losing a fight costs
real things (see [When it goes wrong](#when-it-goes-wrong)), so fights feel
like defence of something earned, and running away is a real and
respectable option.

### Rock

Rock stays destructible and still splits large to medium to small. Now you
usually want to cut it, not shoot it, because cut rock gives ore and shot
rock gives scraps. Volatile rock is a mining puzzle and a weapon (shoot it
next to an enemy).

### Notice, hunters and nemeses

Every faction keeps a **notice** of you: how much harm you have done them.
Burn their skiffs and pickets and it climbs. At thresholds they respond:

1. **A warning**: "That's the third of ours. Stop."
2. **A hunter**: a heavier ship sent after you, sometimes announced,
   sometimes not.
3. **A named captain**: a capital ship with a name, a face and a grudge.
   The boss.

Named captains are **nemeses**, and they persist:

- They **announce or ambush**, by personality. A Gutter captain declares the
  hunt and gives you jumps to prepare. The Quiet Office never announces. A
  House enforcer might send an offer first: "Sign over your claim and we'll
  forget the skiffs."
- They **do not always fight** the first time. A captain may hail, scan you,
  decide you are not worth it yet (or are worth more alive), and leave. The
  next meeting is coloured by the first.
- They **remember**. Beat one and they may escape, scarred, angrier and
  refitted. Lose to one and they may spare you, take your hold, and gloat
  next time. Bribe one and you have a contact. Spare one and they may turn up
  when you need help.
- They are **finite**: a handful per faction per journey, so each one
  matters.

The existing capital-ship fights (three phases, telegraphs, signature
attacks, salvaged tech) become these nemesis fights, their core unchanged.
The difference is the build-up: you know who she is, why she is coming and
what she wants. Calloway is the nemesis of nemeses.

### When it goes wrong

When the last plate is about to go, a fight can end three ways:
**surrender** (they take cargo, maybe a module, maybe a crew member),
**emergency fold** (escape, at a large glass cost and a long trail), or
**destruction**. Gutters and Houses take surrenders; the Pale does not; the
Custody takes surrenders only once, because the second time they take you.

---

## The sky

Phenomena are where exploring lives: each is a place to go, something to
risk and something to bring back. The current sector events (ion storm,
nebula, gravity well, rich field, derelict, distress call, convoy) all fold
in.

| Phenomenon | In play | The risk | The reward |
|---|---|---|---|
| **Dust shroud** (the nebula now) | Sensors fail, fog | Ambushes; no reads on hails | A place to hide from the hunt; the core charges faster |
| **Arc storm** (the ion storm now) | Lightning on telegraphed circles | Hull damage | Near misses charge double; storm data |
| **Gravity well** (in the game now) | Everything falls in | Crushed at the core | Exotics at the edge; rock compressed rich |
| **Pulsar** | A beam sweeps the system on a clock | Timed damage | Readings; the sweep breaks rock and enemies too |
| **Comet** | A fast ice body with a tail | Debris | Ice for air and water: supplies, cut from a moving target |
| **Lane tear** | A torn fold that pulls and spits | Displacement; things come through | A shortcut far across the chart, off Calloway's trail |
| **Seam bloom** | The lanes shifting live in this system | Rock churns, debris everywhere | Fresh glass, briefly unclaimed: everyone races for it |
| **Pale web** | The Pale feeding | The swarm, if you carry glass | Their shed lattice; first contact, with signals and patience |
| **Choir foundry** | A machine-run industrial system | Defences that adapt | Trade with the Choir; salvage; fabrication |
| **Severance graveyard** | The fleet that was stranded the night the lanes were cut | Old mines and automated guns, still live | Salvage, Accord tech, the file's missing pages |
| **Dead lane** | A lane that goes nowhere, or used to | No sensors, no rescue | The far Scatter; things nobody else has found |

Phenomena give **data**: it sells, it feeds rebuilds, and it opens the story.

### Regions

The chart has regions with their own rules:

- **The Rim**: the Continuance's edge, where you start. Lit, watched,
  cheap; nothing to stay for.
- **The Breakers**: the first Scatter systems; dense fields, Gutter crews,
  ports that ask no questions.
- **The Holdfast Reach**: the settled heart of the Scatter; politics,
  markets, people who need things.
- **The Foundry Belt**: Choir territory; strange trade, adaptive defences,
  the best fabrication.
- **The Pale Shallows**: thin lanes, webs and swarms; the richest glass and
  the worst risk.
- **The Far Dark**: dead lanes and the source of whatever is reopening
  them. The end of the story.

New regions open as you push outwards and as you rebuild (the Pale Shallows
need lattice shielding; the Far Dark needs a drive that can cross a dead
lane).

---

## The ship: four shops

The current three-card refit stays as a quick, in-sortie decision; it is a
good mechanic. What changes is where power comes from and how many
directions it can go.

The *Wayward* has four **shops**, each a line of rebuilds with its own
resource and above all **its own way of playing**:

**Guns** (red) — weapons and armour
- Every current weapon branch lives here: beams, torpedoes, mines, the
  plasma trail, the hull arc, shields, plates.
- *Opens:* bounty jobs, intimidation in hails, standing your ground against
  hunters, escort work, breaking checkpoints by force.
- *Fed by:* salvage from kills, nemesis tech, chits.

**Rig** (amber) — mining and the hull
- Cutting laser power and heat control, the hold, an onboard refinery
  (ore to ingots: more value, less space), the tractor, mining drones,
  hydroponics (grow food), damage control, drive efficiency (less glass per
  jump), the drive that crosses thin and dead lanes.
- *Opens:* mining jobs, claims (mark a field as yours), deep-field mining,
  big salvage, field repairs for others, staying out longer between ports.
- *Fed by:* ore, salvage, chits.

**Signals** (cyan) — sensors, intrusion and ghosts
- Sensor range and resolution, the read, probes, stolen identities,
  transponder spoofing, jamming, decoys, intrusion (hack drones and
  turrets), cold running, implant work (in the end, cutting out your own
  Standing implant).
- *Opens:* calling bluffs, slipping checkpoints, false trails, safe passage
  through phenomena, first contact with the Choir and the Pale, the file's
  hidden layers.
- *Fed by:* data from scans, phenomena, ruins, intrusions.

**Contacts** (green) — people and trade
- Comms range, the smuggling hold, passenger berths, the trade computer
  (prices across the chart), translators, a crew lounge (loyalty), the
  broker's book (who owes you).
- *Opens:* negotiation and bribery, smuggling, fares and rescues, trade
  agreements, hired escorts, recruiting, uniting the Scatter.
- *Fed by:* standing, chits, rescued people, trade.

### How rebuilding works

- **Parts** come from each shop's own resource (salvage for guns, data for
  signals, and so on), so how you play is what you rebuild; there is no
  single pool.
- **Projects** take jumps, not seconds: you choose what the crew is working
  on and it completes while you fly. Faster at a port with the right yard.
- **Rebuilds** (fitting a finished project) happen at ports, for chits and
  parts. In a sortie, the existing three-card refit becomes **field
  refits**: small or temporary gains dealt when the crew finds something (a
  breakthrough from a scan, a jury-rig from salvage).
- **Captured tech**: beat a nemesis or win a faction over and their tech
  joins your options: Gutter rams, Quiet Office cloaks, House shield
  harmonics, Choir adaptive plating, Pale lattice snares, Drift sails that
  ride a lane on almost no glass.

### Shops cross

The best ships mix two shops, and mixes open things neither does alone:

| Mix | What opens |
|---|---|
| Signals + Contacts | Talking to the Pale; turning Calloway's informers |
| Rig + Guns | Mining under fire; holding a claim; the armed prospector |
| Signals + Rig | Cutting glass inside phenomena; refining exotics |
| Guns + Contacts | Privateering: licensed raids on House shipping |
| Signals + Guns | Analysed weak points; ambushing the hunters |
| Rig + Contacts | A trading house of your own: refinery, hold, routes |

### The rebuild you can see

At the major yards she can be rebuilt around a shop: a gunboat spine, a
prospector rig, a ghost hull, a liner. It changes how she flies, how many
modules each shop gets and how she looks. This is where the old three-hull
spec sheet can return, earned rather than picked.

---

## The journey and its endings

### Structure

A **journey** is the campaign: one ship, from the Rim to an ending. Target
for a first journey: six to ten hours, in sorties of a few minutes, saved at
every dock.

It runs in three acts, moved on by the hunt and the file rather than a clock:

1. **Act I: The Breakout.** The opening is a run: the Custody locking down
   Cerro, the hauler stolen, a gauntlet across the home system to the old
   lane mouth with the whole system coming for you (this is the current game,
   see below). Then the Breakers: the first port, the first sale, the first
   hail that is not what it seems, renaming the ship, the first time
   Calloway speaks.
2. **Act II: The Scatter.** The chart opens. Choose your friends, your
   shops, your road. The front advances; nemeses rise; the crew grows. The
   file's missing pages are out here, in a graveyard, a Choir archive, a
   Holdfast's memorial. Something is reopening the lanes from the far side,
   and the Pale are getting louder.
3. **Act III: The Far Dark.** Cross the dead lanes with everything you have
   built. Learn what is reopening the lanes and why. Calloway's last
   approach, with everything the Continuance can spare behind her. A choice.

### Endings

The ending is what you do with the file and with what you learn in the Far
Dark, and what you can choose depends on how you played:

- **Broadcast it.** Through a reopened lane, into the core. The Continuance
  shakes; the Scatter rises; nothing is safe for a while. Needs signals and
  the lane.
- **Rally the Scatter.** Unite the Holdfasts, the Drift and whoever else you
  have won, and stop the front at the lanes. Needs contacts and standing.
- **Sell it.** To a House, for a fortune and a new name. The Continuance
  changes owners, not character.
- **Bargain with it.** Trade the file to Calloway for amnesty for your crew.
  She keeps her word. The Directorate does not.
- **Close the door.** Help whatever is reopening the lanes shut them again,
  for good. The Scatter stays free and alone.
- **Disappear.** Fold beyond the Far Dark with a full hold and a loyal crew,
  and never come back. A real ending, not a failure.

Each ending gets an epilogue: what became of the crew, the friends, the
nemeses, the Scatter, and Calloway.

### Death

The *Wayward* can be destroyed. Two settings, chosen at the start:

- **Fugitive** (default): destruction ends the sortie, not the journey. The
  crew get to the pods; a Drift convoy or a Holdfast tug drags what is left
  to the last port you docked at. You lose your cargo, a module or two,
  maybe a crew member, and you owe someone. Calloway's trail jumps closer.
  The nemesis who did it remembers.
- **Last Run**: destruction ends the journey. The run report, as now, says
  what you built and how far you got.

### Between journeys

Progression between journeys keeps the current rule: **options, not
power**. What carries over is **the Archive**: people met, phenomena
catalogued, ruins decoded, endings reached. It opens new backgrounds, new
crew, new regions in the generator, new hail chains. The current logbook and
its unlocks fold into the Archive.

---

## A sortie, as it might play

> *Day 31 since Cerro. Calloway: two jumps back.*

You fold into Orrin, a red dwarf at the edge of the Breakers. A quarter tank
of glass. Four days of food for six people. The hold two-thirds full of
common ore from the last system, and a job: twelve tons of heavy ore for a
Holdfast foundry, four jumps away.

The scan shows two fields, one heavy; a Drift convoy at anchor by the gas
giant; an unresolved contact on the far side of the star. Heat: low. On the
chart, a red shadow two systems behind you.

You fly to the heavy field and start cutting. The heat bar creeps; you ease
off just before the rock fractures, and three tons of grey ore tumble into
the tractor. Two more rocks. Heat ticks up.

A hail. A Gutter skiff, two more behind it.

> **"Fine haul. Thirty percent and you fold out whole."**
>
> *Read: three Gutter skiffs. Light beams, no torpedoes. Hostile intent:
> certain if refused.*
>
> 1. Pay. (Lose 30% of the ore.)
> 2. Refuse. (Fight.)
> 3. *[Signals]* "Your middle ship's running a cracked coil. One shot and
>    she goes up." (Call the bluff.)
> 4. *[Standing: Drift, friendly]* "Tell that to the convoy over there.
>    They're with me."

You have the standing. The skiffs hesitate, then peel away. One sends a
parting message: *"Vash will hear about this."* Vash is the Gutter captain
whose skiffs you burned two systems ago. Her notice of you goes up a bar.

You dock with the Drift. They will not buy ore, but they will trade glass
for medicine, and an elder knows what the unresolved contact is: a
Severance wreck, a Continuance cruiser stranded the night the lanes were
cut. They will tell you where, if you carry two of their young people to the
foundry. Passengers take hold space; you would have to sell ore cheap, here,
to fit them in.

You take it. The wreck's automated guns are still live. You thread them,
cut into the hull, and pull a data core: a page of the file, and a name you
did not expect. Your signals officer works it: the field refit comes up; you
take the better read.

A message, routed through the Drift relay:

> **"You stopped to help again. It's why I'll find you."**
> *— I. Calloway*

The shadow on the chart is one system back. Heat is high, and something big
is moving out by the star. You fold out with eight minutes on the clock, a
hold of ore, two passengers, a page of the truth and a Gutter captain who
knows your name.

---

## What happens to the current game

It becomes **the Breakout**: the opening of the journey and an arcade mode
of its own. The home system in lockdown, the stolen hauler, wave after wave
of Custody coming in, refits from the rock you crack on the way, a capital
ship hailing at the lane mouth. Survive long enough to fold, and the journey
begins. As a standalone mode it keeps its score, its records and its
balance report, and its unlocks feed the Archive.

Almost everything built so far carries into the journey:

| Built today | In the journey |
|---|---|
| Flight model, camera, controls | Unchanged |
| The Kestrel | The stolen Obedience-class hauler, renamed by the player |
| Phasers, torpedoes, mines, plasma, the arc, shields | The guns shop (renamed) |
| The three-card refit | Field refits in a sortie |
| Upgrades and branches | Projects in the guns shop, plus three new shops |
| Rock kinds and formations | Fields in a system, with ore grades |
| Dilithium and the tractor | Glass seams; ore, salvage and supply pickups |
| Enemy archetypes, factions, variants, elites | Traffic and hunters, mapped to the new factions (below) |
| Capital ships, telegraphs, salvaged tech | Named nemeses and captured tech |
| The hail (engage or evade) | The comms card, generalised |
| Sector events | Phenomena and points of interest |
| The director | Per-system heat and the hunt, instead of run time |
| Unlocks and the logbook | The Archive |
| The scripted pilot | Still the balance tool: it learns to mine, trade, answer hails and run |

The current factions map on by how they fight, so the AI and the boss
patterns carry over:

| Fights today like | Becomes |
|---|---|
| Fast, aggressive, fires more | Gutter crews |
| Long range, wheels and holds off | The Custody |
| Cloaks, decloaks to strike | The Quiet Office |
| Adapts to what hits it | The Choir |
| Webs | The Pale |

---

## How we get there

Each milestone ends in something playable on a phone and balanced by the
pilot. The simulation rule holds: no Three.js in `src/sim`, so every new loop
runs headless.

**M0. The rename.** New names through the code, UI and docs; the Breakout
framing on the current game. Small, and it makes everything after it feel
like the new game.

**M1. One system.** A sortie as a scene: two fields, a port, an unresolved
contact, no endless waves, heat driving traffic, fold out to end. The
cutting laser and its heat window. Ore in a hold. Dock to sell. *Answers:* is
a sortie fun with combat as the exception?

**M2. The comms card.** The hail generalised into data-driven cards: trade,
plea, shakedown, job, warning, checkpoint. The read. Earned choices stubbed
against fitted modules. A few dozen cards. *Answers:* do contacts feel like
gambles?

**M3. The chart and the hunt.** A dozen systems, glass for jumps, supplies,
fog, prices by port, the front, Calloway's trail. A save at every dock.
*Answers:* does staying ahead across five sorties make a gripping session?

**M4. Notice and nemeses.** Per-faction notice; warnings, hunters, named
captains who announce, ambush, parley and remember; Calloway as a boss. The
current capital fights as nemesis fights. *Answers:* do bosses feel personal?

**M5. The shops.** Four lines of rebuilds, parts from play, port rebuilds,
field refits, captured tech. *Answers:* do different roads make different
ships?

**M6. Crew.** Recruits, stations, traits, loyalty, their hail options and
story beats. *Answers:* does it feel like running for someone?

**M7. The sky.** Phenomena beyond today's events, and the regions.
*Answers:* is exploring worth the glass?

**M8. The story.** The three acts, the file's pages, the Far Dark, the
endings and epilogues.

**M9. The long tail.** Hull rebuilds, more cards, more captains, more
regions, the Archive and its backgrounds.

M1 and M2 are the **vertical slice**: one system, a port and a handful of
hails. If that slice is fun, the rest is content and scale.

---

## Open questions for you

1. **Names.** *Wayward*, the Continuance, the Custody, the Scatter, glass,
   Calloway: closer? Which still miss?
2. **Journey length and death.** Six to ten hours, with "Fugitive" death
   (lose cargo and owe someone, keep going) as the default: right, or
   shorter and harsher, a run of an hour or two?
3. **How hard the hunt pushes.** A front you can stall plus one hunter on
   your trail: is that the right amount of breath on your neck, or should the
   pressure be stronger (FTL-style, always moving) or gentler?
4. **Crew weight.** I have made crew core rather than a late extra, because
   running *for someone* is part of the fantasy. Agree?
5. **Pause or real time for hails.** Pause for most cards, slow motion for
   urgent ones. Too gentle?

---

*Next step, once the direction is right: a detailed M1 design (the sortie,
the cutting laser, heat, the port) in DESIGN.md terms, then build it.*
