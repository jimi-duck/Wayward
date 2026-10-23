# QA: chapter one

Chapter one is the opening at Cerro and the first system past the Jump Gate
(docs/POSTJUMP.md). This is how it is checked and what is still for a person.

## Automated

`tests/chapter1.test.ts` plays the first system headless on 16 seeds, so every
kind of system the chart can deal it gets the same checks:

- the depot calls on the approach, the call pauses, an answer lets you go on;
- slow inside the depot ring and the clamps take you, cast off, back to flight;
- the audit dock calls while the owner lock holds and stays quiet after;
- the Jump Gate jumps from the depot, whatever cards stand in the way;
- five minutes of the real story chain with traffic: positions stay finite,
  the hull count stays bounded, the objective ends on the Jump Gate;
- a saved and reloaded journey deals the same level; the next system is an
  ordinary one.

`tests/chapter1-cerro.test.ts` plays the opening before it, on 12 seeds, with
real input where the player's hands are on the ship:

- the laser takes the lesson rock and the drops come aboard;
- the Work Bay takes the ship at its ring, shows the account, finances the
  launcher and sends it back out;
- the raiders stop the world, refusing takes the hold, the chase starts, the
  tank holds the jump and the Jump Gate takes the ship;
- dying before the gate is a wreck without an escape (the app starts the
  opening again) and the new opening is the start, not a continuation;
- past the gate: breach, Sam, the archive come once each, in order, the lock
  lifts and a reload keeps it;
- the tank arrives dry and a pilot who only mines fills it in a few minutes
  and jumps.

Other suites cover the rest: `tests/tutor.test.ts` (the whole opening),
`tests/postjump.test.ts` (objective, traffic, escalation), the i18n test.

## By hand (desktop and phone landscape)

1. Start a Story journey, fly Cerro: raid, fight or flee, gate, jump.
2. Arrival: no white hold longer than a second; story cards in order.
3. Fly to the depot: the call appears once, pauses, both answers work.
4. Slow in the ring: docked screens, buy, Cast off.
5. Fly at the audit dock before the lock lifts: its call appears once.
6. Fire on a hauler: it warns, a second hit brings pickets, none on top of you.
7. Reload mid-level: the same objective returns.
8. Fly through the Jump Gate: the next system is an ordinary one.

## Found and fixed so far

- The depot's port call was a coin flip, and never came in transit systems.
  Both docks now call once (#308).
- Cerro, the raid, the gate, the story chain and the way out of the first
  system: no further fault found on 12 seeds. The suites above hold them.

## Still needs a device

The cards on screen, the arrival with the white veil on a phone, the Work Bay
and depot docked screens, the radar and pointers, and how the traffic and the
pickets feel. Nothing here measures frame rate.
