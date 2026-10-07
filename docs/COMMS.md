# Story communications

How the Story mode talks to the player: what may interrupt, when, and how loud.
The code is `src/sim/desk.ts` (the rules), `src/content/chatter.ts` (radio
lines), `weightOf` in `src/sim/comms.ts` (a card's weight), `World.stepComms`
(the one place cards are offered) and `src/ui/radio.ts` (the light weights on
screen). Numbers live in `DESK`. The measured effect is in
[BALANCE-COMMS.md](BALANCE-COMMS.md).

## What was wrong

Eight triggers in `World` each opened a card on their own clock: follow-ups, the
port's approach, a chance card every 30 to 46 seconds (the main offender), Calloway,
her offer, the story beat, a named captain, the lane mouth. None knew about the
others, and all of them were a full panel that stops the world. A pilot flying
whole journeys met one every 34 seconds, 98% of the gaps under two minutes.
Only chance cards looked at the sky (and only at more than one hostile); the rest
opened over a fight, over mining, or on the jump.

## The weights

| Weight | Looks like | World | What it is |
| --- | --- | --- | --- |
| Major | the full panel | waits | a story beat, Calloway, a captain, a blockade or toll, a shakedown, anything with more than three answers |
| Important | a small call, amber PRIORITY | runs on | a warning, a plea, a distress call, a follow-up |
| Routine | the same call, cyan and plainer | runs on | a job, a trade, a rumour |
| Ambient | one subtitle on the radio | runs on | chatter: no answer, seven seconds |

A card says its own weight with `tier`, or takes the default from its kind and
trigger (`weightOf`). Calls answer with Y (first), U (a middle one), N (the last),
a tap, or a click of the right stick on a pad; unanswered, they lapse after 22 or
30 seconds and nothing happens. Opening a major card, or docking, closes a call.

## The rules (the desk)

Every card is offered to the desk; nothing opens itself.

1. **Only a free sky hears a card.** Busy is fighting (a hostile within 90 units or a
   capital ship on the board), cutting rock, flying tight past rock at speed, or on a
   jump, a dock or a blockade. Major, important and routine wait for free; ambient
   waits only for a fight, a jump or a dock.
2. **A breath after.** Four to twelve seconds after the last hostile, three after the
   cutter stops. A card that became available mid-fight arrives after it.
3. **Spacing.** A card needs 180 (major), 150 (important) or 220 (routine) seconds
   since the last one closed. The clock runs on across systems (`Carry.hush`), so
   a short sortie does not reset it.
4. **Heaviest first.** The queue plays the heaviest weight, and nothing lighter
   while a heavier one waits. Routine cards go stale after 120 s, important after
   300 s; major never.
5. **Chance cards need an opening, not a timer.** Only about four sorties in ten
   (more in busy systems) have one, and it comes after a fight won, a hold nearly
   full, or a long quiet (170 s). One at most a sortie.
6. **Place events keep their place.** A blockade checkpoint, Calloway's last
   meeting and the port's scan open on arrival, as before; an open lane's toll is
   a roll (30%) and respects the spacing.
7. **The radio.** At most two lines a sortie, 60 s apart, on a fight won, a hold
   filling, the arrival (rarely) or the long quiet between. Never on a jump or in a
   fight. Lines ask nothing and carry no fact the story needs.

## What each piece of the panel earns

- **Them / You bars**: only when there are hulls to weigh up (`ships`).
- **Intent**: only when the card can be a lie (`truths`); a plain job says nothing.
- **The (i)**: the ship's state, as before, behind a tap.
- A routine job is the caller, the quote, the terms in one line, and two buttons.

## Adding to it

A new card needs no code: give it a `kind`, `trigger` and choices and it has a
weight. Set `tier` to override. A new chatter line is a row in `chatter.ts` and a
German twin. A new rule is a field in `DESK` and a line in `Desk.may`.
