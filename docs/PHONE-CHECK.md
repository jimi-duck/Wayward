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
- Numbers from a real phone: open the game with `?debug=1` for the fps, frame time, tier and draw-call readout.

Not done on purpose: mid-flight resume (a run is saved at the gates, and the game already pauses when the
page is left) and a time-to-next-stop line (no honest estimate until the pacing is playtested).
