import type { Row } from '../../sim/script';
import { after, arrive, flag, free, main, notice, objective, radio, relay, SAM, wall } from './kit';

// ── the arrivals: the road's gates, two to seven ───────────────────────────
// Every arrival has the same five steps (docs/overhaul/BEAT_MAP.md §0.3):
// approach, handshake at the relay mast, Ada's note, the answer, and the way
// on. The handshake and the note are main beats: the gate holds for them
// (sim/world.ts `gateHeld`). The handshake lights the relay (`relay_<gate>`,
// counted by sim/evidence.ts). The Narrows, the first, is in narrows.ts.

const handshake = (id: string, stop: string, reason: string): Row[] => [
  { id: `${id}_lit`, stop, on: relay(), wall: `relay_${stop}`, do: { notice: { tone: 'teal', headline: 'Warden key accepted', reason } }, main: true },
];

export const ARRIVAL_ROWS: Row[] = [
  // ── Arrival 2 · the Rift: flown, not read. The relay is broken; someone talks her through, or nobody does ──
  objective('ri_obj', 'rift', arrive(), 'Cross the Rift', 'Relay broken · no beacons'),
  radio('ri_wren_1', 'rift', free(4), 'Wren Saffi', 'miners', '“Juno, it’s Wren. Gran says you’re ours now. Follow my beacons, and don’t argue with the third one.”', { if: { has: ['wren_trust'] } }),
  radio('ri_wren_2', 'rift', after('ri_wren_1', 12), 'Wren Saffi', 'miners', '“Left of the big hull. That was the Ninefold. My parents flew her. Keep going.”'),
  radio('ri_wren_3', 'rift', after('ri_wren_2', 12), 'Wren Saffi', 'miners', '“Last one. Now you know the way, so you’re one of us. Sorry.”'),
  radio('ri_oduya', 'rift', free(8), 'Councillor Oduya', 'miners', '“Kessel Hold lit its rig lamps along the Rift. All of them. The moot voted. It was close.”', { if: { has: ['oduya_rigs'] } }),
  notice('ri_blind', 'rift', free(4), 'amber', 'No guidance', 'fly the debris by eye', { if: { not: ['wren_trust', 'oduya_rigs'] } }),
  ...handshake('ri_hand', 'rift', 'the far relay still answers'),
  main('ri_note', 'rift', after('ri_hand_lit', 2), 'warden_note_2'),
  objective('ri_gate', 'rift', flag('warden_note_2'), 'Jump to Breakwater', 'Listen to the wrecks. One of them is mine.'),

  // ── Arrival 3 · the Scrapgate: the gate made of ships ──
  objective('sg_obj', 'scrapgate', arrive(), 'The Scrapgate', 'Built from Severance hulls'),
  radio('sg_plates', 'scrapgate', free(4), 'Dov Kessler', 'miners', '“Read the plates as you pass. We painted the names back on. Took us twelve years.”', { if: { has: ['kessler_met'] } }),
  notice('sg_amb', 'scrapgate', arrive(4), 'red', 'Pickets at gate', 'Val sold your heading', { if: { has: ['vell_betrayed'], not: ['vell_paid'] } }),
  radio('sg_kesh', 'scrapgate', after('sg_amb', 3), 'Kesh', 'gutter', '“Three pickets, port side, engines cold. Told you I’d warn you. We’re square.”', { if: { has: ['kesh_warned'] } }),
  ...handshake('sg_hand', 'scrapgate', 'a recording, not a note'),
  main('sg_note', 'scrapgate', after('sg_hand_lit', 2), 'warden_note_3'),
  radio('sg_ilse', 'scrapgate', flag('warden_note_3'), 'Ilse Marrow', 'miners', '“‘Don’t lose it.’ I said that. Seventy years and she listened to me once.”', { if: { has: ['copy_warden'] } }),
  objective('sg_gate', 'scrapgate', flag('warden_note_3'), 'Jump to Longwater', 'Ask the Drift where the closures run.'),

  // ── Arrival 4 · the Slow Door: three minutes. The gate takes SLOW_DOOR seconds to open (sim/world.ts) ──
  objective('sd_obj', 'slowdoor', arrive(), 'Hold at the Slow Door', 'Opening · 3:00'),
  radio('sd_ossie', 'slowdoor', free(4), 'Ossie Raine', 'miners', '“We’re crossing with you. Forty-one aboard. Stay between us and whatever comes.”', { if: { has: ['ferry_met'] } }),
  notice('sd_motes', 'slowdoor', arrive(40), 'white', 'UNKNOWN', 'motes gathering on the gate', { wall: 'slow_motes' }),
  objective('sd_hint', 'slowdoor', after('sd_motes'), undefined, 'Don’t fire. A full tank draws them.'),
  notice('sd_dense', 'slowdoor', after('sd_motes', 8), 'white', 'They thicken', 'toward your tank', { if: { full: true } }),
  radio('sd_ossie_2', 'slowdoor', after('sd_motes', 14), 'Ossie Raine', 'miners', '“They’re not touching us. They’re touching you. What are you carrying?”', { if: { has: ['ferry_met'] } }),
  radio('sd_ashe', 'slowdoor', free(30), 'Ossie Raine', 'miners', '“Ashe is off at the last port. Nobody reports this crossing.”', { if: { has: ['agent_exposed'] } }),
  radio('sd_ashe_used', 'slowdoor', free(30), 'Corin Ashe', 'office', '“I’m reporting you went the other way. I don’t know why I’m doing this.”', { if: { has: ['agent_used'], not: ['agent_exposed'] } }),
  notice('sd_view', 'slowdoor', after('sd_motes', 30), 'white', 'Dead relays', 'a curve across the whole sky'),
  ...handshake('sd_hand', 'slowdoor', 'the door’s relay still answers'),
  main('sd_note', 'slowdoor', after('sd_hand_lit', 2), 'warden_note_4'),
  objective('sd_gate', 'slowdoor', flag('warden_note_4'), 'Jump to Cutton', 'Find who built the fence. The yards remember.'),

  // ── Arrival 5 · the Breaker: the machine itself ──
  objective('br_obj', 'breaker', arrive(), 'The Breaker', 'A lane breaker, still standing'),
  notice('br_serial', 'breaker', arrive(6), 'white', 'Hull serial', 'BY9-001 · the first one', { wall: 'saw_serial' }),
  radio('br_marit', 'breaker', free(4), 'Marit Voss', 'frontier', '“Crews are off the cranes. Nobody’s stopping you today. Fly slow. They want to see you.”', { if: { has: ['strike_held'] } }),
  radio('br_hester', 'breaker', after('br_marit', 4), 'Hester Vane', 'miners', '“Told you I keep a list. Look out your port side. That’s the list.”', { if: { has: ['thread_crews_5'] } }),
  notice('br_lock', 'breaker', arrive(4), 'red', 'Yard lockdown', 'Custody cranes armed · fight through', { if: { not: ['strike_held'] } }),
  ...handshake('br_hand', 'breaker', 'five relays lit'),
  // the work order's second route: the serial on this hull, with Sam's scarred hulls seen
  wall('br_serial_sig', 'breaker', flag('relay_breaker'), 'clue_sig_serial', { if: { has: ['hulls_seen'] } }),
  radio('br_sam', 'breaker', after('br_hand_lit', 2), SAM[0], SAM[1], '“Five relays lit, and they carry voices. Eben got your warning. He says thanks. Rudely.”', { if: { has: ['eben_warned'] } }),
  radio('br_sam_b', 'breaker', after('br_hand_lit', 2), SAM[0], SAM[1], '“Juno. Five relays lit, and they carry voices. Eben’s fine. I think. Keep moving.”', { if: { not: ['eben_warned'] } }),
  main('br_note', 'breaker', after('br_hand_lit', 8), 'warden_note_5'),
  radio('br_draper', 'breaker', flag('warden_note_5'), 'Director Draper', 'office', '“Your gran built the case, Juno. I just collect on it. Family business, both of us.”', { if: { has: ['draper_revealed'] } }),
  objective('br_gate', 'breaker', flag('warden_note_5'), 'Jump to Saltquay', 'Find the room. The free ports kept the names.'),

  // ── Arrival 6 · the Tollgate: Calloway's damping field holds the gate (content/story.ts story_tollgate) ──
  // the relay answers as she arrives; without Mirren's list, Ada's room is the third proof, on the Wall before the field
  objective('tg_obj', 'tollgate', arrive(), 'The Tollgate', 'Calloway’s field · no guns, no jump'),
  { id: 'tg_hand', stop: 'tollgate', on: arrive(4), wall: 'relay_tollgate', do: { notice: { tone: 'teal', headline: 'Warden key accepted', reason: 'the relay is inside her field' } } },
  wall('tg_room', 'tollgate', after('tg_hand'), 'forty_known', { if: { not: ['forty_held'] } }),
  radio('tg_ql_small', 'tollgate', free(4), 'Owen Pike', 'gutter', '“One runner’s all I can spare. She’s good. Don’t waste her.”', { if: { has: ['thread_line_1'], not: ['thread_line_3'] } }),
  radio('tg_ql_mid', 'tollgate', free(4), 'Owen Pike', 'gutter', '“Decoys at the Tollgate. Not many. Enough to make her blink.”', { if: { has: ['thread_line_3'], not: ['thread_line_5'] } }),
  radio('tg_quill', 'tollgate', flag('field_line'), 'Quill', 'frontier', '“You said you had somewhere to be. So do we. Go.”'),
  main('tg_note', 'tollgate', flag('field_dropped'), 'warden_note_6'),
  radio('tg_cal', 'tollgate', flag('warden_note_6'), 'Governor Idris Calloway', 'calloway', '“Ten years. Nobody ever told me he asked.”', { if: { has: ['field_talked'] } }),
  radio('tg_brook', 'tollgate', after('tg_cal', 3), 'Adam Brook', 'kellern', '“Halvard Brook was my grandfather. For my father, I said. It was for him too.”', { if: { has: ['brook_free'] } }),
  radio('tg_brook_b', 'tollgate', flag('warden_note_6'), 'Adam Brook', 'kellern', '“Halvard Brook was my grandfather. For my father, I said. It was for him too.”', { if: { has: ['brook_free'], not: ['field_talked'] } }),
  objective('tg_gate', 'tollgate', flag('warden_note_6'), 'Jump to Ashdeep', 'Go where the lanes began. Ask what is waiting there.'),

  // ── Arrival 7 · the Seam: the Voice is the relay. It asks for the key; then the implant ──
  objective('se_obj', 'seam', arrive(), 'Open the Seam', 'The relay is awake'),
  { id: 'se_hand', stop: 'seam', on: relay(), wall: 'relay_seam', do: { notice: { tone: 'white', headline: 'Key received', reason: 'not by a relay' } }, main: true },
  main('se_voice', 'seam', after('se_hand', 2), 'seam_voice'),
  radio('se_echo', 'seam', after('se_voice', 2), 'Echo', 'unknown', '“It means it. It has no other way of meaning things.”', { if: { has: ['echo_trust'] } }),
  radio('se_sable', 'seam', after('se_voice', 2), 'Sable', 'unknown', '“They hear the key too. They’re turning. Not toward you. Toward it.”', { if: { has: ['sable_trust'] } }),
  notice('se_map', 'seam', after('se_voice', 4), 'teal', 'Your readings fit', 'the ring’s centre is here', { if: { has: ['thread_survey_3'] }, wall: 'survey_map' }),
  radio('se_noor', 'seam', after('se_voice', 6), 'Noor Haddad', 'office', '“I have the third key. The Governor gave it to me for this. I’m choosing not to use it.”', { if: { has: ['noor_truth'] } }),
  main('se_note', 'seam', after('se_voice', 10), 'warden_note_7'),
  main('se_implant', 'seam', flag('warden_note_7'), 'story_implant'),
  objective('se_gate', 'seam', flag('warden_note_7'), 'Jump to Lastlight', 'The Threshold. The last relay.'),
];

