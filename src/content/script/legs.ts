import type { Row } from '../../sim/script';
import { ACCOUNTS, after, ANALYST, arrive, card, flag, free, HESTER, leave, main, notice, objective, PIKE, QUILL, radio, SAM, settle, wall } from './kit';

// ── the road past the Narrows: the legs' scripts ───────────────────────────
// Seven legs, seven stops each, in the order of the Beat Map
// (docs/overhaul/BEAT_MAP.md §1): landfall, hub, work, turn, breather, work
// under pressure, reckoning. A stop has one main card (a few have a second), which holds
// the gate and comes before the stop's job. Copy is the Script's
// (docs/overhaul/SCRIPT_EN_DE.md); lines it does not give are short and in
// the same voice. The arrivals at the gates are in arrivals.ts.

const sam = (id: string, stop: string, on: Row['on'], text: string, extra: Partial<Row> = {}) => radio(id, stop, on, SAM[0], SAM[1], text, extra);
const pike = (id: string, stop: string, f: string, text: string, extra: Partial<Row> = {}) => radio(id, stop, flag(f), PIKE[0], PIKE[1], text, extra);
const hester = (id: string, stop: string, f: string, text: string, extra: Partial<Row> = {}) => radio(id, stop, flag(f), HESTER[0], HESTER[1], text, extra);
const quill = (id: string, stop: string, f: string, text: string) => radio(id, stop, flag(f), QUILL[0], QUILL[1], text);
const analyst = (id: string, stop: string, f: string, text: string, extra: Partial<Row> = {}) => radio(id, stop, flag(f), ANALYST[0], ANALYST[1], text, extra);
/** The Account answers each job won with what is left of the debt. */
const accounts = (id: string, stop: string, job: string) =>
  radio(id, stop, flag(`job_${job}_won`), ACCOUNTS[0], ACCOUNTS[1], '“{debt} outstanding. Thank you for your business.”', { if: { not: ['draper_revealed', `job_${job}_warn`] } });
const rest = (id: string, stop: string, name: string, jumps: string): Row[] => [
  notice(`${id}_notice`, stop, arrive(0), 'teal', name, 'quiet crossing · no pursuit'),
  objective(`${id}_objective`, stop, arrive(0), 'Rest here, or keep moving', jumps),
];

// ── Leg 2 · the Marches: who stands with you ──────────────────────────────
export const MARCHES_ROWS: Row[] = [
  // 1 · Wake (landfall): note 1's lead becomes the goal; the edge relay; her pursuit line, set by the Narrows answer
  notice('mw_notice', 'm_wake', arrive(), 'teal', 'Wake', 'the Marches · past the charts'),
  objective('mw_objective', 'm_wake', arrive(), 'Next: Kessel Hold', 'The Rift · 7 jumps'),
  radio('mw_edge', 'm_wake', free(6), 'Edge relay', 'unknown', '“Past here the charts are wishes. Fly carefully.”'),
  notice('mw_truth', 'm_wake', after('mw_edge'), 'teal', 'Governor Calloway', 'holding back · for now', { if: { has: ['calloway_told'] } }),
  // the ledger's second route: Brook freed without it, his own copy finds her here
  radio('mw_brook', 'm_wake', after('mw_edge', 2), 'Adam Brook', 'kellern', '“Free, and still counting. My copy of Kellern’s books is in your file now.”', { if: { has: ['brook_free'], not: ['frag_ledger'] }, wall: 'frag_ledger' }),
  wall('mw_brook_sig', 'm_wake', after('mw_brook'), 'clue_sig_reach'),
  objective('mw_gate', 'm_wake', leave(), 'Jump to Kessel Hold'),

  // 2 · Kessel Hold (hub): Oduya and the moot; then Quiet Line 2, the patrol codes
  notice('mk_notice', 'm_kessel', arrive(), 'teal', 'Kessel Hold', 'Holdfast port · the moot sits'),
  objective('mk_objective', 'm_kessel', arrive(), 'Kessel Hold · the moot wants your file', 'Holdfast port · refit bay open'),
  main('mk_moot', 'm_kessel', free(6), 'story_moot'),
  pike('mk_pike_won', 'm_kessel', 'job_keep_distance_won', '“Clean copy. Somebody walks home past a checkpoint tonight.”', { if: { not: ['job_keep_distance_sell'] } }),
  pike('mk_pike_sold', 'm_kessel', 'job_keep_distance_sell', '“You sold the timings. The Line will hear who to.”'),
  objective('mk_gate', 'm_kessel', leave(), 'Jump to Tamsin Field'),

  // 3 · Tamsin Field (work): the Account's first call (Wanted: Alive), and Calloway's first offer if she was told the truth
  notice('mt_notice', 'm_tamsin', arrive(), 'teal', 'Tamsin Field', 'contested claim'),
  objective('mt_objective', 'm_tamsin', arrive(), 'Tamsin Field · someone offers to settle your debt'),
  accounts('mt_acc', 'm_tamsin', 'wanted'),
  card('mt_meet', 'm_tamsin', free(50), 'offer_meet', { if: { has: ['calloway_told'] } }),
  card('mt_meet_lie', 'm_tamsin', free(50), 'offer_meet', { if: { has: ['calloway_lie_caught'], not: ['calloway_told'] } }),
  objective('mt_gate', 'm_tamsin', leave(), 'Jump to the Long Walk'),

  // 4 · the Long Walk (turn): Ma Saffi and the manifests; Wren after any answer
  notice('walk_notice', 'm_walk', arrive(), 'teal', 'The Long Walk', 'Drift fleet · forty hulls, lashed together'),
  objective('walk_objective', 'm_walk', arrive(), 'The Long Walk · the Drift kept the names'),
  main('walk_saffi', 'm_walk', free(6), 'story_drift'),
  radio('walk_wren', 'm_walk', after('walk_saffi', 2), 'Wren Saffi', 'miners', '“Ninefold, line nine. My parents. Gran reads the list every year. I just fly.”'),
  objective('walk_gate', 'm_walk', leave(), 'Jump to Low Harrow'),

  // 5 · Low Harrow (breather): Thren folklore, a scored hull, Wren on full tanks; Hester's call (the job is at Gannet Reach)
  ...rest('mh', 'm_harrow', 'Low Harrow', 'The Rift · 3 jumps'),
  notice('mh_hull', 'm_harrow', settle(), 'white', 'Drift hull', 'scored in long parallel lines', { wall: 'saw_scored' }),
  radio('mh_wren', 'm_harrow', after('mh_hull', 2), 'Wren Saffi', 'miners', '“Don’t run a lane full. They follow the full ones. Everybody knows that.”', { if: { full: false } }),
  radio('mh_wren_full', 'm_harrow', after('mh_hull', 2), 'Wren Saffi', 'miners', '“You’re running heavy. I’d vent some, if I were you. Gran would just stare.”', { if: { full: true } }),
  radio('mh_hester', 'm_harrow', after('mh_hull', 8), HESTER[0], HESTER[1], '“Hester again. A shift went quiet at Gannet. Eleven people. I’ve got no ships. You’ve got one.”'),
  objective('mh_gate', 'm_harrow', leave(), 'Jump to Gannet Reach'),

  // 6 · Gannet Reach (pressure): Oduya's rigs (if the moot stands with her), then Hester's missing shift
  notice('mg_notice', 'm_gannet', arrive(), 'amber', 'Gannet Reach', 'Holdfast rigs · Kellern security aboard'),
  objective('mg_objective', 'm_gannet', arrive(), 'Gannet Reach · the rigs are boarded'),
  main('mg_rigs', 'm_gannet', free(6), 'story_oduya_rigs', { if: { has: ['pact_holdfast'] } }),
  hester('mg_hester_won', 'm_gannet', 'job_missing_shift_won', '“Eleven home. That’s three. I’m still writing.”', { if: { not: ['job_missing_shift_tell'] } }),
  hester('mg_hester_lost', 'm_gannet', 'job_missing_shift_lost', '“You looked. That counts with me.”'),
  hester('mg_hester_no', 'm_gannet', 'job_missing_shift_declined', '“Then I’ll go myself.”'),
  objective('mg_gate', 'm_gannet', leave(), 'Jump to Sallow Port'),

  // 7 · Sallow Port (reckoning): the Account's heavy tanker, which carries the crews' filters
  notice('ms_notice', 'm_sallow', arrive(), 'teal', 'Sallow Port', 'Guild port · before the Rift'),
  objective('ms_objective', 'm_sallow', arrive(), 'Sallow Port · refit before the Rift'),
  accounts('ms_acc', 'm_sallow', 'heavy_tanker'),
  hester('ms_hester', 'm_sallow', 'job_heavy_tanker_won', '“That tanker carried our filters. I know whose name was on the job.”', { if: { not: ['job_heavy_tanker_warn'] } }),
  objective('ms_gate', 'm_sallow', leave(), 'The Rift · 1 jump'),
];

// ── Leg 3 · the Salvage Belt: what things are worth ───────────────────────
export const BELT_ROWS: Row[] = [
  // 1 · Breakwater (landfall): the quiet at the Rift lands one jump late; Hester's last filter
  notice('bb_notice', 'b_breakwater', arrive(), 'teal', 'Breakwater', 'the Salvage Belt · wrecks and claims'),
  notice('bb_after', 'b_breakwater', arrive(5), 'red', 'Rift relay lit', 'they know your next gate', { if: { has: ['relay_rift'] } }),
  objective('bb_objective', 'b_breakwater', arrive(), 'Next: Scrap Exchange', 'The Scrapgate · 7 jumps'),
  hester('bb_hester_won', 'b_breakwater', 'job_one_filter_won', '“Air for another month. I won’t forget it.”'),
  hester('bb_hester_lost', 'b_breakwater', 'job_one_filter_lost', '“You came. Some didn’t.”'),
  hester('bb_hester_no', 'b_breakwater', 'job_one_filter_declined', '“We’ll breathe shallow. We’re good at it.”'),
  objective('bb_gate', 'b_breakwater', leave(), 'Jump to Scrap Exchange'),

  // 2 · Scrap Exchange (hub): Val's advance
  notice('bx_notice', 'b_exchange', arrive(), 'teal', 'Scrap Exchange', 'Dust Trader port · everything for sale'),
  objective('bx_objective', 'b_exchange', arrive(), 'Scrap Exchange · everyone knows what you carry', 'Dust Trader port · refit bay open'),
  main('bx_val', 'b_exchange', free(6), 'story_broker'),
  card('bx_name', 'b_exchange', after('bx_val', 40), 'offer_identity'),
  objective('bx_gate', 'b_exchange', leave(), 'Jump to the Graveyard'),

  // 3 · the Graveyard (work): the Survey's first call
  notice('bg_notice', 'b_graveyard', arrive(), 'teal', 'The Graveyard', 'a field of old hulls'),
  objective('bg_objective', 'b_graveyard', arrive(), 'The Graveyard · a wreck that remembers'),
  analyst('bg_survey', 'b_graveyard', 'job_wreck_remembered_won', '“Good log. That hull met something out here, and turned back. Keep your scope on.”'),
  objective('bg_gate', 'b_graveyard', leave(), 'Jump to Kessler’s Wreck'),

  // 4 · Kessler's Wreck (turn): the recorder, Ada's cutter; her voice if it is cut free; Quiet Line 3, the dead drop
  notice('bk_notice', 'b_kessler', arrive(), 'teal', 'Kessler’s Wreck', 'a salvor’s claim · one old cutter'),
  objective('bk_objective', 'b_kessler', arrive(), 'Kessler’s Wreck · a recorder that still runs'),
  main('bk_kessler', 'b_kessler', free(6), 'story_salvor'),
  card('bk_box', 'b_kessler', flag('frag_blackbox'), 'story_ada', { holdsJob: true }),
  notice('bk_wall', 'b_kessler', after('bk_box'), 'teal', 'The Wall', 'Ada Aster · died 25 years ago', { wall: 'ada_died' }),
  radio('bk_after', 'b_kessler', after('bk_wall', 2), 'Dov Kessler', 'miners', '“Granddaughter. Hm. I’ll paint her name on the gate.”'),
  pike('bk_pike_lost', 'b_kessler', 'job_dead_drop_lost', '“Pickets at a drop only four people knew. One of them’s me. I’m checking the other three.”'),
  pike('bk_pike_won', 'b_kessler', 'job_dead_drop_won', '“Drop’s clean. Somebody still talked, though. I’ll find who.”'),
  objective('bk_gate', 'b_kessler', leave(), 'Jump to Saltmarsh'),

  // 5 · Saltmarsh (breather): the first sighting, a river of motes; it turns toward a full tank
  ...rest('bs', 'b_saltmarsh', 'Saltmarsh', 'The Scrapgate · 3 jumps'),
  notice('bs_river', 'b_saltmarsh', settle(), 'white', 'UNKNOWN', 'motes like a river · 1 km', { wall: 'saw_thren' }),
  objective('bs_river_obj', 'b_saltmarsh', after('bs_river'), undefined, 'Wait it out, or burn fluid to run dark.'),
  notice('bs_turn', 'b_saltmarsh', after('bs_river', 6), 'white', 'It turns', 'toward your tank', { if: { full: true }, wall: 'saw_turn' }),
  objective('bs_gate', 'b_saltmarsh', leave(), 'Jump to Kiln'),

  // 6 · Kiln (pressure): Kesh, if Val is in it; Quiet Line 4, the witness, who names Val
  notice('bn_notice', 'b_kiln', arrive(), 'amber', 'Kiln', 'Gutter crossing'),
  objective('bn_objective', 'b_kiln', arrive(), 'Kiln · someone is selling routes'),
  main('bn_kesh', 'b_kiln', free(6), 'story_kesh', { if: { has: ['broker'] } }),
  pike('bn_pike', 'b_kiln', 'job_the_witness_won', '“The witness says Val. Val’s been selling our routes to Custody. Funny. She sells yours too.”', { wall: 'val_leak' }),
  objective('bn_gate', 'b_kiln', leave(), 'Jump to Tarik’s Lamps'),

  // 7 · Tarik's Lamps (reckoning): the burned charts; Val's sale, if she was taken up; Hester's hauler
  notice('bt_notice', 'b_tarik', arrive(), 'teal', 'Tarik’s Lamps', 'chart room adrift · before the Scrapgate'),
  objective('bt_objective', 'b_tarik', arrive(), 'Tarik’s Lamps · the charts they burned'),
  main('bt_tarik', 'b_tarik', free(6), 'story_charts'),
  main('bt_val', 'b_tarik', after('bt_tarik', 6), 'story_vell_betray', { if: { has: ['broker'] } }),
  hester('bt_hester_won', 'b_tarik', 'job_long_walk_won', '“That hauler was my cousin’s. You’re on the list twice now.”'),
  hester('bt_hester_lost', 'b_tarik', 'job_long_walk_lost', '“Not your fault. The Belt eats slow ships.”'),
  objective('bt_gate', 'b_tarik', leave(), 'The Scrapgate · 1 jump'),
];

// ── Leg 4 · the Drift Deep: the ring ──────────────────────────────────────
export const DEEP_ROWS: Row[] = [
  notice('dl_notice', 'd_longwater', arrive(), 'teal', 'Longwater', 'Drift Deep · no Net here'),
  objective('dl_objective', 'd_longwater', arrive(), 'Next: The Quiet Ferry', 'The Slow Door · 7 jumps'),
  objective('dl_gate', 'd_longwater', leave(), 'Jump to the Quiet Ferry'),

  // 2 · the Quiet Ferry (hub): Ossie Raine; Quiet Line 5, Quill's race
  notice('df_notice', 'd_ferry', arrive(), 'teal', 'The Quiet Ferry', 'forty-one passengers · stores, no questions'),
  objective('df_objective', 'd_ferry', arrive(), 'The Quiet Ferry · a lane ahead, no questions'),
  main('df_ossie', 'd_ferry', free(6), 'story_ferry'),
  quill('df_quill_lost', 'd_ferry', 'job_finders_keepers_lost', '“Nice hull. Slow, though. Next time I’ll wait for you at the finish.”'),
  quill('df_quill_won', 'd_ferry', 'job_finders_keepers_won', '“Who taught you to fly like that? Nobody? Figures.”'),
  objective('df_gate', 'd_ferry', leave(), 'Jump to Lantern Mile'),

  // 3 · Lantern Mile (work): the Survey, something in the dark, moving toward the lanes
  notice('dm_notice', 'd_lantern', arrive(), 'teal', 'Lantern Mile', 'a claim with lamps on it'),
  objective('dm_objective', 'd_lantern', arrive(), 'Lantern Mile · a warm object, moving'),
  analyst('dm_survey', 'd_lantern', 'job_something_dark_won', '“Your warm object has moved four hundred metres since yesterday. Toward the lane. I’d like you to look again.”'),
  objective('dm_gate', 'd_lantern', leave(), 'Jump to Ninth Fold'),

  // 4 · Ninth Fold (turn): Corin Ashe aboard the ferry; the Account's payroll, which is Hester's crews' wages
  notice('dn_notice', 'd_fold', arrive(), 'teal', 'Ninth Fold', 'the ferry’s anchorage'),
  objective('dn_objective', 'd_fold', arrive(), 'Ninth Fold · someone aboard is watching'),
  main('dn_agent', 'd_fold', free(6), 'story_ferry_agent'),
  accounts('dn_acc', 'd_fold', 'missing_payroll'),
  hester('dn_hester', 'd_fold', 'job_missing_payroll_won', '“Somebody took our wages at the Deep. I know it was you. Your name’s in the other column now.”', { if: { not: ['job_missing_payroll_warn'] } }),
  objective('dn_gate', 'd_fold', leave(), 'Jump to Hushlight'),

  // 5 · Hushlight (breather): the Voice, first contact, in a quiet stop so it lands
  ...rest('dh', 'd_hush', 'Hushlight', 'The Slow Door · 3 jumps'),
  main('dh_voice', 'd_hush', settle(), 'sc_voice_knows'),
  objective('dh_gate', 'd_hush', leave(), 'Jump to Stillwater'),

  // 6 · Stillwater (pressure): Hester's own rig
  notice('ds_notice', 'd_still', arrive(), 'amber', 'Stillwater', 'Holdfast rig · raiders closing'),
  objective('ds_objective', 'd_still', arrive(), 'Stillwater · Hester’s own rig'),
  radio('ds_hester', 'd_still', free(4), HESTER[0], HESTER[1], '“My rig, my mother’s name on it. I’m not leaving. So you’re not either, if you’re staying.”'),
  hester('ds_hester_won', 'd_still', 'job_last_shift_won', '“Still standing. Both of us.”'),
  objective('ds_gate', 'd_still', leave(), 'Jump to Kindmere'),

  // 7 · Kindmere (reckoning): a signal that answers; the ring, from Tarik's charts or from Drift memory
  notice('dk_notice', 'd_kindmere', arrive(), 'teal', 'Kindmere', 'Holdfast stores · before the Slow Door'),
  objective('dk_objective', 'd_kindmere', arrive(), 'Kindmere · refit before the Slow Door'),
  radio('dk_tarik', 'd_kindmere', free(20), 'Tarik Silva', 'miners', '“Put every closed relay on one chart. It isn’t a bend. It’s a ring. Thirty years I’ve drawn it.”', { if: { has: ['frag_charts'] }, wall: 'ring_known' }),
  radio('dk_ossie', 'd_kindmere', free(20), 'Ossie Raine', 'miners', '“The old Drift say the closures go all the way round. Like a fence. I never asked what for.”', { if: { not: ['frag_charts'] }, wall: 'ring_known' }),
  objective('dk_gate', 'd_kindmere', leave(), 'The Slow Door · 1 jump'),
];

// ── Leg 5 · the Breaker Yards: who built it ───────────────────────────────
export const YARDS_ROWS: Row[] = [
  // 1 · Cutton (landfall): Calloway asks what gathered on the Slow Door
  notice('yc_notice', 'y_cutton', arrive(), 'teal', 'Cutton', 'the Breaker Yards · Custody watches'),
  objective('yc_objective', 'y_cutton', arrive(), 'Next: Yard Nine', 'The Breaker · 7 jumps'),
  card('yc_see', 'y_cutton', free(40), 'offer_see', { if: { has: ['slow_motes'] } }),
  objective('yc_gate', 'y_cutton', leave(), 'Jump to Yard Nine'),

  // 2 · Yard Nine (hub): Ben Anand and the first work order; Quiet Line 6, the Needle, where Quill joins
  notice('yn_notice', 'y_nine', arrive(), 'teal', 'Yard Nine', 'Kellern yard · the breakers’ birthplace'),
  objective('yn_objective', 'y_nine', arrive(), 'Yard Nine · the first work order', 'Kellern yard · refit bay open'),
  main('yn_anand', 'y_nine', free(6), 'story_workorder'),
  quill('yn_quill_won', 'y_nine', 'job_needle_won', '“You fly like you’ve got somewhere to be. Pike says you do. Fine. I’m in.”'),
  quill('yn_quill_lost', 'y_nine', 'job_needle_lost', '“You fly like you’ve got somewhere to be. Pike says you do. Fine. I’m in.”'),
  objective('yn_gate', 'y_nine', leave(), 'Jump to Anvil Slip'),

  // 3 · Anvil Slip (work): the Account's Drift cache, which is Drift property
  notice('ya_notice', 'y_anvil', arrive(), 'teal', 'Anvil Slip', 'Kellern claim · a wrecked cargo train'),
  objective('ya_objective', 'y_anvil', arrive(), 'Anvil Slip · cases drifting'),
  accounts('ya_acc', 'y_anvil', 'drift_cache'),
  radio('ya_wren', 'y_anvil', flag('job_drift_cache_won'), 'Wren Saffi', 'miners', '“Those were our cases. Gran says to stop calling you ours.”', { if: { has: ['pact_drift'] } }),
  objective('ya_gate', 'y_anvil', leave(), 'Jump to Keelberth'),

  // 4 · Keelberth (turn): Sam, patched through the relays: Eben and the scarred hulls; the Survey's voice on the wire
  notice('yk_notice', 'y_keel', arrive(), 'teal', 'Keelberth', 'Kellern breaking yard'),
  objective('yk_objective', 'y_keel', arrive(), 'Keelberth · Sam, through the relays'),
  main('yk_sam', 'y_keel', free(6), 'story_tam_brother'),
  analyst('yk_survey', 'y_keel', 'job_voice_wire_won', '“The relay that hailed you heard the Narrows handshake. It’s listening to Ada’s route, not to you. Interesting distinction.”'),
  objective('yk_gate', 'y_keel', leave(), 'Jump to Cradle Gap'),

  // 5 · Cradle Gap (breather): the cage, a breaker still holding a knot of motes
  ...rest('yg', 'y_cradle', 'Cradle Gap', 'The Breaker · 3 jumps'),
  notice('yg_cage', 'y_cradle', settle(), 'white', 'Breaker BY9-014', 'its field still holds something', { wall: 'saw_cage' }),
  radio('yg_foreman', 'y_cradle', after('yg_cage', 3), 'The yard foreman', 'frontier', '“Seventy years in there. Hums at night. Faces the tanks when we refuel.”'),
  notice('yg_pulse', 'y_cradle', after('yg_foreman', 4), 'white', 'It pulses', 'toward your tank', { if: { full: true } }),
  objective('yg_gate', 'y_cradle', leave(), 'Jump to Torchwall'),

  // 6 · Torchwall (pressure): Marit Voss and the strike; Hester's crossing
  notice('yt_notice', 'y_torch', arrive(), 'amber', 'Torchwall', 'yard crossing · crews restless'),
  objective('yt_objective', 'y_torch', arrive(), 'Torchwall · the crews may strike'),
  main('yt_marit', 'y_torch', free(6), 'story_crew'),
  radio('yt_hester', 'y_torch', flag('crews_stood'), HESTER[0], HESTER[1], '“Every crew you helped is standing at the Breaker. I didn’t ask them. That’s the point.”', { if: { has: ['thread_crews_5'] } }),
  hester('yt_hester_won', 'y_torch', 'job_kill_zone_won', '“Crossing’s open. My people can get to the Breaker now.”'),
  objective('yt_gate', 'y_torch', leave(), 'Jump to Davit Dock'),

  // 7 · Davit Dock (reckoning): Draper shows himself; Accounts was his desk
  notice('yd_notice', 'y_davit', arrive(), 'teal', 'Davit Dock', 'Frontier dock · before the Breaker'),
  objective('yd_objective', 'y_davit', arrive(), 'Davit Dock · who has been paying you'),
  main('yd_draper', 'y_davit', free(8), 'story_draper'),
  objective('yd_gate', 'y_davit', leave(), 'The Breaker · 1 jump'),
];

// ── Leg 6 · the Free Ports: who was in the room ───────────────────────────
export const PORTS_ROWS: Row[] = [
  notice('fs_notice', 'f_saltquay', arrive(), 'teal', 'Saltquay', 'the Free Ports · everyone trades'),
  objective('fs_objective', 'f_saltquay', arrive(), 'Next: Duarte Harbour', 'The Tollgate · 7 jumps'),
  radio('fs_officer', 'f_saltquay', free(10), 'Checkpoint officer · Offices of Peace', 'custody', '“Inspector Ashgrove has been reassigned. I’m told you know why. Registry, please.”', { if: { has: ['ashgrove_met'] } }),
  objective('fs_gate', 'f_saltquay', leave(), 'Jump to Duarte Harbour'),

  // 2 · Duarte Harbour (hub): Ines Duarte's berth
  notice('fd_notice', 'f_duarte', arrive(), 'teal', 'Duarte Harbour', 'Dust Trader harbour · very good manners'),
  objective('fd_objective', 'f_duarte', arrive(), 'Duarte Harbour · a berth, no questions', 'Free port · refit bay open'),
  main('fd_ines', 'f_duarte', free(6), 'story_harbour'),
  objective('fd_gate', 'f_duarte', leave(), 'Jump to Penny Cross'),

  // 3 · Penny Cross (work): the Survey's tell, confirmed: it answers a full tank
  notice('fp_notice', 'f_penny', arrive(), 'teal', 'Penny Cross', 'Gutter claim'),
  objective('fp_objective', 'f_penny', arrive(), 'Penny Cross · something answers a full tank'),
  analyst('fp_survey', 'f_penny', 'job_someone_answered_won', '“It answers only when your tank is full. Every time. I think you’ve worked out what that means.”', { wall: 'clue_cyrite' }),
  notice('fp_wall', 'f_penny', after('fp_survey'), 'teal', 'The Wall', 'Cyrite draws them'),
  objective('fp_gate', 'f_penny', leave(), 'Jump to Mirren’s Pier'),

  // 4 · Mirren's Pier (turn): Old Mirren and the Forty; the Account, now Draper by name
  notice('fm_notice', 'f_mirren', arrive(), 'teal', 'Mirren’s Pier', 'a ledger-keeper’s skiff'),
  objective('fm_objective', 'f_mirren', arrive(), 'Mirren’s Pier · forty names in a box'),
  main('fm_mirren', 'f_mirren', free(6), 'story_witnesses'),
  notice('fm_names', 'f_mirren', flag('forty_held'), 'teal', 'The Wall', 'the Forty · Ada Aster listed'),
  radio('fm_ines', 'f_mirren', after('fm_names', 3), 'Old Mirren', 'guild', '“Duarte, line twelve. Ask your harbour-master who her great-grandmother was.”', { if: { has: ['ines_berth'] } }),
  objective('fm_gate', 'f_mirren', leave(), 'Jump to Lucky Haven'),

  // 5 · Lucky Haven (breather): people who live with them; Thren glass for sale; children in the damping field
  ...rest('fh', 'f_haven', 'Lucky Haven', 'The Tollgate · 3 jumps'),
  notice('fh_glass', 'f_haven', settle(), 'white', 'Thren glass', 'sold by the gram, dock four', { wall: 'saw_glass' }),
  radio('fh_kids', 'f_haven', after('fh_glass', 4), 'A child on the dock', 'frontier', '“They’re in the field again. They don’t do anything. Mum says they’re lucky.”', { if: { full: false } }),
  radio('fh_kids_full', 'f_haven', after('fh_glass', 4), 'A child on the dock', 'frontier', '“They’re all looking at your ship. They like you!”', { if: { full: true } }),
  objective('fh_gate', 'f_haven', leave(), 'Jump to Gilt Market'),

  // 6 · Gilt Market (pressure): Ines's price, Val's reckoning, Corin Ashe if he was exposed or used; Quiet Line 7
  notice('fg_notice', 'f_gilt', arrive(), 'amber', 'Gilt Market', 'Gutter market · everyone wants a copy'),
  objective('fg_objective', 'f_gilt', arrive(), 'Gilt Market · everyone wants a copy'),
  main('fg_ines', 'f_gilt', free(6), 'story_ines_offer', { if: { has: ['ines_berth'] } }),
  main('fg_val', 'f_gilt', free(30), 'story_vell_reckoning', { if: { has: ['broker'] } }),
  radio('fg_ashe', 'f_gilt', free(14), 'Corin Ashe', 'office', '“They pulled me off the Ferry. I read the reports I filed on you. I’m not filing any more.”', { if: { has: ['agent_exposed'] } }),
  radio('fg_ashe_used', 'f_gilt', free(14), 'Corin Ashe', 'office', '“They pulled me off the Ferry. I read the reports I filed on you. I’m not filing any more.”', { if: { has: ['agent_used'], not: ['agent_exposed'] } }),
  pike('fg_pike', 'f_gilt', 'job_lose_prefect_won', '“Her relay’s blind. That’s seven, if you’re counting. Quill is.”'),
  objective('fg_gate', 'f_gilt', leave(), 'Jump to Ninehaven'),

  // 7 · Ninehaven (reckoning): the Voice on the approach: Ada's note 1, back in static; then "We kept the keys"
  notice('fn_notice', 'f_nine', arrive(), 'teal', 'Ninehaven', 'free port · before the Tollgate'),
  objective('fn_objective', 'f_nine', arrive(), 'Ninehaven · refit before the Tollgate'),
  radio('fn_static', 'f_nine', free(8), 'Static', 'unknown', '“…if the relays still know my name…”'),
  main('fn_voice', 'f_nine', after('fn_static', 4), 'story_voice'),
  objective('fn_gate', 'f_nine', leave(), 'The Tollgate · 1 jump'),
];

// ── Leg 7 · the Hollows: what it was for ──────────────────────────────────
export const HOLLOWS_ROWS: Row[] = [
  notice('ha_notice', 'h_ashdeep', arrive(), 'teal', 'Ashdeep', 'the Hollows · nothing human lives here'),
  notice('ha_act', 'h_ashdeep', arrive(6), 'white', 'Act III', 'what the file is worth'),
  objective('ha_objective', 'h_ashdeep', arrive(), 'Next: Hollowforge', 'The Seam · 7 jumps'),
  objective('ha_gate', 'h_ashdeep', leave(), 'Jump to Hollowforge'),

  // 2 · Hollowforge (hub): the Thren speak, the Voice translating
  notice('hf_notice', 'h_forge', arrive(), 'teal', 'Hollowforge', 'a Voice foundry · still running'),
  objective('hf_objective', 'h_forge', arrive(), 'Hollowforge · a pattern on the scope'),
  notice('hf_scope', 'h_forge', free(6), 'white', 'Scope pattern', 'it repeats when you move', { wall: 'saw_thren' }),
  main('hf_thren', 'h_forge', after('hf_scope', 4), 'story_thren'),
  objective('hf_gate', 'h_forge', leave(), 'Jump to Coldvault'),

  // 3 · Coldvault (work): two captains, one wreck (the Account's last)
  notice('hv_notice', 'h_vault', arrive(), 'teal', 'Coldvault', 'a foundry’s spoil field'),
  objective('hv_objective', 'h_vault', arrive(), 'Coldvault · the ring’s centre is near'),
  accounts('hv_acc', 'h_vault', 'two_captains'),
  objective('hv_gate', 'h_vault', leave(), 'Jump to Palecairn'),

  // 4 · Palecairn (turn): Echo or Sable
  notice('hc_notice', 'h_cairn', arrive(), 'teal', 'Palecairn', 'dead relay · one lone scout'),
  objective('hc_objective', 'h_cairn', arrive(), 'Palecairn · two voices want something'),
  main('hc_two', 'h_cairn', free(6), 'story_echo_sable'),
  objective('hc_gate', 'h_cairn', leave(), 'Jump to Mute Hall'),

  // 5 · Mute Hall (breather): they line the lane; nobody drew it
  ...rest('hm', 'h_mute', 'Mute Hall', 'The Seam · 3 jumps'),
  radio('hm_sable', 'h_mute', settle(), 'Sable', 'unknown', '“Nobody human. They’ve drawn it for longer than there have been people.”', { if: { has: ['sable_trust'] } }),
  objective('hm_gate', 'h_mute', leave(), 'Jump to Ghostcinder'),

  // 6 · Ghostcinder (pressure): the swarm lane; machines letting swarms through the gates
  notice('hg_notice', 'h_cinder', arrive(), 'red', 'Ghostcinder', 'swarm lane · Thren in numbers'),
  objective('hg_objective', 'h_cinder', arrive(), 'Ghostcinder · the swarm lane'),
  objective('hg_gate', 'h_cinder', leave(), 'Jump to Gaunt Watch'),

  // 7 · Gaunt Watch (reckoning): Noor Haddad, the Survey buyer, who holds the third key
  notice('hw_notice', 'h_gaunt', arrive(), 'teal', 'Gaunt Watch', 'a Continuance cutter · no weapons showing'),
  objective('hw_objective', 'h_gaunt', arrive(), 'Gaunt Watch · the Governor’s aide'),
  main('hw_noor', 'h_gaunt', free(6), 'story_aide'),
  objective('hw_gate', 'h_gaunt', leave(), 'The Seam · 1 jump'),
];

// ── Leg 8 · the Last Lanes: what you do with it ───────────────────────────
export const LAST_ROWS: Row[] = [
  notice('ll_notice', 'l_lastlight', arrive(), 'teal', 'Lastlight', 'the Last Lanes · the Threshold ahead'),
  objective('ll_objective', 'l_lastlight', arrive(), 'Next: The Last Toll', 'The Threshold · 7 jumps'),
  objective('ll_gate', 'l_lastlight', leave(), 'Jump to the Last Toll'),

  // 2 · the Last Toll (hub): Oren Lisle's toll
  notice('lt_notice', 'l_toll', arrive(), 'teal', 'The Last Toll', 'a toll platform · one lit window'),
  objective('lt_objective', 'l_toll', arrive(), 'The Last Toll · every lane ends here'),
  main('lt_toll', 'l_toll', free(6), 'story_toll'),
  objective('lt_gate', 'l_toll', leave(), 'Jump to Thin Gap'),

  // 3, 4, 5 · Oren's three questions, one at each light
  notice('lg_notice', 'l_gap', arrive(), 'teal', 'Thin Gap', 'Oren’s first light'),
  objective('lg_objective', 'l_gap', arrive(), 'Thin Gap · the first question'),
  main('lg_oren', 'l_gap', free(6), 'story_oren_who'),
  objective('lg_gate', 'l_gap', leave(), 'Jump to Dimrim'),
  notice('ld_notice', 'l_dimrim', arrive(), 'teal', 'Dimrim', 'Oren’s second light'),
  objective('ld_objective', 'l_dimrim', arrive(), 'Dimrim · the second question'),
  main('ld_oren', 'l_dimrim', free(6), 'story_oren_cost'),
  objective('ld_gate', 'l_dimrim', leave(), 'Jump to Lone Step'),
  ...rest('ls', 'l_step', 'Lone Step', 'The Threshold · 3 jumps'),
  main('ls_oren', 'l_step', settle(), 'story_oren_why'),
  main('ls_voice', 'l_step', after('ls_oren', 6), 'sc_voice_direct'),
  objective('ls_gate', 'l_step', leave(), 'Jump to Dusk Mark'),

  // 6 · Dusk Mark (pressure): instruments disagree; Ashgrove signals through, or flies with Draper; her last offer
  notice('lk_notice', 'l_dusk', arrive(), 'amber', 'Dusk Mark', 'one system from the end'),
  objective('lk_objective', 'l_dusk', arrive(), 'Dusk Mark · instruments disagree'),
  radio('lk_ash', 'l_dusk', free(12), 'Inspector Ashgrove', 'custody', '“Good afternoon. You never once shot at my people. I’ve put that in writing. Go on through.”', { if: { has: ['ashgrove_met'], not: ['ashgrove_crossed'] }, wall: 'ashgrove_clean' }),
  radio('lk_ash_fleet', 'l_dusk', free(12), 'Inspector Ashgrove', 'custody', '“Ashgrove, with the Director’s fleet. Nothing personal. I did say I’d remember the hull.”', { if: { has: ['ashgrove_crossed'] }, wall: 'draper_director' }),
  card('lk_stop', 'l_dusk', free(45), 'offer_stop'),
  objective('lk_gate', 'l_dusk', leave(), 'Jump to Wane Rest'),

  // 7 · Wane Rest (reckoning): Draper's fleet hails; beyond the ring they are gathering; Sam on the line, if the relays carry him
  notice('lw_notice', 'l_wane', arrive(), 'teal', 'Wane Rest', 'the last stop · the Threshold beyond'),
  objective('lw_objective', 'l_wane', arrive(), 'Wane Rest · the Threshold is behind her'),
  radio('lw_draper', 'l_wane', free(8), 'Director Draper', 'office', '“Last chance to sell, Juno. Past that gate it’s a recovery, and I recover everything.”'),
  notice('lw_motes', 'l_wane', leave(), 'white', 'Beyond the ring', 'they are gathering'),
  radio('lw_sam', 'l_wane', after('lw_motes', 3), SAM[0], SAM[1], '“{relays} relays. I can hear you, Juno. Whatever you pick, I’m on the line.”', { if: { has: ['relays_4'] } }),
];

export const LEG_ROWS: Row[] = [...MARCHES_ROWS, ...BELT_ROWS, ...DEEP_ROWS, ...YARDS_ROWS, ...PORTS_ROWS, ...HOLLOWS_ROWS, ...LAST_ROWS];
