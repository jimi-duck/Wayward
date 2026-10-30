# WAYWARD · Narrative Overhaul Report

28 Oct 2026. This is text-only work: no game code was changed, at your request.

## Delivered
- **Story Bible**: the underlying truth of the world, the factions, the cast, the rules for Cyrite and the Thren, the choice flags, a timeline of who knows what, what each ending means, and a style sheet.
- **Beat Map**: every stop from Cerro to the epilogue, the evidence chain with a second route for every essential clue, sequencing rules, Calloway's scenes leg by leg, the four threads and the Thren meetings.
- **Script (EN/DE)**: the eight arrivals and all eight Warden's notes, revised and new cards and radio lines for the Marches to the Last Lanes, thread payoffs, new lines for Calloway at the Threshold, and all six epilogues.

## The big decisions
1. **What the Severance was.** The lanes are older than people. Cyrite is laid down by the Thren, so every full tank is a piece of them being carried away. The closure was a real answer to a real danger. It was carried out with two lies (neglect, and the fuel shortage) and kept going for Kellern's profit.
2. **Ada was in the room.** Her readings made the case for the closure. Her notes move from guidance (1–4) to confession (5–6) to understanding (7) to a personal letter (8).
3. **Lucan Calloway asked for ten years and a warning, then signed anyway.** This turns "Show the signature" into a scene between a daughter and her dead father, and makes Idris a credible opponent rather than a villain.
4. **Juno was chosen.** Ada's routine moved this hull onto her bond list. Note 8 says so and apologises. If the implant is burned, the note is addressed to "whoever flies her" instead.
5. **Each relay is a broadcast.** Every answer also exposes Juno. This is kept as the game's main source of pressure.
6. **Draper is Accounts.** Calloway wants the past kept quiet. Draper wants to sell it.
7. **Sam comes back only through lit relays,** twice: at the Breaker Yards, and once at the Threshold if at least four relays were lit.
8. **Calloway's offers go from nine to five,** each tied to a leg.
9. **Main beats are tied to fixed stops, and each gate holds until that leg's main beat has played.** This fixes the "more beats than systems" problem (Mirren's list, the Tollgate scene, Oren's questions finishing twice).
10. **Every essential clue can be found two ways.** Missing optional content never blocks "Show the signature", the ring or the Thren reveal.

## Moved or consolidated
- Val's advance moves from the Rift to the Salvage Belt hub.
- Tarik moves from the Scrapgate to the Belt's reckoning stop.
- Anand moves to the Breaker Yards hub.
- Ines moves to the Free Ports hub.
- The Voice's "We kept the keys" moves to the Free Ports' last stop.
- Noor moves to the Hollows' last stop.
- Each gate now carries only its arrival.
- The Ferry agent is named Corin Ashe.
- Wren becomes Ma Saffi's granddaughter.
- Halvard Brook becomes the second Warden in the room.
- Hester gets a surname, Vane.
- The Edge relay line moves to the Marches.

## Not verified, needs checking against the code
- **Copy limits.** The 32/19/8 word limits come from the Authored Road and have not been confirmed in the code. The notes run about 75–95 words; the built note 1 is about 75.
- **German terms.** The script assumes the German build uses "Cyrit", "Sprungfluid", "Spur" for lane, "Wächter" for Warden, "Streuung" for Scatter, "die Ämter" for the Offices and "Kontinuum" for the Continuance. Check these against the existing German strings before anything goes in. A shipped German glossary takes priority over these choices.
- **Flag names.** The flag names in the bible are descriptive, not the real ones from the code.
- **Job titles.** The Authored Road names Quiet Line step 2 "Stay Out of Range". That is not a job in the walkthrough's list, so this script uses Copy the Patrol Codes. The Road's "Stolen Payroll" is "The Missing Payroll" in the job list; the script keeps "Stolen Payroll" in the thread tables. Please confirm both.
- **Scenes that need new state or sequencing**, marked **[needs build]** in the Beat Map:
  - the gate-hold rule beyond the Narrows;
  - the second routes for clues;
  - the Rift's guided flight;
  - the "Run it with the Line" answer;
  - the two variants of note 8;
  - the epilogue lines that read new flags.

## Decided (28 Oct)
- Ada's confession in note 5 stays at full weight: she carried the readings into the room.
- Seal silences the Thren for good: the lanes close and the motes stop gathering.
- In German, Calloway switches from Sie to du once Juno has told her the truth at least twice.
