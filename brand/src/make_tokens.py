import json
B, D = 'bridge', 'drydock'
def c(name, bridge, drydock, usage):
    v = bridge if drydock is None else {B: bridge, D: drydock}
    return {"name": name, "value": v, "usage": usage}

colors = [
  # grounds
  c('void',   '#03060B', '#E7EBEA', 'The ground: deep space in a run, the page behind every panel. Bridge is near-black with a teal bias; Drydock is a cool paper grey.'),
  c('hull',   '#08101A', '#F7F9F8', 'Panel glass: refit, hail, pause and summary panels, HUD chips.'),
  c('hull-2', '#0E1925', '#FFFFFF', 'Raised inside a panel: cards, tiles, the schematic viewport.'),
  c('hull-3', '#15232F', '#EEF2F2', 'Hover and pressed fill on hull-2; the unlit tick of a meter on paper.'),
  # lines
  c('rule',   '#8CE3F21F', '#0A141C24', 'Hairlines: dividers, chart grid, panel interiors. Never a control border (under 3:1).'),
  c('rule-2', '#8CE3F247', '#0A141C4D', 'Stronger hairline: corner brackets at rest, unlit panel edges, card edges at rest.'),
  c('edge',   '#3E8798',   '#728390',   'Control borders that must be seen: ghost buttons, key caps, inputs. At least 3:1 on void, hull and hull-2.'),
  # text
  c('ink',    '#E8F3F7', '#0A141C', 'Primary text and figures on void, hull and hull-2.'),
  c('ink-2',  '#93A9B8', '#3E4F5B', 'Secondary text: benefit sentences, hints, axis labels, on void, hull and hull-2.'),
  c('ink-3',  '#6F8798', '#56677A', 'Tertiary text: caveats, annotation texture, unlit labels. Passes 4.5:1 on all three grounds; keep it at 9px or more.'),
  # signals
  c('signal', '#00F0FF', '#00707D', 'Cyan: everything that is ours. The ship, its fire, the XP rail, lit panel edges, figures on cards. As text on void, hull and hull-2.'),
  c('on-signal', '#00141A', '#FFFFFF', 'Text and icons on a signal fill.'),
  c('signal-ghost', '#00F0FF29', '#00707D29', 'Unlit ticks of a signal meter; the faint wash inside a selected HUD chip.'),
  c('command', '#FF9F43', '#B54700', 'Amber: the player\'s hand. Selection, focus, the primary action, key caps you can press now. As text on void, hull and hull-2.'),
  c('command-fill', '#FF9F43', '#FF6A1F', 'Amber as a fill: the primary button, a filled key cap, the cover block. Always with on-command text.'),
  c('on-command', '#1C0E00', '#1C0E00', 'Text on command-fill, both themes.'),
  c('dilithium', '#C77DFF', '#7434C2', 'Violet: the field. Asteroid edges, dilithium crystals, the XP gem icon, the Ship upgrade category. As text on void, hull and hull-2.'),
  c('on-dilithium', '#14051F', '#FFFFFF', 'Text on a dilithium fill.'),
  # alert levels
  c('caution', '#FFD23F', '#FFC21A', 'Yellow alert: a capital ship inbound, hazard placards. Only ever a fill, with on-caution text; never text on its own.'),
  c('on-caution', '#121008', '#121008', 'Text and stripes on caution.'),
  c('alert', '#FF2D78', '#CC0F4F', 'Red alert: hull damage, one plate left, hull breach, the hail. As text on void, hull and hull-2.'),
  c('on-alert', '#1A0009', '#FFFFFF', 'Text on an alert fill.'),
  c('nominal', '#4DFFA6', '#06703D', 'A gain against last run (▲ +23) and a ready state. Always with a sign or word, never colour alone.'),
  # factions: the field's warm side
  c('faction-klingon',    '#FF7A63', '#C2381F', 'Klingon hulls, fire and capital-ship name. Text on void, hull and hull-2.'),
  c('faction-cardassian', '#F0A848', '#88530A', 'Cardassian hulls, fire and capital-ship name.'),
  c('faction-romulan',    '#7FD6A6', '#16704A', 'Romulan hulls, plasma and capital-ship name.'),
  c('faction-borg',       '#8FB4C9', '#4A6679', 'Borg hull plating and name. Its cutting beam and emissives use nominal green.'),
  c('faction-tholian',    '#FFB347', '#925200', 'Tholian hulls and shards. Their webs use dilithium violet.'),
  # focus
  c('focus', '#FF9F43', '#B54700', 'Keyboard focus ring: 2px solid, 2px gap. 8.7:1 or better on Bridge grounds, 4.5:1 or better on Drydock.'),
]

tokens = {
  "name": "Asteroid Blaster",
  "version": 1,
  "color": {"themes": [{"id": B, "name": "Bridge"}, {"id": D, "name": "Drydock"}], "tokens": colors},
  "type": {
    "fonts": [],
    "families": {
      "display": "Tektur, \"Eurostile Extended\", \"Microgramma\", \"Arial Black\", sans-serif",
      "rail": "Antonio, \"Swiss 911 Ultra Compressed\", \"Arial Narrow\", \"Roboto Condensed\", sans-serif",
      "mono": "\"Martian Mono\", ui-monospace, \"SF Mono\", Menlo, monospace",
      "jp": "\"Hiragino Sans\", \"Noto Sans JP\", \"Yu Gothic\", sans-serif"
    },
    "groups": [
      {"name": "Display", "family": "display", "note": "Tektur. The voice: screen titles, card names and the sentences the player reads.", "styles": [
        {"name": "display-xl", "fontSize": "64px", "lineHeight": "60px", "fontWeight": 800, "letterSpacing": "0.02em", "sample": "HULL BREACH", "usage": "One per screen: the title of a full-screen panel. Caps."},
        {"name": "display", "fontSize": "28px", "lineHeight": "32px", "fontWeight": 700, "letterSpacing": "0.12em", "sample": "FIELD REFIT", "usage": "Panel titles set hard right in the elbow's rail. Caps."},
        {"name": "heading", "fontSize": "18px", "lineHeight": "22px", "fontWeight": 700, "letterSpacing": "0.04em", "sample": "PHOTON TORPEDO BAY", "usage": "Card names, option names. Caps."},
        {"name": "body", "fontSize": "14px", "lineHeight": "20px", "fontWeight": 400, "sample": "Adds torpedoes that chase their target.", "usage": "Benefit sentences and anything read as a sentence. Sentence case."},
        {"name": "body-sm", "fontSize": "12px", "lineHeight": "17px", "fontWeight": 400, "sample": "They fire and reload on their own.", "usage": "Caveats under a benefit, in ink-3."}
      ]},
      {"name": "Rail", "family": "rail", "note": "Antonio, the free cut closest to LCARS's ultra-compressed grotesk. Structure and numerals.", "styles": [
        {"name": "numeral-xl", "fontSize": "120px", "lineHeight": "104px", "fontWeight": 700, "sample": "7072", "usage": "The one figure a screen exists for: the final stardate."},
        {"name": "numeral", "fontSize": "28px", "lineHeight": "28px", "fontWeight": 600, "sample": "1142", "usage": "HUD values and tile figures."},
        {"name": "rail-label", "fontSize": "15px", "lineHeight": "18px", "fontWeight": 600, "letterSpacing": "0.14em", "sample": "SECTOR 001", "usage": "Labels on the elbow's bar and rail, navigation, the refit number. Caps."}
      ]},
      {"name": "Mono", "family": "mono", "note": "Martian Mono. Instruments: figures, key caps, codes and the annotation texture.", "styles": [
        {"name": "data", "fontSize": "13px", "lineHeight": "18px", "fontWeight": 500, "sample": "4 blast damage", "usage": "Figures on cards, in signal. Sentence case, numbers as figures."},
        {"name": "label", "fontSize": "11px", "lineHeight": "14px", "fontWeight": 500, "letterSpacing": "0.16em", "sample": "STARDATE", "usage": "Micro labels over values, category words, key caps. Caps."},
        {"name": "annotation", "fontSize": "9px", "lineHeight": "12px", "fontWeight": 400, "letterSpacing": "0.08em", "sample": "47°12′N · VEL 312 · HDG 047", "usage": "Texture that is still true: coordinates, velocity, registry codes. ink-3, caps."}
      ]}
    ]
  },
  "spacing": {"tokens": [
    {"name": "space-1", "value": "4px", "usage": "Icon to label; tick gap."},
    {"name": "space-2", "value": "8px", "usage": "Inside chips and key caps; between stacked labels."},
    {"name": "space-3", "value": "12px", "usage": "Card inner padding on phones; between HUD groups."},
    {"name": "space-4", "value": "16px", "usage": "Card inner padding; the viewscreen inset for corner brackets."},
    {"name": "space-6", "value": "24px", "usage": "Panel padding; gutters between cards."},
    {"name": "space-8", "value": "32px", "usage": "Panel padding on desktop; the HUD's safe margin."},
    {"name": "space-12", "value": "48px", "usage": "Between screen regions on the title and summary screens."}
  ]},
  "radius": {"tokens": [
    {"name": "radius-none", "value": "0", "usage": "Everything. The system cuts corners, it does not round them."},
    {"name": "radius-round", "value": "50%", "usage": "Status dots, the thumbstick ring and knob. Nothing else is round."}
  ]},
  "cut": {"note": "Chamfer sizes: the 45-degree corner every frame, button, chip and plate is cut with.", "tokens": [
    {"name": "cut-xs", "value": "3px", "usage": "Hull plates, status chips, key caps."},
    {"name": "cut-sm", "value": "6px", "usage": "Buttons, tags, HUD chips."},
    {"name": "cut-md", "value": "10px", "usage": "Cards, tiles, the schematic viewport."},
    {"name": "cut-lg", "value": "18px", "usage": "Panels and the outer corner of the elbow."}
  ]},
  "stroke": {"note": "Line weights.", "tokens": [
    {"name": "stroke-hair", "value": "1px", "usage": "Rules, card edges, chart grid."},
    {"name": "stroke-bracket", "value": "1.5px", "usage": "Corner brackets, icon strokes at 16px."},
    {"name": "stroke-rail", "value": "3px", "usage": "The elbow's rail."},
    {"name": "stroke-bar", "value": "12px", "usage": "The elbow's bar."}
  ]},
  "shadow": {"note": "Glow is a state, not a finish: it appears on what is live, selected or ready, and Drydock has none.", "tokens": [
    {"name": "glow-signal", "value": {B: "0 0 18px #00F0FF4D", D: "none"}, "usage": "A lit signal edge: the selected HUD chip, a ready meter."},
    {"name": "glow-command", "value": {B: "0 0 20px #FF9F4359", D: "none"}, "usage": "The selected card, the primary button on hover."},
    {"name": "glow-alert", "value": {B: "0 0 24px #FF2D7859", D: "none"}, "usage": "Hull breach and red-alert panels."},
    {"name": "lift", "value": {B: "0 16px 40px #000000A6", D: "0 12px 28px #0A141C1F"}, "usage": "A panel over the field; the selected card's 3px lift."}
  ]}
}
json.dump(tokens, open('project/tokens.json', 'w'), ensure_ascii=False, indent=2)

# a local stand-in for the tokens.css the page compiles, for checking previews here
css = [':root, [data-theme="bridge"] {']
for t in colors:
    v = t['value'][B] if isinstance(t['value'], dict) else t['value']
    css.append(f"  --{t['name']}: {v};")
for t in tokens['shadow']['tokens']:
    css.append(f"  --{t['name']}: {t['value'][B]};")
css.append('}')
css.append('[data-theme="drydock"] {')
for t in colors:
    if isinstance(t['value'], dict): css.append(f"  --{t['name']}: {t['value'][D]};")
for t in tokens['shadow']['tokens']:
    css.append(f"  --{t['name']}: {t['value'][D]};")
css.append('}')
css.append(':root {')
for fam in ['spacing', 'radius', 'cut', 'stroke']:
    for t in tokens[fam]['tokens']: css.append(f"  --{t['name']}: {t['value']};")
for k, v in tokens['type']['families'].items(): css.append(f"  --font-{k}: {v};")
css.append('}')
open('local-tokens.css', 'w').write('\n'.join(css) + '\n')
print(len(colors), 'colours')
