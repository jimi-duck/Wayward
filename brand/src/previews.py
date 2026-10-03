import os, textwrap
from fragments import FONTS, SCENE_JS, SCH, icon, wordmark, mark

OUT = 'project/components'
COMPS = {}

def doc(name, marker, body, style='', script='', readme=''):
    html = (f'<!-- @dsCard {marker} -->\n<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n'
            f'<title>{name}</title>\n{FONTS}\n<style>\n{textwrap.dedent(style).strip()}\n</style>\n</head>\n<body>\n'
            f'{body.strip()}\n' + (f'<script>\n{script.strip()}\n</script>\n' if script else '') + '</body>\n</html>\n')
    COMPS[name] = (html, textwrap.dedent(readme).strip() + '\n')

def scene(spec):
    return SCENE_JS + f'\nabScene(document.querySelector(".scene"), {spec});'

# ═══ IDENTITY ═══════════════════════════════════════════════════════════════
APP_ICON = ('<svg viewBox="0 0 64 64" width="88" height="88" aria-label="App icon"><path d="M10 0H54L64 10V54L54 64H10L0 54V10Z" fill="#03060B"/>'
            '<path d="M10.6 1.5H53.4L62.5 10.6V53.4L53.4 62.5H10.6L1.5 53.4V10.6Z" fill="none" stroke="#00F0FF" stroke-opacity=".35" stroke-width=".6"/>'
            '<g transform="translate(9.6 9.6) scale(.7)" style="--dilithium:#C77DFF;--signal:#00F0FF">' + mark(64).replace('<svg class="ab-mk "', '<svg class="ab-mk"').replace('width="64" height="64" ', '', 1) + '</g></svg>')
doc('Lockup', 'group="Identity" height=380', f'''
<div class="wrap">
  <div class="primary">
    {mark(64)}
    <div class="stackline">
      {wordmark(width=430)}
      <div class="desig"><span class="ab-rail">Sector 001 · Tactical simulation</span><span class="ab-jp">小惑星</span></div>
    </div>
  </div>
  <div class="row">
    <figure>{mark(48)}{wordmark(stacked=True, width=150)}<figcaption class="ab-anno">Stacked · square spaces</figcaption></figure>
    <figure>{APP_ICON}<figcaption class="ab-anno">App icon · 512 tile</figcaption></figure>
    <figure class="mini">{mark(24)}{mark(16)}<figcaption class="ab-anno">Mark · 24 and 16</figcaption></figure>
    <figure>{mark(40, 'is-mono')}{wordmark(width=150, cls='is-mono')}<figcaption class="ab-anno">One ink</figcaption></figure>
  </div>
</div>''', style='''
.wrap { padding: 28px 32px; display: grid; gap: 32px; }
.primary { display: flex; align-items: center; gap: 22px; }
.stackline { display: grid; gap: 10px; }
.desig { display: flex; gap: 16px; align-items: baseline; color: var(--ink-2); padding-top: 8px; border-top: 1px solid var(--rule-2); }
.desig .ab-jp { font-size: 13px; color: var(--ink-3); }
.row { display: flex; flex-wrap: wrap; gap: 40px; align-items: flex-end; }
figure { margin: 0; display: grid; gap: 10px; justify-items: start; }
figure.mini { grid-auto-flow: column; align-items: end; }
figure.mini figcaption { grid-column: 1 / 3; }
''', readme='''
# Lockup

The mark and the constructed wordmark, and the four ways they go together. Use the primary lockup on the title screen and the lab page; the stacked lockup where width is short; the mark alone at 32px and under.

**The mark, Breach.** A dilithium crystal with an arrowhead punching out through its upper face, debris following. It says the brand's one colour rule in a single picture: cyan is ours, violet is the field.

**The wordmark** is constructed on a grid: square stems, bowls cut at 45°, a stroke one fifth of the cap height. Never retype it in Tektur or any font. ASTEROID sits in `ink`, BLASTER in `signal`.

Provide: nothing but a ground. The inline SVG classes (`ab-wm`, `ab-mk`) take `ink`, `signal` and `dilithium` from the theme; add `is-mono` for a one-ink version. Files for other uses are in the Logos asset group.

- Clear space: the width of the arrowhead (a quarter of the mark) on every side.
- Minimum: the mark at 16px, the one-line wordmark at 160px wide, the stacked at 96px.
- The designation line under the primary lockup is `rail-label` in `ink-2`, then the label script in `ink-3`.
- Don't: recolour the two words, outline the wordmark, put the mark inside a circle, set it over a busy part of the field without a `hull` panel behind it.
''')

ICON_NAMES = ['weapons','defence','ship','hull','dilithium','overcharge','chain','capital','stardate','torpedo','mine','alert','all-stop']
doc('Icons', 'group="Identity" height=260', '<div class="grid">' + ''.join(
    f'<div class="cell{" c-gun" if n=="weapons" else " c-hull" if n=="defence" else " c-ship" if n=="ship" else ""}">{icon(n)}<span class="ab-anno">{n}</span></div>' for n in ICON_NAMES)
    + '</div>', style='''
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 1px; padding: 24px; }
.cell { display: grid; justify-items: center; gap: 10px; padding: 18px 8px 14px; background: var(--hull); color: var(--ink); font-size: 28px; }
.cell .ab-anno { font-size: 9px; }
.c-gun { color: var(--command); } .c-hull { color: var(--signal); } .c-ship { color: var(--dilithium); }
''', readme='''
# Icons

Thirteen line icons on a 24px grid: 1.75 stroke, square caps, miter joins, every angle a multiple of 45°. They are masks, so they take `color` like text.

Provide: `<i class="ab-i ab-i--weapons"></i>` inside anything with a `color`. Size with `font-size` (an icon is 1em square).

- The three category icons wear their category colour on cards: `weapons` in `command`, `defence` in `signal`, `ship` in `dilithium`. Everywhere else an icon takes the colour of the text beside it.
- 16px is the smallest size; at 16px use `stroke-bracket` weight in any new icon.
- New icons follow the same grid and the same rule as the frames: cut, never round.
- No emoji, anywhere.
''')

# ═══ FRAMES ═════════════════════════════════════════════════════════════════
doc('Elbow', 'group="Frames" height=330', f'''
<div class="wrap">
  <section class="ab-elbow is-lit main"><i class="ab-elbow-l"></i>
    <div class="ab-elbow-head">
      <div class="ab-elbow-code">{mark(30)}<span class="ab-anno">AB-47 · CONSOLE 05</span></div>
      <div class="ab-elbow-title"><div class="ab-title">Field refit <span class="ab-jp">改装</span></div><div class="ab-sub">Refit <b>5</b> · choose one upgrade</div></div>
    </div>
    <p class="ab-body note">The elbow is the frame for anything that stops the run: refit, hail, shakedown, all stop and hull breach.</p>
  </section>
  <div class="row">
    <section class="ab-elbow is-command small"><i class="ab-elbow-l"></i><div class="ab-elbow-title"><div class="ab-title">Shakedown</div></div></section>
    <section class="ab-elbow is-alert small"><i class="ab-elbow-l"></i><div class="ab-elbow-title"><div class="ab-title">Hull breach</div></div></section>
  </div>
</div>''', style='''
.wrap { padding: 24px; display: grid; gap: 22px; }
.note { margin: 18px 0 0; max-width: 52ch; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.small { padding-top: 22px; padding-bottom: 18px; }
.small .ab-title { font-size: 20px; }
.ab-title .ab-jp { font-size: .62em; vertical-align: .25em; margin-left: 6px; color: var(--ink-3); }
''', readme='''
# Elbow

The signature frame: an LCARS sweep re-cut at 45°. A 12px bar down the left (`stroke-bar`), a 3px rail along the top (`stroke-rail`), a chamfered outer corner (`cut-lg`) and a chamfered bend where they meet. The other two corners are a hairline at 45% of the elbow's colour, with the bottom-right cut to match.

Provide: `<section class="ab-elbow"><i class="ab-elbow-l"></i> … </section>`. The `<i>` draws the sweep. Put the head in `ab-elbow-head`: a code or the mark on the left, the title hard right in `ab-elbow-title` (`display` style, caps, in the elbow's colour) with the sub-line under it.

| Class | Colour | Use |
|---|---|---|
| (default) | `signal` | Field refit, all stop |
| `is-command` | `command` | Shakedown, the hull pick |
| `is-alert` | `alert` | The hail, hull breach |
| `is-lit` | adds `glow-signal` | The one panel on screen that is waiting for a decision |

- One elbow on screen at a time. It means "the run has stopped and a decision is owed".
- The title is set hard right, the way LCARS sets titles; the left end holds the mark or a code.
- Don't nest an elbow in an elbow, or use one for a HUD element.
''')

doc('Brackets', 'group="Frames" height=230', f'''
<div class="wrap">
  <figure><div class="ab-brackets view ab-cat--hull">{SCH['deflector']}</div><figcaption class="ab-anno">Viewport · rule-2</figcaption></figure>
  <figure><div class="ab-brackets is-lit view ab-cat--gun">{SCH['phaser']}</div><figcaption class="ab-anno">Viewport, lit · signal</figcaption></figure>
  <figure><div class="target-wrap"><div class="ab-brackets is-target target"></div><svg viewBox="0 0 60 60" class="rock"><path class="ab-sch-rock" d="M18 12l16-4 12 10-2 16-16 6-12-10z"/></svg></div><figcaption class="ab-anno">Target lock · command</figcaption></figure>
</div>''', style='''
.wrap { display: flex; flex-wrap: wrap; gap: 28px; padding: 24px; align-items: flex-end; }
figure { margin: 0; display: grid; gap: 10px; }
.view { width: 220px; height: 120px; padding: 10px; position: relative; }
.view svg { width: 100%; height: 100%; display: block; }
.target-wrap { position: relative; width: 120px; height: 120px; display: grid; place-items: center; }
.target { position: absolute; inset: 22px; }
.rock { width: 60px; height: 60px; --cat: var(--dilithium); }
''', readme='''
# Brackets

Four corner brackets: the viewscreen frame, and the frame around anything the player should look at. Built from eight background gradients, so they cost no markup.

Provide: `class="ab-brackets"` on any box. Set `--l` (arm length, default 14px) and `--b` (colour) to tune.

- At rest the arms are `rule-2`. `is-lit` turns them `signal` for the focused viewport; `is-target` makes short `command` arms for a target lock.
- The HUD's outer frame is one set of brackets inset `space-4` from the screen edge. The corners stay open on purpose, so rocks can cross the edge.
- Brackets frame a thing; they never hold text on their own.
''')

doc('Placard', 'group="Frames" height=200', f'''
<div class="wrap">
  <div class="ab-placard ab-placard--caution is-live"><div class="ab-placard-stripes"></div><div class="ab-placard-body">
    <div class="ab-placard-kicker"><span><span class="ab-jp">警告</span> Yellow alert</span><span>CAP-01 · 2.6S</span></div>
    <div class="ab-placard-title">I.K.S. Vor’cha approaching</div><div class="ab-placard-text">Klingon capital ship · hail in 2.6s</div></div></div>
  <div class="ab-placard ab-placard--alert"><div class="ab-placard-stripes"></div><div class="ab-placard-body">
    <div class="ab-placard-kicker"><span><span class="ab-jp">警報</span> Red alert</span><span>HULL 1 / 5</span></div>
    <div class="ab-placard-title">Hull critical</div><div class="ab-placard-text">One plate left. Damage control is on the next card.</div></div></div>
</div>''', style='''
.wrap { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; padding: 24px; }
''', readme='''
# Placard

A hazard label for the two alert levels, built like the warning stickers on industrial hardware: a striped band, a kicker line with the label script, a heavy title, one line of fact.

Provide: `ab-placard` plus a level class, then `ab-placard-stripes` and `ab-placard-body` holding `-kicker`, `-title` and `-text`. Add `is-live` while the alert is current: the stripes crawl (static under reduced motion).

| Level | Class | When |
|---|---|---|
| Yellow alert | `ab-placard--caution` | A capital ship is inbound (the 2.6s warning before the hail). `caution` fill, `on-caution` text. |
| Red alert | `ab-placard--alert` | One hull plate left; the hail itself. `alert` on `hull`. |

- Yellow before red, as on a starship: the warning is yellow, the engagement is red.
- `caution` is never text. It is a fill with `on-caution` on it, or nothing.
- One placard on screen at once. It sits top-centre, under the refit rail.
''')

doc('Tag', 'group="Status" height=160', f'''
<div class="wrap">
  <div class="row"><span class="ab-tag ab-tag--new">New</span><span class="ab-tag ab-tag--up">Lv 2 → 3</span><span class="ab-tag ab-tag--max">Lv 4 → Max</span><span class="ab-tag ab-tag--once">One use</span><span class="ab-tag">Hull</span></div>
  <div class="row">
    <span class="ab-tag"><i class="ab-dot ab-dot--nominal"></i>Shields 6s</span>
    <span class="ab-tag"><i class="ab-dot ab-dot--signal"></i>Phasers 4s</span>
    <span class="ab-tag"><i class="ab-dot ab-dot--alert"></i>Tractor lock</span>
    <span class="ab-reg">NCC-4733</span><span class="ab-reg">Sector 001 · Sol belt</span>
  </div>
  <div class="row"><span class="ab-tag" style="color:var(--faction-klingon)"><i class="ab-dot" style="background:var(--faction-klingon)"></i>Klingon</span><span class="ab-tag" style="color:var(--faction-cardassian)"><i class="ab-dot" style="background:var(--faction-cardassian)"></i>Cardassian</span><span class="ab-tag" style="color:var(--faction-romulan)"><i class="ab-dot" style="background:var(--faction-romulan)"></i>Romulan</span><span class="ab-tag" style="color:var(--faction-borg)"><i class="ab-dot" style="background:var(--faction-borg)"></i>Borg</span><span class="ab-tag" style="color:var(--faction-tholian)"><i class="ab-dot" style="background:var(--faction-tholian)"></i>Tholian</span></div>
</div>''', style='''
.wrap { display: grid; gap: 14px; padding: 24px; }
.row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
''', readme='''
# Tag

Small cut chips for status: the badge on a refit card, a timed power-up, a faction, a registry code.

Provide: `<span class="ab-tag">` with one to three words. Add a variant for card badges, an `ab-dot` for a live state, or use `ab-reg` for a bracketed registry code.

| Variant | Means |
|---|---|
| `ab-tag--new` | You don't own this upgrade yet (`command`) |
| `ab-tag--up` | You own it; this takes it up a level |
| `ab-tag--max` | This pick finishes the system (`nominal`) |
| `ab-tag--once` | Damage Control: one use, doesn't stack (`dilithium`) |

- A dot means something is running right now. `nominal` for shields, `signal` for overloaded phasers, `alert` for a tractor lock.
- Faction tags take the faction token for both the dot and the word.
- Registry codes (`ab-reg`) are annotation, in `ink-3`. They carry a 47 where a number is free.
''')

# ═══ INSTRUMENTS ════════════════════════════════════════════════════════════
doc('TickMeter', 'group="Instruments" height=300', f'''
<div class="wrap">
  <div class="rail"><span class="ab-rail cap">Refit <b>07</b></span><div class="ab-ticks-wrap grow"><div class="ab-ticks" style="--v:.62"></div></div><span class="cap gem">{icon('dilithium')}<span class="ab-num s">109</span><span class="ab-label">/ 176</span></span></div>
  <div class="line"><span class="ab-label">Overcharge</span><div class="ab-ticks-wrap" style="width:180px"><div class="ab-ticks" style="--v:.62"></div></div><span class="ab-key">Space</span></div>
  <div class="line"><span class="ab-label" style="color:var(--command)">Overcharge ready</span><div class="ab-ticks-wrap" style="width:180px;--on:var(--command)"><div class="ab-ticks ab-ticks--command" style="--v:1"></div></div><span class="ab-key is-on">Space</span></div>
  <div class="line"><span class="ab-label" style="color:var(--faction-klingon)">I.K.S. Vor’cha</span><div class="ab-ticks-wrap" style="width:240px;--on:var(--alert)"><div class="ab-ticks ab-ticks--alert" style="--v:.44"></div></div><span class="ab-anno">Half hull · rage</span></div>
  <div class="line"><div style="position:relative;width:260px"><div class="ab-ticks ab-ticks--tall" style="--v:.62;--off:var(--hull-3)"></div><i class="ab-cursor" style="--v:.62"></i></div><span class="ab-num s">62%</span><span class="ab-anno">Preparing refit…</span></div>
  <div class="stats">
    <span class="ab-label">Speed</span><div class="ab-pips" style="--v:1"></div>
    <span class="ab-label">Turning</span><div class="ab-pips" style="--v:.6"></div>
    <span class="ab-label">Phasers</span><div class="ab-pips" style="--v:.3"></div>
  </div>
</div>''', style='''
.wrap { display: grid; gap: 18px; padding: 24px; }
.rail { display: flex; align-items: center; gap: 12px; }
.rail .grow { flex: 1; }
.cap { color: var(--ink-2); white-space: nowrap; }
.cap b { color: var(--signal); }
.gem { display: inline-flex; align-items: baseline; gap: 6px; color: var(--dilithium); }
.gem .ab-i { align-self: center; }
.s { font-size: 20px; line-height: 20px; color: var(--signal); }
.line { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.stats { display: grid; grid-template-columns: 80px 160px; gap: 8px 14px; align-items: center; }
''', readme='''
# TickMeter

The segmented bar every quantity in the game is read from: progress to the next refit, the overcharge gauge, a capital ship's hull, a ranked stat. Segments read as a count even at a glance, which a smooth bar does not.

Provide: `<div class="ab-ticks" style="--v:.62"></div>` where `--v` is the fill from 0 to 1. Wrap it in `ab-ticks-wrap` to give the lit segments a glow on Bridge. Width comes from the container.

| Variant | Use |
|---|---|
| `ab-ticks` | `signal`: XP rail, overcharge filling |
| `ab-ticks--command` | Overcharge full: the gauge goes amber and the key cap fills |
| `ab-ticks--alert` | A capital ship's hull bar |
| `ab-ticks--tall` + `ab-cursor` | A loading or progress instrument with a cursor tick |
| `ab-pips` | Ten discrete pips for the shakedown stats, ranked: the best hull gets ten, the worst three |

- The XP rail runs the full width of the screen: progress to the next upgrade is the number a run is steered by.
- Pair every meter with its label and its figure; a meter alone is decoration.
- Fill moves tick by tick (see Motion), never as a smooth slide.
''')

doc('HullPlates', 'group="Instruments" height=150', '''
<div class="wrap">
  <figure><span class="ab-plates"><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></span><figcaption class="ab-anno">3 of 5</figcaption></figure>
  <figure><span class="ab-plates"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i></span><figcaption class="ab-anno">Full</figcaption></figure>
  <figure><span class="ab-plates is-alert"><i class="on"></i><i></i><i></i><i></i><i></i></span><figcaption class="ab-anno">Red alert · 1 left</figcaption></figure>
  <figure><span class="ab-plates big"><i class="on"></i><i class="on"></i><i></i><i></i><i></i></span><figcaption class="ab-anno">Shakedown · Nova opens on 2</figcaption></figure>
</div>''', style='''
.wrap { display: flex; flex-wrap: wrap; gap: 36px; padding: 28px 24px; align-items: flex-end; }
figure { margin: 0; display: grid; gap: 10px; }
.big i { width: 15px; height: 23px; }
''', readme='''
# HullPlates

The player's health, as five cut plates: lit plates are hull you have, unlit plates are the ceiling. The word is always *hull*, never life or HP.

Provide: `<span class="ab-plates">` with one `<i>` per plate up to `MAX_LIVES`, `class="on"` on the plates you have. Add `is-alert` at one plate: the last plate turns `alert` and blinks at 1.1s (steady under reduced motion).

- Sits beside the stardate in the bottom-left HUD chip, and on the shakedown cards.
- Ablative armour shows as a sixth plate drawn in `dilithium` outline while it is charged.
- Give the group an `aria-label` such as "Hull 3 of 5"; the plates carry no text of their own.
''')

doc('Readout', 'group="Instruments" height=150', f'''
<div class="wrap">
  <div class="ab-frame ab-chip"><span class="ab-readout"><span class="ab-label">Stardate</span><span class="ab-num">1142</span></span><span class="ab-plates"><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></span></div>
  <div class="ab-frame ab-chip"><span class="ab-readout"><span class="ab-label">Chain</span><span class="ab-num" style="color:var(--signal)">×1.16</span></span></div>
  <div class="ab-frame ab-chip is-lit"><span class="ab-readout"><span class="ab-label">{icon('dilithium')} Dilithium</span><span class="ab-num">115</span><span class="ab-label" style="color:var(--nominal)">▲ +23</span></span></div>
</div>''', style='''
.wrap { display: flex; flex-wrap: wrap; gap: 18px; padding: 28px 24px; align-items: center; }
.ab-label .ab-i { vertical-align: -2px; color: var(--dilithium); }
''', readme='''
# Readout

A label and a figure, the unit of the HUD: a quiet `label` word (it never changes) and a loud `numeral` figure (the only part worth a glance).

Provide: `<span class="ab-readout"><span class="ab-label">Stardate</span><span class="ab-num">1142</span></span>`. Put readouts in an `ab-frame ab-chip` when they sit over the field; the chip's glass keeps them legible over a lit rock or a nebula.

- Figures use tabular numerals so a counting score does not jitter.
- A change against last run is a `label` with a sign and `nominal` (gain) or `ink-3` (loss): ▲ +23, ▼ −19. Never colour alone.
- `is-lit` on the chip is for the one readout that just changed state, briefly.
''')

# ═══ CONTROLS ═══════════════════════════════════════════════════════════════
doc('Button', 'group="Controls" height=170', f'''
<div class="wrap">
  <button class="ab-btn ab-btn--command">Play again</button>
  <button class="ab-btn ab-btn--command is-focus">Launch</button>
  <button class="ab-btn ab-btn--ghost">How to fly</button>
  <button class="ab-btn ab-btn--ghost ab-btn--sm">{icon('all-stop')} All stop</button>
  <button class="ab-btn ab-btn--alert ab-btn--sm">Abandon run</button>
</div>''', style='''
.wrap { display: flex; flex-wrap: wrap; gap: 18px; padding: 32px 24px; align-items: center; }
.ab-btn.is-focus::before { background: var(--focus); inset: -4px; }
.ab-btn.is-focus::after { box-shadow: 0 0 0 2px var(--void); }
''', readme='''
# Button

An LCARS pill with its ends cut to points. One primary action per screen.

Provide: a `<button class="ab-btn">` with a variant, one to three words of label, an optional leading icon.

| Variant | Use |
|---|---|
| `ab-btn--command` | The one action the screen exists for: Launch, Play again. `command-fill` with `on-command`. |
| `ab-btn--ghost` | Secondary actions: How to fly, All stop. An `edge` outline that turns `signal` on hover. |
| `ab-btn--alert` | Leaving a run for good. Rare. |
| `ab-btn--sm` | 32px tall, for HUD controls. |

- Labels are verbs in caps, tracked wide: LAUNCH, PLAY AGAIN, ALL STOP.
- Focus is drawn in the edge layer, since the cut would clip an outline: a 2px gap, then 2px of `focus`, solid (second button above).
- Panels that freeze the run ignore input for their first 0.4s, so a key already on its way down is not an order.
''')

doc('KeyCap', 'group="Controls" height=130', '''
<div class="wrap">
  <span class="ab-key">1</span><span class="ab-key is-on">2</span><span class="ab-key">3</span>
  <span class="ab-key">Space</span><span class="ab-key is-command">Esc</span><span class="ab-key">←</span><span class="ab-key">→</span><span class="ab-key">↑</span><span class="ab-key">Tab</span>
</div>''', style='''
.wrap { display: flex; flex-wrap: wrap; gap: 10px; padding: 32px 24px; align-items: center; }
''', readme='''
# KeyCap

The key that does the thing, printed where the thing is. Desktop only: on touch, swap to the touch wording from the copy deck and drop the caps.

Provide: `<span class="ab-key">Space</span>`. `is-on` fills it (`command-fill`): this key takes the selected card, or the gauge is ready. `is-command` outlines it in `command` for the key that answers the current panel.

- Keys are named as printed on the keyboard: Space, Esc, Tab, ← →.
- Never show a key cap for an action the current device cannot make.
''')

CARDS = [
  ('gun', 'weapons', 'torpedo', 'TRP-04', 'Photon torpedo bay', 'Adds torpedoes that chase their target.', 'They fire and reload on their own.', ['4 blast damage', 'Reloads every 3.4s'], 'new', '1', True),
  ('hull', 'defence', 'deflector', 'DFL-02', 'Navigational deflector', 'Push asteroids away from your bow.', '', ['Always on'], 'new', '2', False),
  ('gun', 'weapons', 'phaser', 'PHA-07', 'Phaser array', 'Your phasers fire faster.', '', ['3.5 → 4.1 shots/sec'], 'up', '3', False),
]
def card(c, selected=None):
    cat, ic, sch, code, name, ben, cav, figs, badge, key, sel = c
    if selected is not None: sel = selected
    tag = '<span class="ab-tag ab-tag--new">New</span>' if badge == 'new' else '<span class="ab-tag ab-tag--up">Lv 1 → 2</span>'
    cav_html = f'<p class="ab-small cav">{cav}</p>' if cav else '<p class="ab-small cav"></p>'
    figs_html = ''.join(f'<span class="ab-data">{f}</span>' for f in figs)
    return (f'<article class="ab-frame ab-card ab-cat--{cat}{" is-selected" if sel else ""}">'
            f'<div class="ab-view ab-brackets">{SCH[sch]}{tag}<span class="ab-anno">{code}</span></div>'
            f'<div class="ab-card-cat">{icon(ic)}<span class="ab-label">{"Weapons" if cat=="gun" else "Defence" if cat=="hull" else "Ship"}</span><span class="ab-key{" is-on" if sel else ""}">{key}</span></div>'
            f'<h3 class="ab-head">{name}</h3><div><p class="ab-body ben">{ben}</p>{cav_html}</div>'
            f'<div class="ab-card-figs">{figs_html}</div></article>')
CARD_CSS = '''
.ab-card h3 { margin: 0; }
.ab-card .ben { margin: 0; }
.ab-card .cav { margin: 4px 0 0; }
.ab-card-cat .ab-i { color: var(--cat); font-size: 16px; }
'''
doc('UpgradeCard', 'group="Cards" height=360', f'''
<div class="wrap">{card(CARDS[0], False)}{card(CARDS[0], True)}{card(CARDS[2], False)}</div>''',
style='.wrap { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 22px; padding: 26px 24px; align-items: stretch; }' + CARD_CSS,
readme='''
# UpgradeCard

One offer on the refit panel, read top to bottom in one frozen second: schematic, category, name, benefit, then the figures pinned to the foot so three cards read across as a table.

Provide: `ab-frame ab-card` with a category class (`ab-cat--gun`, `--hull`, `--ship`), then in order: an `ab-view ab-brackets` holding the schematic SVG, a badge `ab-tag` and a code in `ab-anno`; the `ab-card-cat` row (icon, category word, key cap); the name in `ab-head`; the benefit in `ab-body`, the caveat in `ab-small`; the figures as `ab-data` lines in `ab-card-figs`. A figure that is a cost takes `is-cost` (an ↓ in `alert`, `ink` instead of `signal`).

- **The selected card says so four ways**: the edge goes `command`, the field warms, the card lifts 3px, and its key cap fills. Plus the lit block in the panel's position bar. Never colour alone.
- **Schematics.** Each system is drawn as line art in its category colour on a dot grid, from the same meshes the game renders. The painted card art in the original goes: it resembled canon ships and could not match the 3D game.
- Five nouns only, never a synonym: shot, beam, torpedo, mine, hull.
- Every benefit is one short sentence in second person, ending in a full stop.
- Caveats only where they answer "wait, how does that work?". Nine of seventeen cards have one.
''')

# ═══ SCREENS ════════════════════════════════════════════════════════════════
SCREEN = '''
html, body { height: 100%; }
body { overflow: hidden; }
.screen { position: relative; width: 960px; height: 540px; overflow: hidden; background: var(--void); }
.scene { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.frame-b { position: absolute; inset: 16px; pointer-events: none; }
'''

doc('TitleScreen', 'group="Screens" height=540 width=960', f'''
<div class="screen">
  <canvas class="scene" aria-hidden="true"></canvas>
  <div class="ab-brackets frame-b"></div>
  <header class="top">
    <span class="ab-anno">AB-47 · Tactical simulation · Build 0.1</span>
    <span class="ab-anno">Stardate 47634.4 · Sector 001</span>
  </header>
  <main class="hero">
    {wordmark(stacked=True, width=420)}
    <p class="tag">Hold the sector.</p>
    <div class="cta"><button class="ab-btn ab-btn--command">Launch</button><span class="hint"><span class="ab-key">Space</span><span class="ab-label">or tap</span></span></div>
    <div class="sec"><button class="ab-btn ab-btn--ghost ab-btn--sm">How to fly</button><button class="ab-btn ab-btn--ghost ab-btn--sm">Settings</button></div>
  </main>
  <div class="callout"><span class="ab-anno">Target · C-type</span><span class="ab-label">Dilithium 0.47 kt</span></div>
  <aside class="scale" aria-hidden="true">
    <span class="ab-jp jp">小惑星</span>
    <ul><li class="ab-anno">47°12′N</li><li class="ab-anno">31°06′N</li><li class="ab-anno">VEL 0</li><li class="ab-anno">HDG 047</li><li class="ab-anno">R 1.4 AU</li></ul>
  </aside>
  <footer class="bot">
    <span class="keys"><span class="ab-key">←</span><span class="ab-key">→</span><span class="ab-label">Helm</span><span class="ab-key">↑</span><span class="ab-label">Impulse</span><span class="ab-key">Space</span><span class="ab-label">Overcharge</span></span>
    <span class="ab-rail sector">Sector 001 · Sol belt</span>
  </footer>
</div>''', style=SCREEN + '''
.top, .bot { position: absolute; left: 40px; right: 40px; display: flex; justify-content: space-between; align-items: center; }
.top { top: 26px; }
.bot { bottom: 28px; }
.hero { position: absolute; left: 64px; top: 104px; display: grid; gap: 20px; justify-items: start; }
.tag { margin: 4px 0 6px; font: 500 22px/1 var(--font-display); letter-spacing: .06em; color: var(--ink-2); }
.cta { display: flex; align-items: center; gap: 18px; }
.cta .ab-btn { --h: 52px; font-size: 16px; padding-inline: 46px; }
.hint { display: inline-flex; gap: 8px; align-items: center; }
.sec { display: flex; gap: 12px; }
.callout { position: absolute; left: 784px; top: 76px; display: grid; gap: 3px; }
.scale { position: absolute; right: 40px; top: 210px; display: grid; justify-items: end; gap: 14px; }
.jp { writing-mode: vertical-rl; font-size: 15px; letter-spacing: .3em; color: var(--ink-3); }
.scale ul { list-style: none; margin: 0; padding: 0 12px 0 0; border-right: 1px solid var(--rule-2); display: grid; gap: 16px; text-align: right; }
.scale li { position: relative; }
.scale li::after { content: ""; position: absolute; right: -16px; top: 5px; width: 7px; height: 1px; background: var(--rule-2); }
.keys { display: inline-flex; gap: 6px; align-items: center; }
.keys .ab-label { margin-right: 12px; }
.sector { color: var(--ink-2); }
''', script=scene("{seed: 4, stars: 300, rocks: [[0.71, 0.5, 112], [0.96, 0.84, 30], [0.56, 0.17, 10], [0.46, 0.07, 9]], ring: {x: 0.71, y: 0.52, r: 196, tilt: -0.36}, shards: [[0.585, 0.66], [0.6, 0.71], [0.62, 0.65]], ship: {x: 0.535, y: 0.76, scale: 1.25}, leaders: [[0.785, 0.27, 0.815, 0.205, 0.955]]}"),
readme='''
# TitleScreen

The first screen: the stacked wordmark, the tagline, one command button. Behind it a single crystal asteroid sits inside a tilted orbit, the moment before the first shot.

Composition: the wordmark hard left at 420px; the tagline in Tektur at 22px, `ink-2`; LAUNCH as the only `command` element on screen; secondary actions as small ghost buttons under it. The right edge carries a measured scale with the label script set vertically, as on a technical drawing. Every annotation is true for this screen: stardate, sector, heading, the target rock's dilithium yield.

- The scene is the 3D sector, rendered live. The canvas here is a stand-in.
- One callout, with a leader line, on the hero rock. It names the thing; it does not decorate it.
- On a phone: the wordmark centres at 80% of the width, LAUNCH goes full width at the bottom with "Tap to launch", and the scale is dropped.
''')

doc('HUD', 'group="Screens" height=540 width=960', f'''
<div class="screen">
  <canvas class="scene" aria-hidden="true"></canvas>
  <div class="ab-brackets frame-b"></div>
  <div class="xp"><span class="ab-rail cap">Refit <b>07</b></span><div class="ab-ticks-wrap grow"><div class="ab-ticks" style="--v:.62"></div></div><span class="cap gem">{icon('dilithium')}<span class="ab-num s">109</span><span class="ab-label">/ 176</span></span></div>
  <button class="ab-btn ab-btn--ghost ab-btn--sm stop">{icon('all-stop')} All stop <span class="ab-key">Esc</span></button>
  <div class="boss ab-brackets is-target">
    <div class="bname"><i class="ab-dot" style="background:var(--faction-klingon)"></i><span class="ab-label" style="color:var(--faction-klingon)">I.K.S. Vor’cha</span></div>
    <div class="ab-ticks-wrap" style="--on:var(--alert)"><div class="ab-ticks ab-ticks--alert" style="--v:.7;height:8px"></div></div>
    <span class="ab-anno">Klingon · capital · 31s</span>
  </div>
  <span class="ab-anno telemetry">VEL 312 · HDG 047 · 47°12′N · Graze ×3</span>
  <div class="hud">
    <div class="ab-frame ab-chip"><span class="ab-readout"><span class="ab-label">Stardate</span><span class="ab-num">1142</span></span><span class="ab-plates" aria-label="Hull 3 of 5"><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></span></div>
    <div class="ab-frame ab-chip"><span class="ab-label">{icon('overcharge')} Overcharge</span><div class="ab-ticks-wrap" style="width:150px"><div class="ab-ticks" style="--v:.62"></div></div><span class="ab-key">Space</span></div>
    <div class="ab-frame ab-chip"><span class="ab-readout"><span class="ab-label">Chain</span><span class="ab-num" style="color:var(--signal)">×1.16</span></span></div>
  </div>
</div>''', style=SCREEN + '''
.xp { position: absolute; left: 0; right: 0; top: 0; height: 34px; display: flex; align-items: center; gap: 14px; padding: 0 24px;
  background: color-mix(in srgb, var(--hull) 78%, transparent); border-bottom: 1px solid var(--rule-2); }
.xp .grow { flex: 1; }
.cap { color: var(--ink-2); white-space: nowrap; }
.cap b { color: var(--signal); }
.gem { display: inline-flex; align-items: baseline; gap: 6px; color: var(--dilithium); }
.gem .ab-i { align-self: center; }
.s { font-size: 20px; line-height: 20px; color: var(--signal); }
.stop { position: absolute; right: 30px; top: 50px; }
.stop .ab-key { margin-left: 6px; height: 18px; min-width: 0; font-size: 9px; }
.boss { position: absolute; left: 700px; top: 150px; width: 196px; padding: 10px 12px; display: grid; gap: 7px;
  background-color: color-mix(in srgb, var(--hull) 70%, transparent); }
.bname { display: flex; align-items: center; gap: 8px; }
.telemetry { position: absolute; left: 32px; bottom: 76px; }
.hud { position: absolute; left: 24px; right: 24px; bottom: 22px; display: flex; justify-content: space-between; align-items: center; }
.ab-label .ab-i { vertical-align: -2px; color: var(--signal); }
''', script=scene("{seed: 9, rocks: [[0.12, 0.3, 30], [0.2, 0.7, 18], [0.36, 0.22, 14], [0.33, 0.6, 24], [0.62, 0.82, 16], [0.86, 0.66, 28], [0.75, 0.47, 12], [0.05, 0.58, 22], [0.48, 0.12, 20]], shards: [[0.28, 0.48], [0.3, 0.52], [0.27, 0.53]], burst: [0.3, 0.5], enemies: [[0.66, 0.2, 1.9, 2.6, 'faction-klingon', 1], [0.2, 0.46, 1, 1.2, 'faction-klingon'], [0.9, 0.52, 1, -1.9, 'faction-klingon', 1]], ship: {x: 0.5, y: 0.56, scale: 1.4, orbit: 0.62, bolts: [[-2, -40, 0, -16], [-2, -72, 0, -16], [6, -54, 4, -14]]}, leaders: [[0.66, 0.2, 0.71, 0.28, 0.729]]}"),
readme='''
# HUD

The in-run heads-up display. Three rules decide where everything goes: progress across the top, what's in your hand along the bottom, and only the capital ship gets a label in the world.

- **Top: the refit rail.** Full width, because progress to the next upgrade is the number a run is steered by. REFIT in `rail-label`, the meter in `signal`, the dilithium count in `dilithium` and `signal`.
- **Bottom: three chips.** What I'm flying (stardate and hull plates), what I can do next (overcharge and its key), what I'm scoring (chain). Each sits on `hull` glass so it stays legible over a lit rock or a nebula.
- **In the world: one callout.** The capital ship carries its name, hull meter and fuse on a tag with a leader line, in target-lock brackets. Off screen, the tag pins to the nearest edge with an arrow. Ordinary enemies are never labelled.
- **The overcharge ring** lives under the ship in the world as well as in the bottom chip: 28 segments on a tilted orbit that light as near misses charge it. The player's eyes are on the ship, so the gauge goes there too.
- **Telemetry** in `annotation` above the bottom-left chip shows true values: velocity, heading, graze count. It is texture that rewards a look.
- The viewscreen frame is four brackets with open sides, so rocks can cross the edge.
- Mobile: see MobileHUD.
''')

doc('RefitPanel', 'group="Screens" height=540 width=960', f'''
<div class="screen">
  <canvas class="scene" aria-hidden="true"></canvas>
  <section class="ab-elbow is-lit panel"><i class="ab-elbow-l"></i>
    <div class="ab-elbow-head">
      <div class="ab-elbow-code">{mark(34)}<span class="ab-anno">Console 05<br>Refit 5 of ∞</span></div>
      <div class="ab-elbow-title"><div class="ab-title">Field refit <span class="ab-jp">改装</span></div><div class="ab-sub">Refit <b>5</b> · choose one upgrade</div></div>
    </div>
    <div class="pos" aria-hidden="true"><i class="on"></i><i></i><i></i></div>
    <div class="cards">{card(CARDS[0])}{card(CARDS[1])}{card(CARDS[2])}</div>
    <footer class="foot"><span class="ab-label">Choose an upgrade</span><span class="ab-key">1</span><span class="ab-key">2</span><span class="ab-key">3</span><span class="ab-anno sp">Tab moves · Enter takes</span></footer>
  </section>
</div>''', style=SCREEN + CARD_CSS + '''
.panel { position: absolute; left: 36px; right: 36px; top: 26px; bottom: 26px; display: grid; grid-template-rows: auto auto 1fr auto; gap: 14px;
  padding-top: 26px; padding-bottom: 18px; filter: drop-shadow(0 16px 40px rgba(0,0,0,calc(var(--ab-glow) * .5))); }
.ab-title .ab-jp { font-size: .6em; vertical-align: .25em; margin-left: 8px; color: var(--ink-3); }
.ab-elbow-code .ab-anno { line-height: 14px; }
.pos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
.pos i { height: 4px; background: var(--signal-ghost); }
.pos i.on { background: var(--command); }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; min-height: 0; }
.foot { display: flex; align-items: center; gap: 8px; }
.foot .sp { margin-left: auto; }
.ab-card .ab-view { height: 104px; }
''', script=scene("{seed: 9, rocks: [[0.12, 0.3, 30], [0.33, 0.6, 24], [0.86, 0.66, 28]], ship: {x: 0.5, y: 0.56, scale: 1.4}, dim: 0.62}"),
readme='''
# RefitPanel

Opens the instant the refit rail fills and freezes the field: three cards rolled fresh each time, one pick, no confirm step.

Built from an `ab-elbow is-lit` at 96% of the screen width; the mark and a console code at the left end, FIELD REFIT hard right with the label script and the sub-line; a position bar of one block per card (the lit block is the card you are on, in `command`); three UpgradeCards; the key legend on the left of the foot.

- Input: 1 2 3 take a card outright; Tab and Shift+Tab move the selection inside the panel; Enter takes it. Arrows and Space do nothing: they are flight keys and one is usually held when the panel opens.
- The panel ignores input for its first 0.4s while the cards come up.
- Salvage from a capital ship uses the same panel titled BATTLE SALVAGE, sub-line "Hull broken · choose one upgrade", without a refit number.
- Layouts: three columns above 980px wide; one column with compact cards below that; three short columns when the window is under 420px tall. The panel never scrolls.
''')

doc('Hail', 'group="Screens" height=540 width=960', f'''
<div class="screen">
  <canvas class="scene" aria-hidden="true"></canvas>
  <section class="ab-elbow is-alert panel"><i class="ab-elbow-l"></i>
    <div class="ab-placard-stripes band" style="--stripe-a:var(--alert);--stripe-b:var(--hull)"></div>
    <div class="ab-elbow-head">
      <div class="ab-elbow-code">{icon('capital', 'cap-i')}<span class="ab-anno">Contact 02<br>Bearing 047 · 2.6 AU</span></div>
      <div class="ab-elbow-title"><div class="ab-title">Red alert <span class="ab-jp">警報</span></div><div class="ab-sub"><b style="color:var(--faction-klingon)">I.K.S. Vor’cha</b> · on intercept course</div></div>
    </div>
    <div class="opts">
      <button class="ab-frame opt is-selected">
        <span class="verb"><em>Engage</em><span class="ab-key is-on">1</span></span>
        <span class="ab-head">Stand and fight</span>
        <span class="ab-body">She’ll fight back, and her escorts attack together.</span>
        <span class="lines"><span class="ab-data">+1800 stardate</span><span class="ab-data">Battle salvage · one upgrade</span><span class="ab-data">+2 hull · dilithium · a power-up</span></span>
      </button>
      <button class="ab-frame opt">
        <span class="verb"><em>Evade</em><span class="ab-key">2</span></span>
        <span class="ab-head">Break away</span>
        <span class="ab-body">You get clear, but you can’t break away twice running.</span>
        <span class="lines"><span class="ab-data">No bounty · no refit</span><span class="ab-data">Next contact in 37s</span><span class="ab-data">Evasive burn · 2.6s</span></span>
      </button>
    </div>
    <footer class="foot"><span class="ab-label">Give the order</span><span class="ab-key">1</span><span class="ab-key">2</span></footer>
  </section>
</div>''', style=SCREEN + '''
.panel { position: absolute; left: 110px; right: 110px; top: 50px; bottom: 50px; display: grid; grid-template-rows: auto auto 1fr auto; gap: 16px; padding-top: 18px; }
.band { height: 6px; margin: 0 -8px 2px 0; }
.cap-i { font-size: 30px; color: var(--alert); }
.ab-elbow-code .ab-anno { line-height: 14px; }
.ab-title .ab-jp { font-size: .6em; vertical-align: .25em; margin-left: 8px; color: var(--ink-3); }
.opts { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.opt { --c: var(--cut-md); display: grid; align-content: start; gap: 10px; padding: 18px 20px; text-align: left; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
.opt.is-selected { --frame-edge: var(--command); --frame-fill: color-mix(in srgb, var(--command) 7%, var(--hull-2));
  filter: drop-shadow(0 0 18px color-mix(in srgb, var(--command) calc(var(--ab-glow) * 30%), transparent)); }
.verb { display: flex; justify-content: space-between; align-items: center; }
.verb em { font: 800 30px/1 var(--font-display); font-style: normal; letter-spacing: .06em; text-transform: uppercase; color: var(--command); }
.opt:not(.is-selected) .verb em { color: var(--ink); }
.lines { display: grid; gap: 3px; padding-top: 10px; border-top: 1px solid var(--rule); }
.foot { display: flex; align-items: center; gap: 8px; }
''', script=scene("{seed: 9, rocks: [[0.12, 0.3, 30], [0.86, 0.66, 28]], enemies: [[0.7, 0.24, 2.4, 2.6, 'faction-klingon']], ship: {x: 0.5, y: 0.6, scale: 1.4}, dim: 0.58}"),
readme='''
# Hail

The one decision in a run that is not an upgrade. A capital ship is announced (yellow alert, see Placard), then the field halts on two choices: hold the sector, or break away.

Built from an `ab-elbow is-alert`, an alert stripe band along the rail, RED ALERT hard right with the ship's name in its faction token, and two option buttons as `ab-frame`s. The fight option is selected by default and carries the `command` treatment; Evade sits at rest.

- The two sides stay uneven in opposite directions, and the copy says so plainly: the bounty on one side, the cost in tempo on the other. The figures are this contact's real figures.
- When Evade is locked (just fled, or a Borg cube) its card drops to `ink-3`, its key cap goes, and its lines read "Not available · Recharges after a fight" or "No escape from a cube".
- Romulans never hail: their warning placard reads "decloaking" and the fight starts.
- Keys: 1 or F engages, 2 or E evades. Held keys never answer.
''')

def hull_card(n, role, cls, reg, length, sch, speed, turn, phas, plates, weapon_icon, opens, figs, tagline, sel=False):
    plates_html = ''.join('<i class="on"></i>' if i < plates else '<i></i>' for i in range(5))
    figs_html = ''.join(f'<span class="ab-data">{f}</span>' for f in figs)
    return (f'<article class="ab-frame hullc{" is-selected" if sel else ""}">'
            f'<div class="hc-top"><span class="num">{n}</span><div class="hc-id"><span class="ab-label">{role}</span><span class="ab-head">{cls}</span><span class="ab-reg">{reg}</span></div></div>'
            f'<div class="hc-view ab-brackets ab-cat--hull">{SCH[sch]}<span class="ab-anno len">L {length} M</span></div>'
            f'<div class="hc-stats"><span class="ab-label">Speed</span><div class="ab-pips" style="--v:{speed}"></div>'
            f'<span class="ab-label">Turning</span><div class="ab-pips" style="--v:{turn}"></div>'
            f'<span class="ab-label">Phasers</span><div class="ab-pips" style="--v:{phas}"></div>'
            f'<span class="ab-label">Hull</span><span class="ab-plates">{plates_html}</span></div>'
            f'<p class="ab-body opens">{icon(weapon_icon)} {opens}</p><div class="hc-figs">{figs_html}</div>'
            f'<p class="ab-small tl">{tagline}</p></article>')

doc('Shakedown', 'group="Screens" height=540 width=960', f'''
<div class="screen">
  <canvas class="scene" aria-hidden="true"></canvas>
  <section class="ab-elbow is-command panel"><i class="ab-elbow-l"></i>
    <div class="ab-elbow-head">
      <div class="ab-elbow-code">{mark(34)}<span class="ab-anno">Drydock 47<br>Three on the pad</span></div>
      <div class="ab-elbow-title"><div class="ab-title">Shakedown <span class="ab-jp">艦橋</span></div><div class="ab-sub">Three hulls on the pad · they fly differently</div></div>
    </div>
    <div class="hulls">
      {hull_card('01', 'Escort', 'Defiant class', 'NX-4720', '170', 'escort', 1, .6, .6, 3, 'torpedo', 'You start with torpedoes that chase their target.', ['4 blast damage', 'Reloads every 3.4s'], 'Quick, thin-skinned, built to close the distance.')}
      {hull_card('02', 'Cruiser', 'Sovereign class', 'NCC-4733', '685', 'cruiser', .3, .3, 1, 4, 'weapons', 'You start with a wide spread of beams.', ['3 beams per shot', '3.5 shots/sec'], 'Heavy, patient, hard to put a hole in.', True)}
      {hull_card('03', 'Scout', 'Nova class', 'NCC-4747', '165', 'scout', .7, 1, .3, 2, 'mine', 'You start with mines that wait in your wake.', ['5 blast damage', 'Lays every 4.2s'], 'Turns on a coin. Two plates and no second chances.')}
    </div>
    <footer class="foot"><span class="ab-label">Choose a hull</span><span class="ab-key">1</span><span class="ab-key is-on">2</span><span class="ab-key">3</span></footer>
  </section>
</div>''', style=SCREEN + '''
.panel { position: absolute; left: 30px; right: 30px; top: 18px; bottom: 18px; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 12px; padding-top: 20px; padding-bottom: 14px; }
.ab-elbow-code .ab-anno { line-height: 14px; }
.ab-title .ab-jp { font-size: .6em; vertical-align: .25em; margin-left: 8px; color: var(--ink-3); }
.hulls { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; min-height: 0; }
.hullc { --c: var(--cut-md); display: grid; grid-template-rows: auto auto auto auto 1fr auto; gap: 6px; padding: 10px 14px 10px; min-height: 0; }
.hullc.is-selected { --frame-edge: var(--command); --frame-fill: color-mix(in srgb, var(--command) 7%, var(--hull-2)); transform: translateY(-3px);
  filter: drop-shadow(0 0 18px color-mix(in srgb, var(--command) calc(var(--ab-glow) * 30%), transparent)); }
.hc-top { display: flex; gap: 12px; align-items: center; }
.num { font: 700 40px/.8 var(--font-rail); color: var(--rule-2); -webkit-text-stroke: 1px var(--ink-3); color: transparent; }
.hullc.is-selected .num { -webkit-text-stroke: 1px var(--command); }
.hc-id { display: grid; gap: 2px; }
.hc-id .ab-head { font-size: 16px; line-height: 18px; }
.hc-view { position: relative; height: 82px; padding: 4px; background: radial-gradient(color-mix(in srgb, var(--signal) 20%, transparent) .8px, transparent 1px) 0 0 / 12px 12px, var(--hull); }
.hc-view svg { width: 100%; height: 100%; display: block; }
.len { position: absolute; left: 10px; bottom: 6px; }
.hc-stats { display: grid; grid-template-columns: 68px 1fr; gap: 4px 10px; align-items: center; }
.hc-stats .ab-label { font-size: 9px; }
.hc-stats .ab-plates i { width: 9px; height: 14px; }
.opens { margin: 0; font-size: 12px; line-height: 16px; color: var(--ink); }
.opens .ab-i { color: var(--command); vertical-align: -2px; }
.hc-figs { display: flex; flex-wrap: wrap; gap: 2px 14px; align-self: start; }
.hc-figs .ab-data { font-size: 11px; }
.tl { margin: 0; padding-top: 5px; border-top: 1px solid var(--rule); font-size: 11px; line-height: 15px; }
.foot { display: flex; align-items: center; gap: 8px; }
''', script=scene("{seed: 2, rocks: [[0.1, 0.2, 26], [0.9, 0.8, 30]], dim: 0.66}"),
readme='''
# Shakedown

The hull pick, once per run, before anything moves. It is laid out as a spec sheet, because the three hulls really do fly differently and the sheet is where that is shown.

Each column is an `ab-frame`: an outlined index numeral in `rail` (01 02 03), role, class and registry; a plan-view schematic in brackets with its length; three ranked pip rows (best gets ten, worst three); hull plates; the opening weapon in a sentence with its figures; and a tag line in the voice a crew would use about the ship.

- The panel uses `ab-elbow is-command`: this is the one panel about the ship itself.
- Colour stays categorical here. The selected hull takes `command`; the schematics are `signal` because they are ours.
- Lengths are the classes' canon lengths. Registries are invented and carry a 47.
- The Nova opens on two plates, so its card says so twice: in the plate row and in its tag line.
''')

doc('HullBreach', 'group="Screens" height=540 width=960', f'''
<div class="screen">
  <canvas class="scene" aria-hidden="true"></canvas>
  <section class="ab-elbow is-alert panel"><i class="ab-elbow-l"></i>
    <div class="top">
      <div class="hero">
        <div class="ab-title t">Hull breach <span class="ab-jp">船体損傷</span></div>
        <span class="ab-label">Stardate</span>
        <span class="big">7072</span>
        <span class="ab-label sub">145s adrift · refit 4 · <b>new best</b></span>
      </div>
      <div class="tiles">
        <div class="ab-frame tile"><span class="ab-label">{icon('chain')} Best chain</span><span class="ab-num">13</span><span class="ab-anno">▼ −19 · best 32</span></div>
        <div class="ab-frame tile is-up"><span class="ab-label">{icon('dilithium')} Dilithium</span><span class="ab-num">115</span><span class="ab-anno up">▲ +23 · best 92</span></div>
        <div class="ab-frame tile"><span class="ab-label">{icon('overcharge')} Overcharges</span><span class="ab-num">2</span><span class="ab-anno">▲ +2 · best 0</span></div>
        <div class="ab-frame tile"><span class="ab-label">{icon('capital')} Capital ships</span><span class="ab-num">1</span><span class="ab-anno">Matched · best 1</span></div>
      </div>
    </div>
    <figure class="chart">
      <figcaption><span class="ab-label">Run performance</span><span class="key"><i class="k-run"></i><span class="ab-anno">This run</span><i class="k-best"></i><span class="ab-anno">Previous best</span></span></figcaption>
      <svg viewBox="0 0 820 130" preserveAspectRatio="none" aria-label="Stardate over time: this run 7072 at 145s, previous best 4203 at 82s">
        <g class="grid"><line x1="40" x2="810" y1="10" y2="10"/><line x1="40" x2="810" y1="47" y2="47"/><line x1="40" x2="810" y1="84" y2="84"/><line x1="40" x2="810" y1="121" y2="121"/></g>
        <g class="ax"><text x="32" y="13">8k</text><text x="32" y="50">6k</text><text x="32" y="87">3k</text><text x="32" y="124">0</text>
          <text x="40" y="130" class="t0">0</text><text x="290" y="130">50s</text><text x="540" y="130">100s</text><text x="790" y="130">150s</text></g>
        <path class="best" d="M40 121 L90 118 L140 113 L190 108 L240 100 L290 92 L340 84 L380 77 L450 70"/>
        <path class="run" d="M40 121 L80 119 L130 117 L180 113 L230 109 L280 104 L330 99 L380 92 L430 86 L480 78 L530 69 L580 58 L630 48 L680 40 L730 33 L765 29"/>
        <circle class="end" cx="765" cy="29" r="3.5"/>
      </svg>
    </figure>
    <div class="act"><button class="ab-btn ab-btn--command">Play again</button></div>
  </section>
</div>''', style=SCREEN + '''
.panel { position: absolute; left: 60px; right: 60px; top: 34px; bottom: 34px; display: grid; grid-template-rows: auto 1fr auto; gap: 14px; padding-top: 22px; padding-bottom: 18px; }
.top { display: grid; grid-template-columns: 1fr 1.25fr; gap: 28px; align-items: start; }
.hero { display: grid; gap: 4px; justify-items: start; }
.t { color: var(--alert); font-size: 24px; margin-bottom: 10px; }
.t .ab-jp { font-size: .6em; vertical-align: .25em; margin-left: 8px; color: var(--ink-3); }
.big { font: 700 104px/.9 var(--font-rail); color: var(--ink); font-variant-numeric: tabular-nums; }
.sub { color: var(--signal); margin-top: 8px; }
.sub b { font-weight: 500; color: var(--nominal); }
.tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tile { --c: var(--cut-sm); display: grid; gap: 4px; padding: 10px 14px; }
.tile.is-up { --frame-edge: var(--nominal); }
.tile .ab-label .ab-i { vertical-align: -2px; }
.tile .up { color: var(--nominal); }
.chart { margin: 0; display: grid; grid-template-rows: auto 1fr; gap: 6px; min-height: 0; }
.chart figcaption { display: flex; justify-content: space-between; align-items: center; }
.key { display: inline-flex; gap: 6px; align-items: center; }
.key i { width: 16px; height: 2px; display: inline-block; }
.k-run { background: var(--signal); }
.k-best { background: repeating-linear-gradient(90deg, var(--ink-3) 0 4px, transparent 4px 7px); margin-left: 10px; }
.chart svg { width: 100%; height: 100%; display: block; }
.grid line { stroke: var(--rule); stroke-width: 1; vector-effect: non-scaling-stroke; }
.ax text { fill: var(--ink-3); font: 400 8px var(--font-mono); text-anchor: end; }
.ax text.t0 { text-anchor: start; }
.best { fill: none; stroke: var(--ink-3); stroke-width: 1.5; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
.run { fill: none; stroke: var(--signal); stroke-width: 2; vector-effect: non-scaling-stroke; }
.end { fill: var(--signal); }
.act { display: flex; justify-content: center; }
''', script=scene("{seed: 5, rocks: [[0.15, 0.25, 30], [0.85, 0.75, 26]], dim: 0.6}"),
readme='''
# HullBreach

The end of a run, as a report: the final stardate, four tiles that compare this run with your best, the run's curve against the best run's curve, and one button.

Built from an `ab-elbow is-alert`. HULL BREACH in `alert` with the label script; STARDATE as a `label`; the figure in `numeral-xl`; the summary line in `signal` with "new best" in `nominal`. Tiles are `ab-frame`s with `cut-sm`; a tile that beat its best takes a `nominal` edge and a ▲ figure. The chart draws this run in `signal` and the previous best dashed in `ink-3`, on `rule` gridlines.

- Play again is the only way out, and it is a real button. A run ends with keys held, so "press any key" would start the next run before this one was read.
- Focus lands on Play again when the panel opens; the panel ignores input for 0.4s.
- The chart is labelled for screen readers with the two end values.
''')

doc('MobileHUD', 'group="Screens" height=760 width=390', f'''
<div class="phone">
  <canvas class="scene" aria-hidden="true"></canvas>
  <div class="xp"><span class="ab-rail cap">Refit <b>07</b></span><div class="ab-ticks-wrap grow"><div class="ab-ticks" style="--v:.62;height:10px"></div></div><span class="cap gem">{icon('dilithium')}<span class="ab-label n">109</span></span></div>
  <div class="row">
    <div class="ab-frame ab-chip c"><span class="ab-readout"><span class="ab-label">Stardate</span><span class="ab-num">1142</span></span><span class="ab-plates"><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></span></div>
    <div class="right">
      <button class="ab-frame stop" aria-label="All stop">{icon('all-stop')}</button>
      <div class="ab-frame ab-chip c"><span class="ab-readout"><span class="ab-label">Chain</span><span class="ab-num" style="color:var(--signal)">×1.16</span></span></div>
    </div>
  </div>
  <div class="stick"><i class="knob"></i></div>
  <button class="release" aria-label="Release overcharge, 62 percent charged"><span class="ring"></span><span class="lbl">{icon('overcharge')}<span>Release</span></span></button>
  <span class="ab-anno hint">Drag anywhere to steer</span>
</div>''', style='''
html, body { height: 100%; }
body { overflow: hidden; }
.phone { position: relative; width: 390px; height: 760px; overflow: hidden; background: var(--void); }
.scene { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.xp { position: absolute; left: 0; right: 0; top: 0; height: 40px; padding: 0 14px; display: flex; align-items: center; gap: 10px;
  background: color-mix(in srgb, var(--hull) 80%, transparent); border-bottom: 1px solid var(--rule-2); }
.xp .grow { flex: 1; }
.cap { color: var(--ink-2); white-space: nowrap; font-size: 13px; }
.cap b { color: var(--signal); }
.gem { display: inline-flex; align-items: center; gap: 4px; color: var(--dilithium); }
.gem .n { color: var(--signal); letter-spacing: .06em; }
.row { position: absolute; left: 12px; right: 12px; top: 52px; display: flex; justify-content: space-between; align-items: flex-start; }
.c { padding: 6px 10px; gap: 10px; }
.c .ab-num { font-size: 22px; line-height: 22px; }
.c .ab-label { font-size: 9px; }
.c .ab-plates i { width: 8px; height: 13px; }
.right { display: grid; justify-items: end; gap: 8px; }
.stop { --c: var(--cut-sm); --frame-edge: var(--edge); width: 40px; height: 40px; border: 0; background: none; color: var(--ink); font-size: 18px; display: grid; place-items: center; }
.stick { position: absolute; left: 26px; bottom: 44px; width: 140px; height: 140px; border-radius: var(--radius-round);
  border: 1px solid color-mix(in srgb, var(--signal) 50%, transparent); background: color-mix(in srgb, var(--hull) 60%, transparent); }
.knob { position: absolute; left: 50%; top: 50%; width: 44%; height: 44%; border-radius: var(--radius-round); transform: translate(-30%, -78%);
  background: color-mix(in srgb, var(--signal) 32%, transparent); border: 1px solid var(--signal); }
.release { --sz: 108px; position: absolute; right: 24px; bottom: 60px; width: var(--sz); height: var(--sz); border: 0; padding: 0; background: none; cursor: pointer; color: var(--ink-2); }
.release::before { content: ""; position: absolute; inset: 0; background: var(--edge);
  clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%); }
.release::after { content: ""; position: absolute; inset: 1.5px; background: var(--hull);
  clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%); }
.ring { position: absolute; inset: 8px; z-index: 1; background: conic-gradient(var(--signal) 0 62%, var(--signal-ghost) 0);
  -webkit-mask: radial-gradient(closest-side, transparent 84%, #000 85% 100%), repeating-conic-gradient(#000 0 8deg, transparent 8deg 12deg);
  -webkit-mask-composite: source-in; mask: radial-gradient(closest-side, transparent 84%, #000 85% 100%) intersect, repeating-conic-gradient(#000 0 8deg, transparent 8deg 12deg); border-radius: var(--radius-round); }
.lbl { position: absolute; inset: 0; z-index: 2; display: grid; place-content: center; justify-items: center; gap: 4px; font: 500 10px/1 var(--font-mono); letter-spacing: .2em; text-transform: uppercase; }
.lbl .ab-i { font-size: 18px; color: var(--signal); }
.hint { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; }
''', script=scene("{seed: 12, stars: 200, rocks: [[0.18, 0.3, 26], [0.8, 0.22, 18], [0.3, 0.62, 16], [0.84, 0.55, 30], [0.12, 0.66, 14]], enemies: [[0.66, 0.36, 1.2, 2.4, 'faction-klingon', 1]], shards: [[0.45, 0.3], [0.48, 0.33]], ship: {x: 0.5, y: 0.5, scale: 1.3, orbit: 0.62, bolts: [[-2, -40, 0, -14], [-2, -66, 0, -14]]}}"),
readme='''
# MobileHUD

The HUD at phone size, portrait. The thumbs own the bottom third, so everything you read moves to the top and everything you press moves to the bottom.

- **Top:** the refit rail at 40px, then the stardate and hull chip on the left and All stop over the chain chip on the right. Respect the top safe-area inset.
- **Bottom left: the stick.** It floats: the whole screen is its catchment, so the ring comes to the thumb. It rests here as an affordance. It is one of the three round things in the system.
- **Bottom right: Release.** An octagon, and it doubles as the overcharge gauge: 30 segments round its face fill as you graze, and the button turns `command` with a filled label when the gauge is full. One control, one gauge, under the thumb that uses it.
- Barrel roll on touch is a quick swipe with the stick thumb (decided in M1).
- Keep the bottom safe-area inset clear; on iPhone the stick sits 44px above it.
''')

def write():
    os.makedirs(OUT, exist_ok=True)
    for name, (html, readme) in COMPS.items():
        d = os.path.join(OUT, name); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'preview.html'), 'w').write(html)
        open(os.path.join(d, 'README.md'), 'w').write(readme)
    return list(COMPS)

if __name__ == '__main__':
    print(write())
