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
  calloway: 'Governor Idris Calloway, forties, the hunter of the story. Office of Peace governor’s coat, grey, severe tailoring, a small red rank pin. A face that is tired, intelligent and sure. Behind: the bridge of the CCV Patience, blurred, warm light. She believes she is holding civilisation together.',
};

/** Hand notes per contact card. */
export const CONTACT_LOOK: Record<string, string> = {
  foreman: 'Foreman Draper of Kellern Mining: fifties, heavy, a tired decent man with a boss’s voice; amber hi-vis over grey overalls, company badge, a hard hat under one arm. A yard office behind him.',
  krail_seller: 'Old Hesketh, independent prospector: sixties, sun-and-dust skin, white stubble, patched mining suit, a lamp on his forehead. The cockpit of a small tug behind him, a few crates.',
  fuel_runner: 'Tallow, a fuel runner: thirties, wiry, cheerful and not to be trusted; oil-stained jacket with a hand-painted call sign, a siphon hose over one shoulder. Fuel cans in a cramped cab.',
  story_sam: 'Sam Okoro, yard foreman at a gate: forties, broad, careful; yard-crew jacket, a clipboard, looks past the camera as if someone is listening. The yard’s gantry lights behind.',
  story_warden: 'Ilse Marrow, retired Lane Warden: eighties, upright, sharp-eyed; a faded Warden coat without insignia, a cane. A small kitchen or a relay station’s old console behind.',
  story_ledger: 'Adam Brook, Kellern accounts clerk with a conscience: thirties, thin, ink-stained cuffs, nervous; Kellern amber lanyard, glasses. A grey office cubicle, ledgers.',
  story_moot: 'Councillor Oduya of Kessel Hold: fifties, dignified, carries the weight of a council; a long coat of patched cloth with a speaker’s sash. A hall of rough steel with lamps.',
  story_drift: 'Ma Saffi of the Long Walk fleet: seventies, warm and hard; layered worn textiles, sewn marks for lost ships, a child’s drawing pinned to her sleeve. The interior of a fleet ship.',
  story_broker: 'Val, a broker of the Gutter: forties, elegant in a hard way; a long coat over scrap-plate shoulders, one copper-coloured earring, a smile. A back room of a free port.',
  story_kesh: 'Kesh, Gutter fixer: thirties, lean, quick grin, scrap-plate jacket with a stitched debt tally on one sleeve. A cramped skiff cab.',
  story_ada: 'Ada Aster, from a seventy-year-old recording: forties, tired and steady, a Lane Warden-grade jacket, a headset. A dim flight deck, a single lamp.',
  story_tollgate: 'Governor Idris Calloway: forties, composed, severe; a dark Offices coat with a pale collar and a Governor’s pin. The bridge of a Continuance cutter, cold light.',
  story_salvor: 'Dov Kessler, salvor: forties, shoulders like a door, welding goggles pushed up, burn scars on the forearms; a pressure suit open at the chest. A wreck’s torn hull behind him.',
  story_charts: 'Tarik Silva, chartwright: sixties, gentle, ink on the fingers; a workshop apron, a loupe, hand-drawn charts pinned all round. Candle-warm light, an old room.',
  story_ferry: 'Ossie Raine of the Quiet Ferry: thirties, calm, a ferryman’s patience; plain dark jacket, a small ship’s bell on a cord. A dim, tidy cab.',
  story_workorder: 'Ben Anand, a yard clerk: fifties, small, anxious, brave; a clerk’s grey cardigan under a yard vest, a stamp pad. Shelves of filing boxes.',
  story_crew: 'Marit Voss, crew steward: forties, strong, plain-spoken; yard-crew overalls, a union patch, arms folded. A crew canteen behind.',
  story_harbour: 'Ines Duarte, harbour-master for the Dust Traders: fifties, polished, amused; a cream coat, a brass harbour tag, a tablet of berth lists. A busy dock office window.',
  story_witnesses: 'Old Mirren, keeper of the free ports’ list: seventies, bent, bright-eyed; wrapped in a blanket-coat, a long scroll of names. A cramped archive hung with paper strips.',
  story_aide: 'Noor Haddad, aide to the Governor of the Continuance: thirties, composed, very tired; Office grey with a single red pin, a data slate held like a shield. A clean corridor.',
  story_toll: 'Oren Lisle, archivist of the Last Toll: ageless, shaved head, calm to the point of unease; a plain dark robe-coat, a toll-counter in the hand. A bare booth at the end of the lanes.',
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

/** The captains' capital ships, by captain id: what the player sees when that flagship hails. */
export const CAPITAL_LOOK: Record<string, string> = {
  vance: 'CCV Reprimand, a Custody heavy cruiser and flagship: huge, long and layered, near-black hull with white stencilled bands and red warning bars, a spine of broadside batteries, a lit bridge dome near the stern. Official, strict, built to hold a lane.',
  sorensen: 'CCV Due Process, a Custody command ship: a chapel-like hull, a long nave with a tall bridge spire, printed ordinance strips along the flanks, a flag of the Continuance lit from below. Ritual neatness, menace in the symmetry.',
  kade: 'Ironmaw, a Gutter war-barge built from welded scrap hulls: a gaping bow like a jaw of mismatched plate, cargo nets, bolted-on armour of three different colours, copper-orange running lights and a crude painted tally on the side.',
  vex: 'Last Mercy, a Gutter cult ship: dark and ragged, dressed like a floating derelict, hung with bone-coloured charms and lanterns, one red status light, rock and wreckage fixed to the hull as camouflage. Quiet and wrong.',
  ashgrove: 'Kind Regard, an Office of Peace cruiser: clean, pale grey, windows in tidy rows like an office block on its side, no markings you can read, a calm bureaucratic profile with panels built to hide a cloak.',
  pell: 'Silent Witness, an Office ambush cruiser: matte near-black hull, a single long visor-slit of sensors, cloaking panels, one small warm lamp near the stern. It looks like a place where nobody lives.',
  chorus: 'Foundry Nine, a Voice foundry: an old industrial works made into a ship, pale blue-grey housings, huge rings and cable bundles, nine lit display windows across the front like a face. Slow, enormous, machine-calm.',
  loom: 'Thren Hollow, a Thren capital: a vast woven lattice that is almost a cavity, green-teal light deep inside, repeating asymmetric forms, grown rather than built. No human features, no windows.',
  calloway: 'CCV Patience, the Governor’s own cutter of the Office of Peace: grey, severe, tailored lines, a small red rank mark, a long sensor mast, clean and fast for its size. Calm and tired, like its owner.',
};

/** Ships about their business in a system: the ones the jobs and the traffic use. */
export const TRAFFIC_LOOK: Record<string, string> = {
  tanker: 'a heavy fuel tanker: fat cylindrical tanks strapped to a thin spine, a small bridge, light armour and two escort mounts; slow, valuable, nervous',
  hauler: 'a damaged ore hauler, too slow to reach the lane alone: patched hull, one engine pod dark, tarpaulin over a torn plate, a worn Obedience-class build',
  courier: 'a lightly armed courier: small, fast, one big drive and a sealed cargo cage, no guns to speak of, a lamp in the cockpit',
  gunship: 'a Dust Traders Guild gunship: brass-and-cream trim on a dark hull, a chin turret and two side guns, merchant-clean paint over military bones',
  barge: 'a mining barge with a drilling rig: a squat hull with boom arms and a floodlit work deck, crew lights in rows, ore containers bolted on',
  salvager: 'a salvage tug: a stubby hull with a long cutting arm and a grab claw, work lamps, a half-stripped plate under tow, a rival crew’s mismatched paint',
  drifter: 'a Drift fleet ship: a patchwork hull of many ships, sewn textile banners and lanterns, a child’s drawing pinned on a plate, slow and warm',
  ferry: 'the Quiet Ferry: a small, plain, dark ship with tidy lines and a ship’s bell hung at the door; a ferryman’s patience in a hull',
};

/** The Wayward as the player has built it: one hull, four ways of being fitted. */
export const WAYWARD_LOOK: Record<string, string> = {
  'wayward-stock': 'the Wayward as she starts: the long, low, worn yellow-orange hauler with split side engine pods, brand marks WAYWARD and OBEDIENCE CLASS, nothing added',
  'wayward-guns': 'the Wayward fitted for Guns: the same hull with heavier hardpoints along the spine, extra plate welded over the flanks, a gunnery rig behind the cockpit and a shield projector dish, scorch marks, still unmistakably her',
  'wayward-rig': 'the Wayward fitted for the Rig: the same hull with cargo racks along the back, a machine shop module, an ore tractor beam emitter under the nose and a capacitor bank, stained and workmanlike',
  'wayward-signals': 'the Wayward fitted for Signals: the same hull with antenna masts and a dish array, baffles along the engines, matte dark patches over the yellow, a jammer boom; quiet, a little ghostly',
};

/** The third run: wrecks, the Wayward hurt, and three nastier hulls. */
export const EXTRA_LOOK: Record<string, string> = {
  'wreck-scout': 'a dead scout: a small fast ship, hull split along one side, cockpit dark, one wing torn off, frost on the metal',
  'wreck-hauler': 'a dead cargo hauler: long boxy hull, container racks half empty and bent, one engine pod gone, scorch marks',
  'wreck-gunship': 'a dead gunship: blunt armed hull, gun pods hanging by cables, armour plates peeled back, a red warning lamp long dead',
  'wreck-capital': 'a dead capital ship seen from far away: a kilometre of hull broken in two, tiny gantries and windows lit by nothing to show scale',
  'wayward-scuffed': 'the Wayward scuffed: paint scraped, a few dents and scorch marks, everything still working, engines lit blue',
  'wayward-half': 'the Wayward at half hull: a hole in the plating showing ribs and cables, one engine pod sparking, a little vented gas trailing',
  'wayward-last': 'the Wayward on her last plate: barely holding together, large sections torn away, one engine out, a restrained red glow inside the breach',
  raider: 'a named raider: a patched gunship with trophy plates welded to the nose, red lamps and a painted stripe',
  hunter: 'a hunter: a lean fast hull with long guns and a sensor boom, dark matte paint',
  'custody-cruiser': 'a Custody cruiser seen close: grey, regimented, flat armour plates, rows of identical lit windows',
};

export const GATE_LOOK: Record<string, string> = {
  reach: 'a clean regulated hub station with a net of fine cables spreading out from it, a pale planet behind',
  marches: 'a heavily armed holdfast built on a rock, Drift ships tied up near it, burn scars from raiders',
  'salvage-belt': 'a market built from wrecks, hulls bolted together, claim flags, work lights',
  'drift-deep': 'a slow fleet of ships lashed together into a moving town, far from any star',
  'breaker-yards': 'huge Custody dry docks tearing ships apart, sparks, cranes, searchlights',
  'free-ports': 'a crowded patchwork port of mismatched ships and unreadable hand-painted signs, warm windows',
  hollows: 'a silent foundry station in a dark nebula, long cold chimneys, nothing alive in sight',
  'last-lanes': 'a lone beacon and a broken lane gate at the edge, the Threshold glowing faintly far behind',
};

export const PLANET_LOOK: Record<string, string> = {
  rocky: 'a dry rocky world with dust seas and a thin orange haze at the rim, a fuel station in low orbit',
  ice: 'an ice world with cracked white plains and a faint blue atmosphere line, a port on the cliff edge',
  gas: 'a banded gas giant with a dark storm and a tiny port hanging in orbit',
  dead: 'a dead burnt-out world with dark glass plains and no light on the night side',
};

export const BAYBANNER_LOOK: Record<string, string> = {
  suggested: 'the Wayward in a work bay under cranes, a few crew at work, warm work lights on wet deck',
  hull: 'close on the Wayward’s armoured prow, plating being welded, sparks, gantry arms',
  weapons: 'a laser mount on a yard stand, coolant tanks beside it, a teal beam fired into the dark',
  ordnance: 'torpedoes racked on a loading rail, ammunition crates, a mine drum behind',
  engines: 'an engine pod on a yard cradle, blue thrust glow, vanes and heavy mounts',
  defence: 'a shield projector dish with a teal field, stacked armour plates, a crew member at work',
  utility: 'the Wayward’s tractor emitter holding a rock in open space, cargo racks behind',
  signals: 'a comms mast and a large dish on a dock, a teal monitor, a planet low on the horizon',
  reactor: 'a glowing reactor core in a steel cage, steam and heavy pipework',
  synergies: 'a salvaged alien-looking module bolted to a worn hauler section, teal cables between them',
};

export const DEBRIEF_LOOK: Record<string, string> = {
  castoff: 'calm: the Wayward leaving a work bay, bay doors open, work lights, plenty of black ahead',
  limping: 'the damaged Wayward approaching a port on one engine, trailing vented gas, a figure watching from the dock',
};

/** What each job looks like as a scene: the moment, not the whole story. */
export const JOB_SCENE: Record<string, string> = {
  sc_cache: 'four battered cargo cases drifting apart in a broken cargo-train field, the Wayward slowing beside one with its tractor lamp on, a distant crew ship just turning toward her',
  sc_toll: 'a toll beacon blinking over an asteroid lane, four raider ships holding station around it, the Wayward approaching',
  sc_tanker: 'a heavy tanker under hail of fire from the Wayward, two escorts wheeling, its engine pod venting',
  sc_wanted: 'a fleeing fighter with one engine burning, the Wayward closing to disable it; a Custody notice-light glints on the dash',
  sc_shift: 'a mining rig on an asteroid, floodlit crew silhouettes at the rail, raider ships closing in over the rocks',
  sc_needle: 'a line of six lit beacons through a dense asteroid field, the Wayward and a rival racing between them',
  sc_hole: 'the Wayward very small at the edge of an accretion disc around a black hole, light bending, sensor arms out',
  sc_declare: 'a Custody patrol sweeping lamps across a lane, the Wayward drifting dark between them with a small package on a tether',
  sc_kill_zone: 'a busy crossing choked with stalled traffic, six raiders holding the middle, the Wayward heading in with guns warm',
  sc_missing: 'a silent wreck field, a dark rig with its lights out, the Wayward’s lamp on an open airlock',
  sc_follow: 'a prospector’s battered tug leading the Wayward through a dust lane toward a faint glow of Cyrite veins in the rock',
  sc_answered: 'an old relay mast pulsing a slow answer, three unknown contacts circling it, the Wayward approaching without a shot',
  sc_wreck: 'a derelict hull with an open flight-recorder bay, a second ship closing to erase it, the Wayward in between',
  sc_distance: 'four Custody patrol ships on a loop around a still centre, the Wayward holding dead still inside it, a tiny antenna out',
  sc_bait: 'a Custody picket across a lane, the Wayward flashing past its guns to draw it out, a Guild gunship waiting in the rocks',
  sc_dead_drop: 'a lone beacon with a sealed package clamped to it, the Wayward arriving, a shadow of a second ship in the dust behind',
  sc_long_walk: 'a damaged hauler limping toward a lane gate, the Wayward alongside as escort, one engine of the hauler dark',
  sc_finders: 'a wreck half-lit in a marker field, the Wayward and a rival salvage crew racing for the same claim',
  sc_dark: 'an uncharted dark object with no clear edge, the Wayward’s sensor arc sweeping across it, readings flickering',
  sc_wire: 'an abandoned relay broadcasting in the dark, a pale blue-teal glow on its dish, the Wayward’s hull lit by it',
  sc_payroll: 'a small courier running fast through rocks, the Wayward matching its speed to disable it, a cargo cage on its back',
  sc_filter: 'a settlement’s failing air filter glowing weakly on a rock station, the Wayward arriving with a crate of replacement parts',
  sc_captains: 'two salvage crews with guns up facing each other across a valuable wreck, the Wayward arriving between them',
  sc_witness: 'a back-dock at night, a hooded figure with a data case hurrying toward the Wayward’s open lock, Custody lamps sweeping behind',
  sc_prefect: 'a relay mast inside a patrol route, the Wayward drifting dark to erase a trace, a Custody cutter passing close',
};

/** The same hull for a different owner: what a card shows when its caller is not the hull's own faction. `cards` names the comms cards it stands in for. */
export const OWNED_LOOK: Record<string, { hull: string; owner: string; cards: string }> = {
  'enforcer-kellern': { hull: 'a blunt armoured strike craft', owner: 'Kellern Mining security: amber and cream hazard stripes over the hull, company numbering, a claims-office lamp bar; hired muscle, not Custody', cards: 'claim_jumpers' },
  'freighter-frontier': { hull: 'a blocky service tender with spares racks and a crane arm', owner: 'Frontier Supply: mismatched replacement panels, hand-painted numbers, tarpaulin over a rack, string lights; a depot’s own ship', cards: 'ares_tender' },
  'freighter-guild': { hull: 'a plain blocky food freighter with stacked containers', owner: 'the Dust Traders Guild: brass-and-cream trim on a dark hull, ledger-number stencils on the containers, berth tags; merchant-clean', cards: 'food_trader' },
  'freighter-miners': { hull: 'a plain blocky hauler with stacked containers', owner: 'a Drift fleet of independent miners: patchwork plating, sewn textile banners, lanterns, a child’s drawing pinned to a plate; slow and warm', cards: 'drift_fleet' },
  'lancer-calloway': { hull: 'a heavy cruiser, long, low and layered', owner: 'the Office of Peace under Governor Calloway: pale grey, severe and tidy, a small red rank mark, a tall sensor mast; the same bones as a Custody cruiser with a quieter coat', cards: 'calloway_here' },
  'scout-guild': { hull: 'a small fast interceptor, a narrow wedge with split engine pods', owner: 'a Dust Traders Guild escort: brass-and-cream trim over dark paint, a chin lamp, a ledger number on the wing; not a pirate', cards: 'distress_freighter' },
};
