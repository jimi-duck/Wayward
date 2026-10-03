Asteroid Blaster is a survivors-style roguelite flown from a starship's tactical console, in 3D, on desktop and phone. The brand looks like Starfleet engineering hardware that has seen hard service: spec-sheet type, registry codes, hazard placards, and a neon that only lights when something is live.

**Tagline:** Hold the sector.

It grows out of the original canvas game in the portfolio: the same cyan ship, violet rocks, amber selection and hot-pink hull breach, the same notched console frames and tracked mono labels. What it adds comes from industrial product design and from Star Trek's own technical manuals: the LCARS sweep, cut sharp; schematics in place of paintings; warnings that look like warning labels.

## Four rules

1. **Cyan is ours, warm is theirs, violet is the field.** Everything the player owns is `signal`: the ship, its fire, its meters, its schematics. Every hostile ship and its fire wears a warm `faction-*` token. Asteroids and dilithium are `dilithium`. A player who sees a colour knows whose it is before they know what it is. `command` amber belongs to the player's hand in the UI (selection, focus, the primary button) and never appears in the field.
2. **Light means live.** Glow is a state: the selected card, the full gauge, the panel waiting for a decision. At rest, edges sit at `rule-2` and nothing blooms. Drydock has no glow at all.
3. **Cut every corner.** Frames, buttons, chips, plates and the wordmark's bowls are cut at 45° (`cut-xs` to `cut-lg`). Only three things are round: status dots, the thumbstick, and orbits.
4. **Every label is true.** Annotations show real values: stardate, sector, heading, velocity, a rock's dilithium yield, a ship's registry. Texture that is also information rewards a second look; decoration does not. Where a number is free, it is 47.

## Identity

- **The mark, Breach:** a dilithium crystal with an arrowhead punching out of its upper face, debris following. It is rule 1 in one picture. Use it alone at 32px and under, on the app icon, and at the left end of an elbow panel.
- **The wordmark** is constructed on a 20-unit grid: square stems, bowls cut at 45°, a stroke one fifth of the cap height. ASTEROID in `ink`, BLASTER in `signal`. Never retype it in a font.
- **Lockups:** primary (mark, wordmark, designation line), stacked, one ink. See the Lockup component and the Logos assets.
- Clear space is a quarter of the mark's width on every side. Minimums: mark 16px, one-line wordmark 160px wide, stacked 96px wide.

## Colour

Two themes share every token name. **Bridge** is the game: deep space and lit glass. **Drydock** is everything outside a run: the lab page, store art, press sheets, printed spec cards. It reads as a technical print, paper grey with ink and one orange. Never switch to Drydock during a run.

| Role | Tokens | Use |
|---|---|---|
| Grounds | `void`, `hull`, `hull-2`, `hull-3` | Space and page; panel glass; cards inside a panel; hover |
| Lines | `rule`, `rule-2`, `edge` | Hairlines; brackets and resting edges; control borders that must reach 3:1 |
| Text | `ink`, `ink-2`, `ink-3` | Primary; secondary (benefits, hints); tertiary (caveats, annotation, never under 9px) |
| Ours | `signal`, `on-signal`, `signal-ghost` | The ship, its fire, XP, lit edges, figures; unlit ticks |
| Your hand | `command`, `command-fill`, `on-command`, `focus` | Selection, the primary action, filled key caps, the focus ring |
| The field | `dilithium`, `on-dilithium` | Asteroids, dilithium crystals, the Ship upgrade category |
| Alerts | `caution`, `on-caution`, `alert`, `on-alert` | Yellow alert (fill only); red alert, damage, hull breach |
| Gains | `nominal` | A gain against last run, a ready state, always with a sign or a word |
| Factions | `faction-klingon`, `-cardassian`, `-romulan`, `-borg`, `-tholian` | Hostile hulls, their fire, a capital ship's name |

**Alert levels work as they do on a starship.** Yellow alert is the warning: a capital ship inbound, as a `caution` placard. Red alert is the engagement and the emergency: the hail, one hull plate left, hull breach, in `alert`. Yellow always comes first.

**Upgrade categories** keep the original game's three hues: Weapons in `command`, Defence in `signal`, Ship in `dilithium`. The category colour is worn by one word and one icon on a card, nowhere else.

**Never** put `caution` text on a dark ground (it is a fill), use `command` in the field, use a faction colour for anything the player owns, or tell two states apart by colour alone.

## Type

Three faces, three jobs. All three are on Google Fonts.

| Face | Family token | Job | Styles |
|---|---|---|---|
| Tektur | `display` | The voice: titles, card names, every sentence the player reads | `display-xl`, `display`, `heading`, `body`, `body-sm` |
| Antonio | `rail` | Structure and numerals: rail labels, the refit number, HUD values, the final stardate | `numeral-xl`, `numeral`, `rail-label` |
| Martian Mono | `mono` | Instruments: figures, key caps, micro labels, codes, annotation | `data`, `label`, `annotation` |

- Antonio is the closest free cut to LCARS's ultra-compressed grotesk. It carries the Star Trek link in type; use it for structure, never for sentences.
- Caps for titles, names, labels and rails, tracked: `display` 0.12em, `rail-label` 0.14em, `label` 0.16em. Sentence case for benefits, caveats and hints.
- Figures in `data` and `numeral` use tabular numerals.
- **The label script.** A few labels carry a Japanese term beside the English, set in the `jp` family, in `ink-3`, at 60% of the label's size: 小惑星 asteroid, 改装 refit, 警告 warning, 警報 alert, 船体損傷 hull damage, 艦橋 bridge, 全停止 all stop. It is industrial texture, so it never replaces English, never carries information alone, and only uses terms from this list.

## Frames and layout

- **The elbow** frames anything that stops the run (refit, hail, shakedown, all stop, hull breach): a bar down the left, a rail along the top, a chamfered bend. One on screen at a time. The title sits hard right, as LCARS sets titles.
- **The notch** (`ab-frame`) is every other container: cards, tiles, chips, key caps, tags. The edge is a layer and the glass is a layer, both cut, so the hairline runs along the diagonals.
- **Brackets** frame things to look at: the viewscreen, a schematic, a target lock.
- **Placards** carry alerts. **Tick meters** carry every quantity.
- Spacing is a 4px scale (`space-1` to `space-12`). Panels pad `space-6` to `space-8`; cards pad `space-3` to `space-4`; HUD chips sit `space-6` from the screen edge.
- **The HUD** puts progress across the top, what's in your hand along the bottom, and labels only the capital ship in the world. On phones, everything you read moves up and everything you press moves down.

## Iconography

Thirteen line icons on a 24px grid, 1.75 stroke, square caps, miter joins, every angle a multiple of 45°. In code they are CSS masks (`ab-i ab-i--<name>`) and take `color`. The SVG files in the Icons asset group are drawn in `edge` (#3E8798) so they read on any ground. No emoji anywhere.

Upgrade art is **schematic line art** in the category colour on a dot grid, drawn from the same meshes the game renders. The painted card art in the original is retired: it resembled canon ships and could not match a 3D game.

## Voice

The game's copy deck (`COPY-game.md` in the portfolio) is the source for every string, and its rules stand:

- Report what happens. "Your phasers fire faster." "Next contact in 37s."
- Second person, one short sentence, a full stop.
- Five nouns, never a synonym: **shot, beam, torpedo, mine, hull.**
- Numbers are computed, never typed, so a card cannot promise a figure the ship does not get.
- UK spelling; no em dashes; none of the portfolio's banned words.
- Naval and engineering register for labels: All stop, Field refit, Hull breach, Shakedown, Hold the sector.

## Accessibility

- Every text token passes 4.5:1 on `void`, `hull` and `hull-2` in both themes; `edge` passes 3:1 for control borders. `caution` is never text.
- The focus ring is `focus`, 2px solid behind a 2px gap. On cut shapes it is drawn in the edge layer, because the clip would hide an outline.
- State is never colour alone: the selected card changes edge, fill, position and key cap, and gains carry ▲ or ▼.
- Under `prefers-reduced-motion`, nothing strobes or crawls: blinks hold steady, placard stripes stop, shake and freeze frames are skipped, and the information they carried stays on screen.
- Panels that freeze the run ignore input for 0.4s, and held keys never answer a panel.

## Using this system

Load the three faces (Antonio 400–700; Martian Mono, variable width and weight; Tektur, variable width and weight) from Google Fonts, then `tokens.css`, then `components/bundle.css`. Every class is prefixed `ab-`. Components are plain HTML and CSS with no script; the previews show the markup each one expects, and each component's guidelines say what to provide. The screen previews draw their backdrops with a canvas stand-in; in the game the backdrop is the live 3D sector.
