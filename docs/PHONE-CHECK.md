# Phone check

What was audited in the cloud (software WebGL, touch emulation) and what needs a real phone.

## Audited, 2026-11-05

At 568x320, 667x375, 740x360 and 844x390 with touch: title, settings, arcade pause and
flight HUD; and every comms card at 568x320 and 844x390 (answers, stat rows, tags).
Looked for buttons under 40px, text under 10px and anything wider than its panel.

Fixed: answer rows and stat rows could be wider than their card (chips clipped at 568);
the "View account summary" link was 22px high; the pause button was 32px high.

Not fixed on purpose: about half the cards are taller than a 320px screen and scroll.
Every answer is reachable, but they are not glanceable.

## Needs a real phone

1. FPS in a fight and on arrival (watch for the quality governor dropping a tier).
2. Thumbs: stick, Laser, Torpedo, Turn and Pause all reachable without the hand covering the HUD.
3. A tall card (Calloway, checkpoint): scroll with a finger, answer, no rubber-banding of the page.
4. Text on the glass is sharp (Chrome pause card and Safari blur were fixed blind).
5. Notch and home-bar: nothing under them, in both landscape directions.
6. Rotate to portrait: the rotate-screen notice shows.

## Phone options (2026-11-06)

- **Battery saver**: Settings on the title and the pause card. The low tier and 30 frames a second, kept per device.
- **Left-handed** (touch only): the stick on the right, Laser, Torpedo and Turn on the left, kept per device.
- Tall cards: tighter rows on phones, and an answer you cannot take shows its label and tag without the hint.
- Short card (phones on their side, all cards except the opening sheets): the question, up to three answers you can take, and a **More** plate for the rest (answers you cannot take, the facts, the note). A channel's speaker shares the header line.
- **Auto-fire** (touch only): the lasers fire while a ship sits in the torpedo's sights; never at rock or traffic.
- **Button size** (touch only): Normal, Large, Small.
- **Compact HUD** (touch only): the log lines, the heading tape and the scope's sector text step back.
- Settings: the title's list scrolls on a 320px screen; the pause card's settings fit in two columns.
- Numbers from a real phone: open the game with `?debug=1` for the fps, frame time, tier and draw-call readout.

Not done on purpose: mid-flight resume (a run is saved at the gates, and the game already pauses when the
page is left) and a time-to-next-stop line (no honest estimate until the pacing is playtested).

## Pause on a phone (2026-11-23)

Tapping Pause opened the pause card as the finger landed, and the same tap's click then landed on
Save & exit, which saved at the last gate and went back to the title. Reproduced in a touch browser.
Now the button pauses as the finger lifts, and `ui/tapguard.ts` swallows taps outside the touch controls
for 0.35 s after the pause card or any panel opens (cards already had their own 0.4 s guard). The button
moved to the top right corner (44x44); the ship's status steps 44 px left on touch screens.

## Controls you can see (2026-11-23)

- **Roll** is a button now: Torpedo, Roll and Reverse fan round Laser (`--fd` in `main.css`), each with its
  gauge; Roll's shows its cooldown. The second-finger tap and flick still work but are no longer taught.
- "Turn" is now **Reverse** (German still "Wende"); the pause card's control list names the buttons.
- A lesson's button glows (`.teach`) while its lesson runs: Laser, Torpedo, Roll.
- **Vibration** (Android; iPhone browsers have none, so the row is hidden there): a buzz on a roll, a
  torpedo, a hit taken and a card opening. On by default, `wayward.buzz`.
- **Stick: Floating or Fixed.** Fixed keeps the ring bottom left and steers from its centre; the knob stops
  at the rim. `wayward.stick`.
- Checked in touch emulation at 568x320 and 844x390: the Roll button rolls, the fixed stick steers, the
  settings fit the pause card. Not checked: real thumbs, and real vibration.

## Small phones and performance (2026-11-23)

- Compact HUD is on by default on a touch screen (still a setting; `wayward.compact` = '0' turns it off).
- At 568x320 and 640x360 (`max-height: 380px` in `neon.css`) cards take one more step of tighter padding, gaps
  and text (13 px question, 11.5 px hint). Cards taller than 568x320: 15 of 182 before, 3 after (Calloway's
  first call, story_crew, story_tollgate, 7 to 21 px over; they scroll, answers reachable).
- Scope: looked at and left where it is. It sits above the stick's resting ring, and the hand comes from below.
- Docked screens, the bay, the course screen and the chart were not re-checked in this pass (last checked
  2026-11-05, unchanged since apart from art).
- Performance: lean meshes and a breathing governor, docs/PERF.md pass 15.
