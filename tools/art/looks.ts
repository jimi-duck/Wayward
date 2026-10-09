// What the data does not say: the look of each picture, in a line or two, written once so every
// prompt for a set comes out of the same world. The game's own rows (a captain's face, a card's
// words, an ending's epilogue) fill in the rest. Not shipped; used by art-brief.pilot.ts.

/** Brand v1.1, section 16, per faction: how their graphics, clothes and kit look. */
export const FACTION_LOOK: Record<string, string> = {
  custody: 'the Continuance’s Custody: institutional, governmental, strict. Black, white and red. Mass-produced and stamped; uniforms identical, regulation grey-black with a white collar tab and thin red piping, rank bars, serial numbers.',
  office: 'the Continuance’s Office of Peace: the civil arm. Pale grey and off-white, cut like a clerk’s coat rather than a soldier’s; quiet, tidy, a single red rule as the only colour. Paper, stamps, forms.',
  kellern: 'Kellern Mining, a heavy-industry company: amber, cream and dark grey. Hi-vis stripes, barcode strips, hazard triangles, company logos on everything, a name tag with a number.',
  guild: 'the Dust Traders Guild, merchants and salvage brokers: practical long coats in cream and brown over work clothes, ledger tablets, brass-coloured tags, a trader’s ease.',
  frontier: 'Frontier independents: inconsistent, mismatched. Hand-painted marks, old logos painted over, home-made repairs, borrowed jackets in different colours.',
  miners: 'Scatter miners and Holdfast settlers: dust-stained work overalls, headlamps pushed up, patched knees, respirator marks on the face, hands that have worked.',
  gutter: 'the Gutter, pirates and scavengers beyond the law: scrap armour in coppery orange (#C9845A), plates bolted over plates, painted tallies, tools worn as ornaments. Hard, not cartoonish.',
  drift: 'Drift fleet families, who live aboard ships that never stop: layered, patched textiles, worn rope and webbing, utilitarian and warm, sewn marks for each ship lost.',
  voice: 'the Voice, the old fabrication systems that began deciding for themselves: no people. Clean, too-perfect geometry on old industrial hardware; pale blue-grey (#8FB4C9) light; speaks through terminals and relays.',
  thren: 'the Thren: not a human faction and not "an alien spaceship". Geometry, asymmetry, biological shapes, unfamiliar repetition, strange light (a cool green-teal, #5CC3A2). The viewer should think: what am I looking at?',
};

/** Hand notes per captain: age, build, clothes, the setting behind them. Their Face row (skin, hair, eyes, mark, jaw) is added from the data. */
export const CAPTAIN_LOOK: Record<string, string> = {
  vance: 'Late forties, straight-backed, a duelist’s calm. Custody captain’s dress uniform with the collar open one button. Behind: the lit bridge of a heavy cruiser, rows of dark screens.',
  sorensen: 'Fifties, gaunt, ritual neatness. Custody commander’s uniform buttoned to the throat, a printed ordinance strip pinned over the heart. Behind: a chapel-like bridge, a flag of the Continuance, lit from below.',
  kade: 'Fifties, heavy, a broker who has priced everything. Gutter captain in layered scrap plate and a good old coat on top, rings on the fingers. Behind: a cluttered bridge of salvaged consoles, a cargo net.',
  vex: 'Thirties, thin, still. “Sister” of a salvage cult: hooded, a patched robe over armour, small bone-coloured charms. Behind: dark, a single red status light, rock close at the window.',
  ashgrove: 'Sixties, a polite inquisitor of the Office of Peace. Pale grey coat, spectacles pushed up, a tidy folder in hand. Behind: a clean grey office-like cabin, a window onto a lane.',
  pell: 'Ageless, very quiet. An Office inquisitor in grey with a half-visor over the eyes, a finger to the lips. Behind: dim, near-black cabin, a single desk lamp.',
  chorus: 'Not a person: nine small displays arranged as a face, each showing a slightly different too-calm expression of the same idea. A foundry’s voice. Pale blue-grey light, old industrial housings and cable bundles around it. No human skin.',
  loom: 'Not a person and not a ship: an unfamiliar thing the viewer cannot read, with a faint hint of a face made of repeating asymmetric forms, woven, lit from inside by a cool green-teal. No human features; no eyes you could point to.',
  calloway: 'Prefect Idris Calloway, forties, the hunter of the story. Office of Peace prefect’s coat, grey, severe tailoring, a small red rank pin. A face that is tired, intelligent and sure. Behind: the bridge of the CCV Patience, blurred, warm light. She believes she is holding civilisation together.',
};

/** Hand notes per contact card. */
export const CONTACT_LOOK: Record<string, string> = {
  foreman: 'Foreman Draper of Kellern Mining: fifties, heavy, a tired decent man with a boss’s voice; amber hi-vis over grey overalls, company badge, a hard hat under one arm. A yard office behind him.',
  krail_seller: 'Old Hesketh, independent prospector: sixties, sun-and-dust skin, white stubble, patched mining suit, a lamp on his forehead. The cockpit of a small tug behind him, a few crates.',
  fuel_runner: 'Tallow, a fuel runner: thirties, wiry, cheerful and not to be trusted; oil-stained jacket with a hand-painted call sign, a siphon hose over one shoulder. Fuel cans in a cramped cab.',
  story_yard: 'Tam Okoro, yard foreman at a gate: forties, broad, careful; yard-crew jacket, a clipboard, looks past the camera as if someone is listening. The yard’s gantry lights behind.',
  story_warden: 'Ilse Marrow, retired Lane Warden: eighties, upright, sharp-eyed; a faded Warden coat without insignia, a cane. A small kitchen or a relay station’s old console behind.',
  story_ledger: 'Ansel Brook, Kellern accounts clerk with a conscience: thirties, thin, ink-stained cuffs, nervous; Kellern amber lanyard, glasses. A grey office cubicle, ledgers.',
  story_moot: 'Speaker Oduya of Kessel Hold: fifties, dignified, carries the weight of a council; a long coat of patched cloth with a speaker’s sash. A hall of rough steel with lamps.',
  story_drift: 'Mother Saffi of the Long Walk fleet: seventies, warm and hard; layered worn textiles, sewn marks for lost ships, a child’s drawing pinned to her sleeve. The interior of a fleet ship.',
  story_broker: 'Vell, a broker of the Gutter: forties, elegant in a hard way; a long coat over scrap-plate shoulders, one copper-coloured earring, a smile. A back room of a free port.',
  story_salvor: 'Dov Kessin, salvor: forties, shoulders like a door, welding goggles pushed up, burn scars on the forearms; a pressure suit open at the chest. A wreck’s torn hull behind him.',
  story_charts: 'Hale Tarn, chartwright: sixties, gentle, ink on the fingers; a workshop apron, a loupe, hand-drawn charts pinned all round. Candle-warm light, an old room.',
  story_ferry: 'Ossi Rane of the Quiet Ferry: thirties, calm, a ferryman’s patience; plain dark jacket, a small ship’s bell on a cord. A dim, tidy cab.',
  story_workorder: 'Pell Anand, a yard clerk: fifties, small, anxious, brave; a clerk’s grey cardigan under a yard vest, a stamp pad. Shelves of filing boxes.',
  story_crew: 'Marit Voss, crew steward: forties, strong, plain-spoken; yard-crew overalls, a union patch, arms folded. A crew canteen behind.',
  story_harbour: 'Ines Duarte, harbour-master for the Dust Traders: fifties, polished, amused; a cream coat, a brass harbour tag, a tablet of berth lists. A busy dock office window.',
  story_witnesses: 'Old Mirren, keeper of the free ports’ list: seventies, bent, bright-eyed; wrapped in a blanket-coat, a long scroll of names. A cramped archive hung with paper strips.',
  story_aide: 'Noor Hale, sub-prefect of the Continuance and the Prefect’s aide: thirties, composed, very tired; Office grey with a single red pin, a data slate held like a shield. A clean corridor.',
  story_toll: 'Keeper Oren of the Last Toll: ageless, shaved head, calm to the point of unease; a plain dark robe-coat, a toll-counter in the hand. A bare booth at the end of the lanes.',
};

/** Hand notes per emblem: the shape, so the set reads as one family and each as itself. */
export const EMBLEM_IDEA: Record<string, string> = {
  custody: 'a circular seal: a thick ring with a vertical bar locked across it like a hasp; perfectly symmetrical, stencil-cut, official, a little menacing',
  office: 'a squared document mark: a rectangle with one clipped corner, three ruled lines inside; the look of a form stamp; symmetrical and calm',
  kellern: 'a hexagonal company mark: a hex nut outline holding three stacked chevrons, a short barcode strip beneath',
  guild: 'a trader’s mark: a triangle balanced on a dot, with two small unequal weights hanging from its corners',
  frontier: 'a hand-painted look: an irregular circle with a crossbar, slightly off, with the faint ghost of an older logo painted over beneath',
  miners: 'a headlamp mark: a chevron pointing down over a single dot, with a short beam of three lines',
  gutter: 'a bent nail inside a ragged, scratched ring (the Bent Nail is their best-known port); crude, quick, scratched into metal',
  drift: 'three offset parallel waves with a small hull-dot at the end of the lowest, like a wake; flowing, simple',
  voice: 'concentric rings broken by a single gap, with one small dot in the gap; too perfect, mathematical, cold',
  thren: 'an unfamiliar asymmetric cluster of unequal lobes around an off-centre point, repeated once, smaller; organic geometry, no letters, not like any human mark',
};

/** Hand notes per ship variant: the silhouette, so a set reads at a glance. The faction look and role come from the data. */
export const SHIP_LOOK: Record<string, string> = {
  scout: 'a small, fast interceptor: a narrow wedge with the engine pods split to the sides, a thin cockpit slit, little armour',
  raptor: 'a strike fighter: blunt armoured prow for ramming, short swept wings with twin guns, heavy engines',
  lancer: 'a heavy cruiser: long, low and layered, broadside gun batteries along the flanks, a clear spine',
  warbird: 'a plasma cruiser: a long gun-rail with a glowing coil along the dorsal line, a narrow body, cloaking panels',
  stalker: 'a hunter: slim and predatory, forward sensor spar, a single long-barrelled lead gun, hunting lights',
  drone: 'a grinder: a broad slow industrial rig, a beam emitter on a boom, cutting arms folded under; more machine than ship',
  weaver: 'a web layer: a spindly lattice body that trails thread-like structure; asymmetrical, uncanny',
  picket: 'a patrol fighter: a Custody picket, small and uniform, twin guns, white stencilled numbers on a dark hull',
  whisper: 'an ambush fighter of the Office: matte pale grey, no markings you can read, panelled for cloaking, quiet',
  probe: 'a Voice probe: a pale, perfect lozenge on a thin frame, sensors in rings, no visible crew space',
  shard: 'a Shard cruiser: a faceted, crystalline, asymmetric body that looks grown rather than built, green-teal light inside',
  mote: 'a Thren mote: a small knot of repeating forms, hardly a ship at all, softly lit, in a shoal (draw one)',
  enforcer: 'a Custody enforcer: a blunt dark strike craft, armoured prow, red stencilled warning bars, built to catch a stolen hauler',
  interdictor: 'a Custody interdictor: a long, thin sensor spar and tether-launchers, built to hold a ship in place',
  freighter: 'a Continuance freighter: a large, plain, blocky hauler with stacked cargo containers; not a warship',
};

export const PLACE_LOOK: Record<string, string> = {
  kellern: 'a Kellern Mining fuel dock and claim office: amber and cream, hazard stripes, big company numbering on a gantry, rows of fuel lines, the claims office window lit',
  frontier: 'Frontier Supply, an independent stores depot: mismatched modules bolted together, hand-painted signs, string lights, tarpaulin and crates; the safe-feeling port',
  guild: 'the Dust Traders Exchange: a brass-and-cream trading hall docked to a station, ledger boards, berth numbers, merchant ships queuing',
  gutter: 'the Gutter’s free port, the Bent Nail: a barge bolted together from hulks, lit by welding sparks, painted tallies, crude and alive; copper-orange light',
  holdfast: 'a Holdfast settlement’s stores: an old refinery turned town, steel and pipe, laundry lines, a claim hall with a hand-painted flag',
  free: 'a free dock with nobody in charge: a lone gantry and a shack on a rock, a single lamp, a few ships parked at odd angles',
  netted: 'a port under Continuance order: the same dock, but grey and clean and watched; inspection gates, red-white stencils, cameras on poles, queues of tired people',
};

export const ENDING_SCENE: Record<string, string> = {
  broadcast: 'the Wayward holding at the Threshold, an antenna array lit and sending, a thousand tiny lights spreading from it across the dark like a signal being heard; hopeful and uncertain',
  unite: 'a loose fleet of mismatched ships (Holdfast, Drift, Gutter, Frontier) gathering at the Threshold, lights coming on one by one, the Wayward at the centre; resolve, not triumph',
  sell: 'a back-room handover: the Wayward docked at a private platform, a case on a table between the player’s side and a broker’s, rich lights outside, cold interior; a quiet kind of loss',
  trade: 'the Wayward docked at a Continuance cutter in the grey, an official handing across a stamped receipt, a new name on a document; relief that costs something',
  seal: 'the Threshold lanes closing: a ring of jump lanes collapsing into the dark one after another, the Wayward turning away, the Scatter lit behind; grim and free',
  vanish: 'the Wayward drifting alone, running dark, drive cold, into an empty field of stars and dust, a tiny ship’s lamp the only light; peace and uncertainty',
};

export const REGION_LOOK: Record<string, string> = {
  reach: 'Kellern space: company docks, amber light, long ore lines, the Net spreading as a faint red grid across the sky; busy and watched',
  marches: 'the Marches: Holdfast settlements on old rock, Drift fleets crossing, Gutter raiders in the dark; steel and pipe and signal fires',
  'salvage-belt': 'the Salvage Belt: a vast field of wrecks and claims, Dust Trader tags on hulks, spark and weld light; everything for sale',
  'drift-deep': 'the Drift Deep: far from anyone, slow fleets under lamplight, long dark between them; quiet, warm, lonely',
  'breaker-yards': 'the Breaker Yards: Custody dry-docks where ships are taken apart, huge frames half stripped, floodlights, red-white warning stencils; watched',
  'free-ports': 'the Free Ports: Gutter ports strung together, everyone trading, neon-lite signs kept dim, crowded docks; copper-orange and smoke',
  hollows: 'the Hollows: dead Voice foundries and Thren lanes, nothing human; pale blue-grey and green-teal, vast and unfamiliar',
  'last-lanes': 'the Last Lanes: the way to the Threshold, a few lanes left open, a single toll-gate lit in a blank sky; bare, final',
};
