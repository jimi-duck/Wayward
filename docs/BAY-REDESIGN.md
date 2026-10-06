# Refit bay redesign: direct control, less reading

Design document. No code has been changed. Based on the bay as it is on PR #58's branch (`claude/refit-bay-plan`): `src/ui/bay.ts`, `src/sim/bay.ts`, `src/content/web.ts`, `src/render/ships.ts`, with the Krail currency, Cyrite fuel and the Story yard in a Signals tab.

## As built (step 1, PR #59)

- **The ship is the title art.** The live 3D model reads blocky next to the painted Wayward, so the bay shows `src/assets/wayward-menu-background.jpg`, fitted to the room between the tabs and the cards (or the web), with its edges faded into the bay's dark. It is static. The 3D ship, camera, lights and renderer are untouched; the bay simply covers them.
- **Rings** sit on the painted ship by picture coordinates (`ZONE_AT` in `ui/bay.ts`), in every view. Signals is the mast, Defence the turrets.
- **Arcade is "Pick one"**: three suggestions, the tabs shown locked. The Story mode keeps "Suggested" and the free tabs, on the same screen.
- **Phones on their side** (667×375 and smaller) keep the same layout: ship strip, three cards, the budget bars. The one-column fall-back is for portrait widths only. Buttons and tabs are 36 to 40 px tall, a ring's tap area is 40 px around the ring as drawn, and no bay text is under 10 px. Below 520 px of height the bay is exactly the screen: a tall inspector scrolls and its fit button stays in reach.
- Not built yet: buckets, progressive disclosure, delta chips, quick builds, the demo window (steps 2 to 6 below).

## 0. What the game already has, and what changes

Your brief reads as if the bay were a flat web with nothing behind it. Most of the bones are already there, so this is a re-weighting more than a rebuild.

| Your pillar | Today (PR #58) | Verdict |
|---|---|---|
| Suggested as the default | Done: the bay opens on `picks`, three cards, keys 1 2 3, Auto-refit | Keep. Make it the *home*, not one tab of ten |
| Fewer tabs | 10 views: Suggested + 9 tabs (Hull, Weapons, Ordnance, Engines, Defence, Utility, Signals (Story), Reactor, Synergies) | Change: 3 buckets + Suggested |
| Hide far nodes | `stateOf` gives `max / owned / open / short / locked`; locked nodes are dimmed, all drawn | Change: draw only what is one step away |
| Less reading | Inspector shows text, 3 figures, chips, warnings, flavour note | Change: icons and deltas first, prose behind an (i) |
| Click the ship | **The ship is a real Three.js model** (`render/wayward.ts`), drawn behind the bay with the camera pushed in (`rig.bay`). Each tab already lights glow sprites on it (`MARKS` in `render/ships.ts`), and `sector.zoneScreen(zone)` projects them to screen fractions. Today they are decoration; a line runs from the fitted card to the nearest one | **New, and cheap**: the lights become the buttons |
| Flash the new part, snap the budgets | Partly: `installFx` counts Krail down over 520 ms, flashes the zone's lights, draws the line, bumps changed budget values | Strengthen, not invent |
| Video/GIF preview | No video assets exist, and the game has no capture pipeline | Adapt: an in-engine demo on the real ship (section 4.4) |
| Quick builds | Nothing | New (section 4.5) |

Two brand rules change your wording (CLAUDE.md, brand v1.1): **amber is the player, teal is information, red is threat and nothing else.** So no green and red arrows. Gains are teal ▲; red appears only when a fit pushes a budget past its rating (a real threat to the ship).

## 1. Wireframe layout (desktop, 1280×800)

The big change: **the ship becomes the centre stage.** Today a 1000 px-wide panel covers the ship and blurs it (see `pause-check/desktop-bay.png`). The panel goes; the ship is drawn clear, and the cards drop to a tray.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ REFIT BAY            ◆ CLEAR      ⬡ 120 KRAIL    [Auto-refit ○]  [B LAUNCH] │  top bar (as now)
├──────┬───────────────────────────────────────────────────────┬─────────────┤
│      │                                                       │  PART       │
│ ★    │              (  ◎ )         ( ◎ )                     │ ┌─────────┐ │
│ FOR  │                 \          /                          │ │ ◇ glyph │ │
│ YOU  │        ◎ ───────[ THE  WAYWARD ]────── ◎              │ │ ARC EMIT│ │
│      │                 /   3D, unblurred \                   │ └─────────┘ │
│ ⌖    │            (  ◎ )              ( ◎ )                  │ ⌖ +15% arc  │
│ GUNS │                                                       │ ◈ +1 heat   │
│      │   ◎ = hardpoint: glowing ring on the real model       │ [▶ demo 3s ]│
│ ⛨    │   amber = ready, teal = fitted, dim = not yet         │             │
│ ARMOUR                                                       │ [ FIT 40 ⬡ ]│
│      │                                                       │             │
│ ⚡    ├───────────────────────────────────────────────────────┤             │
│ CORE │  TRAY: 3 suggestion tiles     |  QUICK BUILD           │             │
│      │  [1 ◇ Arc][2 ◇ Magazine][3 ◇ Ram] | [BRAWLER][SNIPER][SPEEDSTER]    │
├──────┴───────────────────────────────────────────────────────┴─────────────┤
│ POWER ▮▮▮▮▮▮▮░  5/8→7     MASS ▮░░░░░░░ 1/8     HEAT ▮▮▮░░░░░ 3/8→4      │  budgets (as now)
└────────────────────────────────────────────────────────────────────────────┘
```

### Left column: four buttons, not ten
Bucket → today's tabs, and the ship zones (`MARKS`) they light:

| Bucket | Tabs folded in | Zones lit on the ship |
|---|---|---|
| **For you** (home) | Suggested | the three suggested parts pulse |
| **Guns** | Weapons, Ordnance | nose and wing guns, torpedo bays |
| **Armour** | Hull, Defence | plating, shield emitters |
| **Core** | Engines, Reactor, Utility, Signals (Story) | nozzles, reactor, masts |

- **Synergies stop being a tab.** A synergy is a pairing of two fitted parts, so it shows as a link chip on the *pair's* hardpoints (✦ on both) and as a pick in For you when one is one step away. This is the one place I'd like your call (open question 3).
- The profile card ("Stock hauler") moves into the right panel as a one-line caption under the ship name, not a block on the left.
- Keys: Q / E step through the four; pad bumpers the same. Fewer stops means fewer presses.

### Centre stage: the ship, with hardpoints
- The real model, no blur, no panel. Hardpoints are 44 px touch targets (14 px visible ring) placed over the `MARKS` points of the open bucket, found each frame with `sector.zoneScreen`. They follow the ship's slow bay sway.
- One hardpoint per **part**, not per node: a hardpoint opens the small branch behind it (section 1, "Part popover").
- **Progressive disclosure on the ship:** fitted parts show a solid teal ring, ready ones a pulsing amber ring, "next step" ones a faint ring. Anything further is not drawn, just a count in the popover ("+3 later").

### Part popover (replaces the web)
Tapping a hardpoint opens a card beside it (no full-screen web). It shows only the chain for that part, as a short row of hexagon glyphs:

```
 ◈ Laser rate ─ ◈ Laser reach ─ ◈ ? ─ +2
   FITTED         READY          NEXT
```
- Fitted (amber fill), Ready (amber outline + price), Next (dim glyph + lock), then a "+N" chip. `stateOf` already yields these states; "Next" is `locked` with its parent fitted.
- The hexagon glyph (`nodeIcon`, the 96 px white masks) carries the identity. The name is a single line under the selected hex only, not under every node.
- Branches with a fork (two children) show two hexes stacked, the way the web's junctions do today.
- The full web is not deleted: a "map" toggle (⌗) in the popover opens today's web for the planners. It is the old tab view, one tap further in.

### Right panel: the selected part
Top to bottom, nothing more than this:
1. Hex glyph + name (one line) + level pips.
2. **Delta chips** (max 3): icon + number + direction. From `upgradeFigures`, which already returns `label / from / to`.
3. **Budget chips**: `+1 Heat`, `Mass limit +1` (what `inspector` builds today).
4. **Demo window** (4.4).
5. **Fit button** with the price. Disabled state says why in 3 words (`WHY` map today).
6. (i) opens the old paragraph and flavour note. No prose by default.

### Bottom bar
Unchanged position and meaning, with the budget bars made heavier (section 4.3). The "→ 7" preview of what the selected part would take stays.

### Phone (landscape, ~800×360)
- Buckets become a 4-icon rail on the left, 48 px wide, labels hidden (glyph + the ready count).
- Ship fills the centre; hardpoints keep a 44 px target.
- The right panel becomes a bottom sheet over the tray, 40% height, dragging up for (i).
- Tray tiles shrink to glyph + price; Quick Build becomes one button that opens three archetype chips.
- Budget bar moves into the top bar as three short pill-bars.
- Screenshots required at desktop and phone sizes, as the repo rule says.

## 2. Revised user flow

1. **Enter.** Pause menu → Refit bay (or the port's dock in Story). Camera eases in on the ship over about 0.5 s (`rig.bay`, already there). Panel edges slide in from left and bottom. World stays paused.
2. **Land on "For you".** The three suggested parts pulse amber on the ship, and the tray tiles match. A one-line caption: the ship computer's reason (`advice`), e.g. "Recommended: you fly close".
3. **Fast path (about 2 s).** Press 1 / 2 / 3, or tap a tile. Fit lands (4.2). Done. Auto-refit on skips even this.
4. **Quick build path.** Tap Brawler / Sniper / Speedster. A preview ghost-fits it: every part it would buy lights, budget bars show the end state, a price total appears. **Hold** the button for 0.4 s to commit. No dialog. (No refunds is a decided rule, so a hold is the guard.)
5. **Direct path.** Tap a hardpoint on the ship (or move with the stick). The popover and right panel open for that part. Pick a hex in the chain; the right panel updates; Fit.
6. **Browse path.** Q / E or tap a bucket to light a different region of the ship. Tap the map toggle for the old web.
7. **Feedback loop.** After every fit the screen returns to a calm state with the next-best part already pulsing. No confirm prompt.
8. **Launch.** B, Esc, or the Launch button. At a port the label is "Back to the dock", as now. Camera pulls out, panels slide away, world resumes.

If Krail is 0 on entry, step 2 says "Nothing to fit yet · break rock for Krail" (the existing line) and the big button is Launch.

## 3. What to build on, so nothing is redone

| Piece | Where it lives | Change |
|---|---|---|
| Views, tab icons | `TAB_ICON`, `viewsOf` in `ui/bay.ts` | `viewsOf` returns buckets; a `BUCKET` map in `content/web.ts` (data, not code) |
| Glyphs | `nodeIcon` in `ui/icons.ts`, `public/icons/node/*.png` (82 masks) | none |
| Line symbols (bucket icons) | `index.html` sprite | add 3 bucket symbols |
| Hardpoint positions | `MARKS` in `render/ships.ts` | add a `signals` mark (mast); today Signals has none. Split MARKS by *part*, not only by tab, so a tap resolves to a part |
| Screen position | `sector.zoneScreen`, `bay.ship.points` | per-frame, not only on install |
| Flash | `flashZone`, `kick` | stronger kick, plus a ring (4.2) |
| Deltas | `upgradeFigures` in `sim/build` | add an `icon` and `better: boolean` per figure |
| Suggestions | `quickPicks`, `advise` | unchanged |
| Quick builds | none | `quickBuild(ctx, archetype)` in `sim/bay.ts` (pure, headless-testable), rows in `content/` |
| Budgets | `budgets()`, `budgetBar` | motion only |

Pad and keyboard: arrows pick the nearest hardpoint *in screen direction* (the web's `move` already does nearest-in-direction; swap the coordinates), A fits, Y Auto-refit, B launches.

## 4. Component specifications

Timings are starting values to be tuned by feel. Everything respects `prefers-reduced-motion` (as `installFx` already does): the state changes at once, no travel.

### 4.1 Hardpoint ring
- Visible ring 14 px, hit area 44 px. Ready: amber, 1.2 s breathing pulse (scale 1→1.25, opacity .6→1). Fitted: solid teal with a dot. Next: thin dim ring, no pulse. Selected: ring grows to 22 px with four corner ticks, like a targeting reticle.
- Hover or focus: ring snaps (80 ms, ease-out) and a thin leader line draws to the popover (reuse the `bay-line` path-draw).
- Over-budget part: red ring, since red means threat.

### 4.2 The fit: "a part clamps on" (the install, 600 ms total)
| t (ms) | What |
|---|---|
| 0 | Button presses in 2 px with a hard stop. Screen shake of 3 px for 80 ms on the *ship layer*, not the UI |
| 0 to 90 | The part's sprites kick to 1.6 and a white flash ring expands from the hardpoint (CSS circle, 90 ms) |
| 60 | Hex in the chain fills amber with a 40 ms overshoot |
| 0 to 520 | Krail counts down (`countKrail`, kept) |
| 100 to 400 | Budget bars ratchet (4.3) |
| 400 | Next-best part's ring begins to pulse |

No toast, no confirmation. Sound, if the game has an audio bus (not checked): one low clunk, pitched by the part's bucket.

### 4.3 Budget bars: "snap to the new limit"
- Bars are drawn in segments (one per point of rating), not a smooth fill, so a fit adds whole segments.
- Use rises: segments light one by one, 40 ms apart, each with a tiny hard tick. Rating (cap) rises: the end marker slides to its new slot with 6% overshoot and settles in 120 ms, like a latch.
- Hover or select preview: the incoming segments blink amber at 0.8 Hz (today's `--a` value, made visible).
- Over a soft rating: the overflowing segments go red and the bar gives one 100 ms jolt. Mass and heat only (power is a ceiling, as in `OVER_WORD`).

### 4.4 Demo window (the "3-second loop")
No video: there are no assets and a video per module (82 of them) would bloat the build and the repo. The game can draw the real thing instead.
- A 200×120 px viewport in the right panel shows a **live in-engine loop**: the ship model on a short dummy target run, firing the selected weapon or showing the selected part, 3 s on repeat, before and after side by side (left dim "now", right bright "with this").
- Cost: the weapon effects exist in `render/weapons.ts` and `fx.ts`; the open question is whether a second small viewport can share the renderer. If it cannot, the fallback is the same loop drawn on the main stage: the ship fires from the hardpoint when you select it, with a faint ghost target ahead. I have not verified which is cheaper; that is a spike for the first build.
- For non-weapon parts (reactor, engines) the loop is a plain animated glyph: engines show the plume lengthening, shields show the shield ellipsoid pulsing (both exist on `ShipView`).

### 4.5 Quick Build
- Three archetypes as data: `brawler` (arc emitter, ram prow, plating, close-range laser), `sniper` (laser reach and rate, torpedo magazine), `speedster` (drive and handling, plasma, light plating). Each is an ordered list of node ids; the build buys down the list while Krail, power, mass and heat allow, and stops at the first it cannot afford. It uses the same `w.install`, so every rule holds.
- The button shows glyphs of its first three parts, the total price and a profile bar from `profileOf`. Balance: it must never be strictly better than a human's picks (check by pilot report; see `docs/BALANCE*.md`).
- Preview on hover, hold to commit (0.4 s, the ring around the button fills). Disabled with 3-word reason when nothing is affordable.
- Cannot be undone, so the preview is the safeguard, not a dialog.

### 4.6 Delta chip
`[icon] +15%` with a ▲ in teal for a gain. For a cost (more heat, more mass): amber `+1` with no arrow. Red only if it crosses a rating. The icon says what, the number says how much; the label is the tooltip and the screen-reader text. Needs icons for blast radius, damage, rate, range, hull, shield, speed, turn, Krail: about nine line symbols to add to `index.html`, in the existing style.

### 4.7 Look and feel ("heavy, mechanical")
- Motion curve: fast in, hard stop, tiny settle (cubic-bezier(.2,.9,.3,1.05), 120 to 200 ms). No long fades.
- Panels slide on rails and stop with a 2 px overshoot; the left rail has a fixed amber notch that follows the selected bucket.
- Buttons have a depressed state (inset 2 px, 40 ms), not a glow.
- Camera: on selecting a part, nudge the camera 6° towards it (needs one extra parameter beside `rig.bay`) and ease back on deselect.
- Type, colours and the line-art style stay brand v1.1.

### 4.8 Accessibility
Every hardpoint is a real button with a name and level in `aria-label` (as nodes have now). The tab order runs buckets → hardpoints → fit. Reduced motion removes shake, overshoot and the camera nudge.

## 5. Risks

1. **Hardpoints can overlap or hide** at some camera angles; the ship sways. Mitigation: ring placement tested at both aspect ratios; popover pins to screen edge.
2. **Hiding far nodes hides long-term goals.** Mitigation: a single "+N later" chip and a silhouette hex per branch, so a build direction is still visible.
3. **Merging tabs 9 → 3** changes keys and muscle memory; the i18n test needs German twins for the new bucket names and chip text (CLAUDE.md).
4. **Saves**: no change to the journey's shape, so no `VERSION` bump. A quick-build is just installs.
5. **Story mode yard parts** (fitted only at a port, charged in chits as well) need a dock badge on their hardpoint, and a "not here" state in the flight bay.

## 6. Suggested order of work (each a small PR)

1. **Ship as stage**: remove the blurred panel, clear centre, hardpoints on existing `MARKS`, popover with the chain, map toggle. Biggest feel change, small sim impact.
2. **Buckets and progressive disclosure**: 3 buckets, hidden far nodes.
3. **Delta chips and trimmed inspector**, new line symbols, German twins.
4. **Fit and budget motion** (4.2, 4.3).
5. **Quick builds**, with a pilot report in `docs/BALANCE*.md`.
6. **Demo window**, after the renderer spike.

## 7. Questions where I picked a default

1. **Four buckets or three?** Default: For you + Guns / Armour / Core. Your brief said 3 or 4; Signals fits Core in Story.
2. **Demo: second viewport or on the main stage?** Default: spike first, main stage as the fallback.
3. **Synergies as chips on parts instead of a tab.** Default yes. Alternative: a fifth bucket "Pairs", which keeps the tab count high.
4. **Quick-build costs:** default is buying down the list until Krail runs out. Alternative: a fixed price shown up front that must be paid in full.
