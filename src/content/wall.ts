import { FRAGMENTS_ALL } from './story';

// ── the Wall ──────────────────────────────────────────────────────────────
// What the archive has put together so far, as the player reads it: each
// fragment of the Severance file and each supporting clue says what it
// proves, what it does not prove yet, and where to look next. The rows are
// read off flags the story already sets (`frag_*`, `clue_*`); the Wall adds
// no state of its own (sim/wall.ts). docs/STORY_BIBLE.md §8 and §9 say why
// each row is worded as it is.
//
// `at` is the region the row belongs to on the eight-region chart, -1 for
// Cerro. `short` marks the rows the three-region chart plays too.

export type Certainty = 'fact' | 'inference';

export interface WallItem {
  flag: string;
  kind: 'fragment' | 'clue';
  name: string;
  certainty: Certainty;
  /** The region it comes in (eight-region chart; -1 is Cerro). */
  at: number;
  /** One line: what it proves. */
  proves: string;
  /** One line: what it does not prove yet. */
  not: string;
  /** For the curious: a little more. Never the only place a fact lives. */
  detail: string;
  /** The question it answers, shown while it is missing. */
  ask: string;
  /** Where to look next, once it is found. */
  lead: string;
  /** On the three-region chart too. */
  short?: boolean;
}

type Row = Omit<WallItem, 'kind' | 'name'> & { name?: string };

const fragment = (r: Row): WallItem => {
  const f = FRAGMENTS_ALL.find((x) => x.flag === r.flag);
  if (!f) throw new Error(`no fragment ${r.flag}`);
  return { kind: 'fragment', ...r, name: f.name };
};
const clue = (r: Row & { name: string }): WallItem => ({ kind: 'clue', ...r });

/** In the order the story finds them. */
export const WALL: WallItem[] = [
  clue({
    flag: 'archive_woke', name: 'The archive woke', certainty: 'fact', at: -1, short: true,
    proves: 'The sealed archive opened on your hand, and the registry logged it.',
    not: 'Why it knew you, or who sealed it.',
    detail: 'A legacy key, good for this hull only, opened it. It points to the old relay in Halden’s Reach.',
    ask: 'Why did the hauler wake?',
    lead: 'Reach the old relay in Halden’s Reach, then find what the shortage story hides.',
  }),
  clue({
    flag: 'clue_archive_log', name: 'The Warden Line log', certainty: 'fact', at: -1, short: true,
    proves: 'A routine called ADA-1 wakes when a Warden bloodline hand takes the helm.',
    not: 'What Ada Aster meant it to do.',
    detail: 'The routine is signed A. Aster, Lane Warden. It was written for someone it expected to come, not for whoever stole the hull.',
    ask: 'Who built the routine?',
    lead: 'Ada Aster wanted this found. Learn who remembers her.',
  }),
  clue({
    flag: 'clue_reserves', name: 'Krail reserves: 94%', certainty: 'fact', at: -1, short: true,
    proves: 'The Krail shortage was a cover. Reserves stood at 94% the day the lanes closed.',
    not: 'Who ordered the closing, why, or what the Thren have to do with it.',
    detail: 'The archive holds the Continuance’s own stock report and its shortage order, both dated day one. They cannot both be true.',
    ask: 'Was there ever a shortage?',
    lead: 'Someone in the Reach heard the order given, and Kellern keeps its books there.',
  }),
  fragment({
    flag: 'frag_order', certainty: 'fact', at: 0, short: true,
    proves: 'The lanes were shut by signed order, not by failure.',
    not: 'Who signed it, or why.',
    detail: 'A relay operator remembers the order arriving with a core seal, and the instruction to stop answering calls.',
    ask: 'Who shut the lanes, and on whose word?',
    lead: 'Kellern’s books should show where the Krail went.',
  }),
  clue({
    flag: 'clue_order_sig', name: 'The closing order, signed L. C.', certainty: 'fact', at: 0,
    proves: 'The order to close the outer relays was written and signed, by someone marked L. C.',
    not: 'Who L. C. is.',
    detail: 'Order of Continuity 1: the relays powered down, the Wardens to surrender their keys, the closure to be recorded as neglect.',
    ask: 'Who signed the closing order?',
    lead: 'Kellern’s books may carry the same initials.',
  }),
  clue({
    flag: 'clue_relay_answered', name: 'The Narrows relay answered Ada’s key', certainty: 'fact', at: 0,
    proves: 'The Narrows relay still answers Ada’s key, and it named the hull that carried it, on every band.',
    not: 'Who was listening, or how many.',
    detail: 'The mast lit section by section when the key reached it. The Warden channel opened and announced both.',
    ask: 'Who knows the archive is aboard?',
    lead: 'Anyone listening on the Warden channel. Keep moving.',
  }),
  clue({
    flag: 'warden_note_1', name: 'Warden’s note 1 of 8', certainty: 'fact', at: 0,
    proves: 'Ada Aster switched the Narrows off on order, kept the key, and left seven more relays that know her name.',
    not: 'What she saw at the other relays.',
    detail: 'Left in the Narrows relay for whoever the relays let through. It ends: find the Drift, they never stopped moving.',
    ask: 'What did Ada leave on the road?',
    lead: 'Find the Drift.',
  }),
  clue({
    flag: 'ada_named', name: 'Ada Aster', certainty: 'fact', at: 0,
    proves: 'The archive’s writer was Ada Aster, a Lane Warden on the Narrows watch.',
    not: 'What she saw there, or why she left the relay listening.',
    detail: 'A retired Warden knew the routine in the hull by its habits. Juno’s family were only ever told Ada was lost in service.',
    ask: 'Who wrote the archive?',
    lead: 'Go to the Narrows. Ada left it listening.',
  }),
  fragment({
    flag: 'frag_ledger', certainty: 'fact', at: 0, short: true,
    proves: 'Krail never ran short. The books show it moved to core stores and private accounts.',
    not: 'Who ordered the lanes closed, or what the Thren have to do with it.',
    detail: 'Every shipment the Scatter was refused is entered twice: once as scarce, once as stored.',
    ask: 'Where did the Krail really go?',
    lead: 'The Marches lost ships that night. Their manifests may say where they went.',
  }),
  clue({
    flag: 'clue_sig_reach', name: 'Initials on the authorisation', certainty: 'inference', at: 0,
    proves: 'The ledger’s releases are all authorised by someone marked L. C.',
    not: 'Who L. C. is.',
    detail: 'Two initials and a core seal, on every release. The same hand each time.',
    ask: 'Who is L. C.?',
    lead: 'A work order in the Breaker Yards may carry the same hand.',
  }),
  fragment({
    flag: 'frag_manifests', certainty: 'fact', at: 1, short: true,
    proves: 'Ships “lost” in the blackout were redirected or scuttled on purpose.',
    not: 'Who gave the orders, or why.',
    detail: 'Dozens of hulls were routed into lanes already announced closed.',
    ask: 'What happened to the ships lost that night?',
    lead: 'A Warden’s wreck may hold the last call from the night. Try the Salvage Belt.',
  }),
  fragment({
    flag: 'frag_blackbox', certainty: 'fact', at: 2,
    proves: 'Ada Aster’s Warden ship recorded the night, and she meant the archive for her family.',
    not: 'Her whole reason.',
    detail: 'Her last call names the relay and the order, and something she would not describe on an open line.',
    ask: 'What did Ada Aster see that night?',
    lead: 'Old charts should show how the lanes were closed. Look in the Drift Deep.',
  }),
  fragment({
    flag: 'frag_charts', certainty: 'inference', at: 3,
    proves: 'The closures form a ring: a way of holding something in, not a supply line.',
    not: 'What the ring holds.',
    detail: 'Drawn by hand from burned charts. Every closed lane crosses the same circle.',
    ask: 'What pattern did the closures follow?',
    lead: 'Someone built the machines that closed the lanes. The Breaker Yards filed everything.',
  }),
  clue({
    flag: 'clue_agent', name: 'An Office agent aboard', certainty: 'fact', at: 3,
    proves: 'The Offices of Peace ride the unregistered routes too, and watch who moves.',
    not: 'What they have already reported.',
    detail: 'The Quiet Ferry carries people no one asks about. One of them was writing it all down.',
    ask: 'Who else rides the quiet routes?',
    lead: 'The Breaker Yards are where the Custody takes its own ships apart.',
  }),
  fragment({
    flag: 'frag_workorder', certainty: 'fact', at: 4,
    proves: 'The Continuance ordered the lane breakers built, with a date, a budget and a seal.',
    not: 'Whose name the seal stands for in full.',
    detail: 'Every breaker built has a work order. This is the first, in the Continuance’s own hand.',
    ask: 'Who built the machines that closed the lanes?',
    lead: 'The names of those in the room may be kept in the Free Ports.',
  }),
  clue({
    flag: 'clue_sig_yards', name: 'The Governor’s cipher', certainty: 'inference', at: 4,
    proves: 'The work order’s seal is a Governor’s cipher, the same hand as the ledger’s L. C.',
    not: 'Which Governor, or their full name.',
    detail: 'The cipher is partial. The family mark is there; the name is not.',
    ask: 'Whose cipher is this?',
    lead: 'The full signature may sit in the minutes of the room. Find the Forty.',
  }),
  clue({
    flag: 'clue_scarred', name: 'Thren-scarred hulls', certainty: 'fact', at: 4,
    proves: 'Hulls under restriction at the yards carry scars no human weapon makes.',
    not: 'What made them, or when.',
    detail: 'Claw-cut plate and cored frames, stacked in the breaking berths under the Custody’s seals.',
    ask: 'What scarred these hulls?',
    lead: 'Something besides the Continuance was in this. Ask who was in the room.',
  }),
  clue({
    flag: 'clue_draper', name: 'One man, two badges', certainty: 'fact', at: 4,
    proves: 'Foreman Draper of Kellern answers to the Offices’ asset recovery desk.',
    not: 'Whether he acts on orders or on his own.',
    detail: 'Draper has worn the Kellern badge since Cerro. Under it, the Offices of Peace hold his contract.',
    ask: 'Who does the foreman really work for?',
    lead: 'He wants the file destroyed, and the fleet that destroys it is on its way to the Threshold.',
  }),
  fragment({
    flag: 'frag_witnesses', certainty: 'fact', at: 5,
    proves: 'Forty people were in the room when the order was read, and kept quiet.',
    not: 'That each took a bargain, or that their heirs are guilty.',
    detail: 'Scatter leaders are on the list beside core officials. Some got Krail rights, contracts or safety. Ancestry is not guilt.',
    ask: 'Who was in the room, and what did they accept?',
    lead: 'Find the full signature in the minutes, then see what the keys guard.',
  }),
  clue({
    flag: 'clue_sig_ports', name: 'Lior Calloway’s signature', certainty: 'fact', at: 5,
    proves: 'The minutes carry the full signature: Deputy Governor Lior Calloway.',
    not: 'What his daughter knows. It is not Ada’s recording.',
    detail: 'The same hand as the ledger’s L. C. and the yard’s cipher. Idris Calloway’s father signed the Severance order.',
    ask: 'Whose hand signed the order?',
    lead: 'She will want to know. Decide who hears it first.',
  }),
  fragment({
    flag: 'frag_keys', certainty: 'fact', at: 6, short: true,
    proves: 'The Voice built the lane breakers and still guards them, because it was told to.',
    not: 'Why the lanes had to be closed.',
    detail: '“We kept the keys. We were told to.” The Voice has held them for seventy years.',
    ask: 'Who holds the keys, and what are they guarding?',
    lead: 'Ask what the keys hold back.',
  }),
  clue({
    flag: 'clue_cyrite', name: 'Cyrite draws the Thren', certainty: 'fact', at: 6,
    proves: 'The Thren follow moving Cyrite. Deep mining woke or drew them, and the closed lanes held them in.',
    not: 'Whether they can be stopped, or whether the lanes may open.',
    detail: 'The threat was real. The Continuance used it, hid who chose, and left whole worlds outside.',
    ask: 'What does Cyrite have to do with it?',
    lead: 'The Threshold waits. Decide what the file is for.',
  }),
];

export const WALL_BY_FLAG: Record<string, WallItem> = Object.fromEntries(WALL.map((w) => [w.flag, w]));
