# MobileHUD

The HUD at phone size, portrait. The thumbs own the bottom third, so everything you read moves to the top and everything you press moves to the bottom.

- **Top:** the refit rail at 40px, then the score and hull chip on the left and All stop over the chain chip on the right. Respect the top safe-area inset.
- **Bottom left: the stick.** It floats: the whole screen is its catchment, so the ring comes to the thumb. It rests here as an affordance. It is one of the three round things in the system.
- **Bottom right: Release.** An octagon, and it doubles as the overcharge gauge: 30 segments round its face fill as you graze, and the button turns `command` with a filled label when the gauge is full. One control, one gauge, under the thumb that uses it.
- Barrel roll on touch is a quick swipe with the stick thumb (decided in M1).
- Keep the bottom safe-area inset clear; on iPhone the stick sits 44px above it.
