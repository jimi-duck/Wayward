// ── Juno's log ────────────────────────────────────────────────────────────
// One line in her own words as she arrives at each stop and gate of the road,
// under the system's name on the jump's title card (ui/hud.ts titleCard). It
// tells the player where they are in the story without a card: what this place
// is to her, and why she came (living-world plan, 21 November 2026). Keyed by
// the stop's script (content/road.ts); a stop with no line shows none. German
// twins in i18n/de/log.ts.

export const JUNO_LOG: Readonly<Record<string, string>> = {
  // the Reach
  northfold: 'One lane open. Gran’s key will open the rest.',
  halden: 'Old Wardens retire here. One of them kept paper.',
  marlow: 'Kellern counts everything. Someone here counted honestly.',
  branford: 'Hester’s lane. Pirates want a toll, and the Net wants me.',
  copperline: 'Last Kellern port. After this, their books stop mattering.',
  narrows: 'Gran watched this gate the night they shut it.',
  // the Marches
  m_wake: 'Cut off for seventy years, and they still send lifeboats.',
  m_kessel: 'They lost kin the night the lanes closed. I have the file.',
  m_tamsin: 'Kellern wants its debt back, with me attached.',
  m_walk: 'A fleet that never stops, keeping the names of the lost.',
  m_gannet: 'Kellern is boarding the rigs of people who stood by me.',
  m_sallow: 'Last refit before the Rift. Filters, or a fixer’s money.',
  rift: 'A dead relay, and an inspector who wants my papers.',
  // the Salvage Belt
  b_breakwater: 'Wreck country. Everything has a price here, even air.',
  b_exchange: 'Word travels. Someone is already pricing what I carry.',
  b_graveyard: 'A field of ships that met something and stopped.',
  b_kessler: 'A Warden wreck, recorder still running. It heard that night.',
  b_kiln: 'Someone sold my heading. I want to know who.',
  b_tarik: 'A man who draws the burned lanes back by hand.',
  scrapgate: 'A gate built out of ships. Gran’s key still fits.',
  // the Drift Deep
  d_longwater: 'The Drift never stops. Maybe they remember the pattern.',
  d_ferry: 'A ferry nobody hunts, and nobody asks. I like it.',
  d_lantern: 'Something warm in the rock. Digging makes it louder.',
  d_fold: 'One of the passengers has not stopped watching me.',
  d_hush: 'A quiet relay. Then a voice that is not human.',
  d_still: 'Hester’s own rig, and Custody followed me in.',
  d_kindmere: 'The closures make a ring. Tarik knows the way through.',
  slowdoor: 'Three minutes to open. Whoever is behind me gets them too.',
  // the Breaker Yards
  y_cutton: 'Forty people sealed in a cradle, their radio still on.',
  y_nine: 'The first work order, in the Continuance’s own hand.',
  y_anvil: 'Drift cargo, drifting. The Guild says it is theirs now.',
  y_keel: 'Sam, through three relays. His brother works these yards.',
  y_torch: 'The crews may strike. Draper’s men come either way.',
  y_davit: 'Whoever has been paying me is about to say hello.',
  breaker: 'One of the machines that shut the lanes. Up close.',
  // the Free Ports
  f_saltquay: 'Gutter ports. They trade anything, and they kept the names.',
  f_duarte: 'A berth and no questions. The Guild wants a friend.',
  f_penny: 'Something answers a full tank here. So do the pickets.',
  f_mirren: 'Forty names: everyone who was in the room.',
  f_gilt: 'Everyone wants a copy, and today there is a hearing.',
  f_nine: 'Static, then Gran’s voice. Then something else’s.',
  tollgate: 'Calloway shut the gate behind me. She wants a name.',
  // the Hollows
  h_ashdeep: 'Nothing human out here. This is where the lanes began.',
  h_forge: 'The pattern on the scope is talking, and I carry what it follows.',
  h_vault: 'Kellern’s tug has come for the ship. The account is due.',
  h_cairn: 'Two voices, each wanting something only I can give.',
  h_cinder: 'The swarm lane. The drones are opening the gates for it.',
  h_gaunt: 'The Governor’s aide holds a key, and wants my plan.',
  seam: 'The relay is awake, and asking for Gran’s key.',
  // the Last Lanes
  l_lastlight: 'One relay left. Then I decide what the file is for.',
  l_toll: 'An archivist at the end of every lane, with three questions.',
  l_gap: 'Who am I to carry this? He will write it down.',
  l_dimrim: 'What has it cost other people? I know some of the names.',
  l_step: 'What is it for? Everyone wants to hear my answer.',
  l_dusk: 'The instruments disagree here. So might Ashgrove.',
  l_wane: 'The last quiet. Draper’s fleet is waiting ahead.',
  threshold: 'The last relay. Gran never got this far.',
};
