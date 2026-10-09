# Situations

The second pass on the Story mode: what is going on in a system, who is in it,
and why the player should care. Numbers are in
[BALANCE-SITUATIONS.md](BALANCE-SITUATIONS.md). The jobs with a goal to play (a
toll to break, a tanker to cripple, a race) are in [MISSIONS.md](MISSIONS.md).

## The problem it solves

Before this pass a system was a kind (mining, port, transit, contested) plus
a few chance calls. The Thren and the Voice were hostile swarms or a line in a
card. Nothing in a system was *happening*, so nothing was remembered.

## Three levels of reading

| Level | Where | Example |
|---|---|---|
| Immediate | the HUD, the call, the objective line | "Bring food to the settlement" |
| Context | the chart line, the call's text, the radio | "A settlement running out of food." |
| Depth | the Archive, flags, later calls | Sightings: what was seen of the unknown, and what people say about it |

Nothing important lives only in the third level. It only deepens what the
first two already said.

## Two stories, one world

Every region asks two questions, one human and one not
(`QUESTIONS` in `content/situations.ts`):

| Region | Human | Unknown |
|---|---|---|
| The Reach | Why is the Continuance still following me? | What was that strange signal? |
| The Marches | Who survived out here? | Why are the Thren near the routes? |
| The Salvage Belt | What was left behind? | Why do some wrecks not behave? |
| The Drift Deep | Who knows the old routes? | Who has been travelling them? |
| The Breaker Yards | What was the Continuance hiding? | What were they taking apart? |
| The Free Ports | Who can I trust? | Who else knows about the old lanes? |
| The Hollows | What does the Continuance already know? | What are the Thren really doing? |
| The Last Lanes | What do I do with the truth? | What are the lanes connected to? |

The alien thread has its own timetable (`ARC`): presence from the first
region, interaction in the middle, understanding late. A row says "region 0,
column 4 plays *Something on the scope*" and every system in that column
plays it, so the player meets it whichever lane they take. Where the timetable
is silent, the dice deal people's situations only; the unknown is never rolled.

The player-facing groups are three, whatever the factions underneath:

- **corporate**: Continuance, Custody, Office, Kellern
- **frontier**: Holdfasts, Drifts, the Gutter, the Dust Traders, independents
- **unknown**: the Thren, the Voice, whatever the old lanes keep

## The Situation layer

A situation is a row (`SITUATIONS`): the prop at its site, the ships there,
the call that opens it, the one goal it asks, what each ending does to the
sortie (an `Outcome`) and to the chart (`ChartFx`). At most one major
situation per system. Quiet systems get far fewer, and a quiet system with one
is still quiet: it has no pursuit.

- `sim/situations.ts` deals them on the chart (its own generator, so a seed's
  systems and lanes do not move), swaps in the Net's tightened variant,
  settles a finished one into the chart.
- `sim/stage.ts` plays one in a sortie: places the site off the straight line
  to the lane mouth (on the way, not in the way), spawns the ships, offers the
  call to the comms desk, runs the goal, ends it.
- `render/site.ts` draws the prop.
- The goal is an ordinary sector event to the HUD (`Encounter` id `scene`, with
  a label), so the objective panel, the compass diamond, the radar and the edge
  pointers needed no new UI.

Goals are four: `call` (the call is the whole thing), `reach` (hold inside the
site with what it asks for), `follow` (stay with a lead ship), `watch` (hold
still and look). Each can be missed (a time limit, losing the lead, being
fired on) and a miss costs, never ends the run.

### A traffic ecology

A ship in a scene is a **ward** (`Alien.ward`): it moves on a script, fires at
nobody, and is ignored by the director, the alert, the fight test, the desk's
"fight" state, aim help and homing. What turns it on the ship is its temper:

| Temper | Does |
|---|---|
| meek | never turns; runs if shot |
| wary | turns only if shot |
| territorial | warns when you come inside its ring, gives seven seconds (longer on an errand it was told about), then turns, and takes its mates with it |
| drawn | comes close to a ship with Cyrite aboard, never at it; turns only if shot |
| hostile | an ordinary hostile (the traps and threats use these) |

Acts are `pass`, `orbit`, `hold`, `follow`, `lead`. Encounter types from the
brief map onto them: passing (`pass`), curious (`orbit`), signal (a relay
and its call), trade (the hauler, the Thren object), warning (territorial
ring), territorial (the seam, the lane), opportunistic (the trap behind a
guide), hostile (threats, the shot-at), mysterious (the pulse, the object).

No Thren or Voice scene starts as an enemy (a test holds that).

## The Net, visible

A situation has a `tight` variant that plays where the Net holds the system:
an empty berth instead of a hauler, a closed dock instead of a short
settlement, a lockdown instead of an inspection. A netted system with nothing
going on may get a sweep (the Net is what is going on). Endings feed the chart
back: a cut relay holds the Net off the neighbours, a finished survey presses
it on.

## Resources, one job each

| Resource | Is for |
|---|---|
| Cyrite | movement: jumps |
| Krail | growth: the refit bay |
| Chits | money and services: food, parts, news, favours, permits |
| Parts | repairs and mechanical help |
| Food | how long you can stay away from the ports |
| Ore | cargo: sell it, or deliver it |

Each is named for its job the first time it matters (in a call's own text, not a
tutorial), and again on hover in the chart. Chits are meant to be spent on
something visible: a hauler's food, news, a permit, a clerk. Ore has a buyer
who pays more than a dock (the hauler) and a delivery (the settlement).

## Calloway, personal

Her offers (`content/calloway.ts`) are chosen from her file and from what
she can see: a hull in a bad way brings *Come alongside* (two plates, the
Custody called off, she knows where you are); having seen the unknown brings
*What did you see?* (the Office's maps for the truth, or chits for a piece of
it); the Net ahead brings *A clean transit stamp*; a long way on, *A name that
is not yours* (a clean record, and you owe her an answer). Taking the name
puts a new choice on the last meeting. Every offer costs something she learns.

## The Archive

The Archive keeps **Sightings**: what was seen of the unknown, and what people
say about it. Theories contradict each other on purpose.

## First half hour

| Minutes | What |
|---|---|
| 0 to 5 | escape from the yards |
| 5 to 10 | Krail, the first refit |
| 10 to 15 | the first port |
| 15 to 20 | the first human optional situation (the hauler, then the settlement) |
| 20 to 25 | a corporate checkpoint |
| 25 to 30 | the first alien moment |

The report in BALANCE-SITUATIONS.md says where the scripted pilot actually met
them.

## Adding one

1. Add a row to `SITUATIONS` (and a call to `SCENE_CARDS` if it asks something).
2. If it should be promised, add an `ARC` row; otherwise give it `weight`.
3. Give every line a German twin in `src/i18n/de/scenes.ts`.
4. `npm run check`, then `npm run pilot:situations`.
