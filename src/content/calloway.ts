import type { Face } from '../sim/captains';
import type { CardDef } from '../sim/comms';

// ── Calloway ──────────────────────────────────────────────────────────────
// Prefect Idris Calloway, Office of Peace: the hunter who follows the
// Wayward's trail (sim/hunt.ts) and keeps a file on you (sim/calloway.ts).
// This is what the file is made of and what she says about it: the tricks
// she can learn, the habits she can read, the offers she makes, and the
// numbers for all of it. Her two everyday cards (`calloway_here`,
// `calloway_word`) live with the rest in content/cards.ts and read the file
// through `wise` and `hunch` conditions; the offers are here; the last
// meeting at the Threshold is built from the file in sim/calloway.ts.

/** The ways of getting away from her that she can learn. */
export type Trick = 'lie' | 'bluff' | 'decoy' | 'dark' | 'run' | 'fight' | 'plan' | 'fleet';

/** Each trick, in words (her file on the chart, the last meeting's lines). */
export const TRICK_WORDS: Record<Trick, string> = {
  lie: 'false headings', bluff: '“the file is already out”', decoy: 'stores dumped as a decoy', dark: 'going dark', run: 'running for the lane',
  fight: 'turning to fight', plan: 'false flight plans', fleet: 'Drift fleets that lie for you',
};

/** Which answers are which trick: `card:choice`. Every use goes in her file, whether it worked or not. */
export const TRICKS: Record<string, Trick> = {
  'calloway:lie': 'lie',
  'calloway_word:lie': 'lie',
  'calloway_here:run': 'run',
  'calloway_here:decoy': 'decoy',
  'calloway_here:talk': 'bluff',
  'calloway_here:dark': 'dark',
  'calloway_here:fight': 'fight',
  'false_trail:pay': 'plan',
  'drift_fleet:trail': 'fleet',
  'offer_tank:lie': 'lie',
  'offer_home:think': 'lie',
  'offer_passage:lie': 'lie',
  'calloway_last:bluff': 'bluff',
  'calloway_last:dark': 'dark',
};

/** Answers that told her the truth, or met her halfway: what trust is made of. */
export const TOLD = new Set(['calloway:answer', 'calloway_word:ask', 'offer_home:answer', 'offer_meet:accept', 'offer_info:tell']);

/** Each time she has seen a trick, its odds fall by this much. A spoof works less well the second time. */
export const LEARN = 0.15;
/** Systems flown (after Cerro) before she has a read on your habits, and the share of them a habit needs. */
export const READ_AT = 3;
export const HABIT = 0.5;
/** Of your jumps, the share that went straight for the Threshold that makes you predictable. */
export const STRAIGHT = 0.8;

/** Her ship against an arcade run's first capital ship, and what each beating adds: she refits for you. */
export const CALLOWAY_HP = 4;
export const HP_BEATEN = 0.35;
/** Her wing grows by one hull for every this many times you ran from her (up to three). */
export const WING_RUNS = 2;

/** Offers: seconds into a sortie she calls with one, and days between them. */
export const OFFER_AT = 60;
export const OFFER_GAP = 4;
/** She makes offers once she is this close, or has caught up at least once, and you have flown this many systems: enough for a file. */
export const OFFER_NEAR = 2;
export const OFFER_FLOWN = 2;

/** Trust she needs for the archive to move her at the Threshold: odds start here and gain this a point. */
export const ARCHIVE_BASE = 0.15;
export const ARCHIVE_TRUST = 0.18;
/** Breaking your word costs this much trust; an offer kept earns this much. */
export const BROKEN = 2;
export const KEPT = 0.5;

/** Her portrait on the comms card. */
export const CALLOWAY_FACE: Face = { skin: '#d9b59c', hair: 'swept', hairColour: '#2f2a2b', eye: 'none', mark: 'none', jaw: 'narrow' };

/** What she says about what she has learned (the last meeting, and her file on the chart). */
export const HUNCH_LINES: Record<string, string> = {
  port: '“You always stop at a dock, Juno. So I just watch the docks.”',
  mining: '“You never pass up a rock field. Neither do I, now.”',
  transit: '“You like the quiet lanes. They are quiet for me too.”',
  contested: '“You fly into every fight. That makes you easy to find.”',
  straight: '“You never turn aside, Juno. I knew where you were going.”',
};

const offer = (o: Omit<CardDef, 'kind' | 'caller' | 'trigger' | 'repeat' | 'face' | 'cargo'>): CardDef => ({
  kind: 'offer', caller: 'calloway', trigger: 'offer', face: CALLOWAY_FACE, cargo: 'A Prefect’s channel · an offer', ...o,
});

/**
 * Her offers: one at a time, no more than one every OFFER_GAP days, each at
 * most once a journey, chosen from her file (sim/calloway.ts `offerFor`):
 * what you have told her, who you know, and what you care about.
 */
export const OFFERS: CardDef[] = [
  offer({
    id: 'offer_meet', from: 'Prefect Idris Calloway · Office of Peace', title: 'Meet me',
    text: '“I can’t stop thinking about what you told me. Meet me. One ship each, no guns. I’ll listen. That’s all I promise.”',
    truths: [{ id: 'listening', weight: 3, read: 'She is alone on the channel · no wing on the scope' }, { id: 'stalling', weight: 1, read: 'Her wing is moving while she talks' }],
    choices: [
      { id: 'accept', label: 'Agree to meet', tone: 'help', hint: 'She learns where you are. You learn if she can be reached.', loseIf: ['stalling'],
        win: { text: 'She came alone. She listened. She did not say what she believed.', score: 800, hunt: -1 },
        lose: { text: 'Her wing was already moving · you break off before it closes', hunt: -1.5, heat: 0.1 } },
      { id: 'refuse', label: 'Not yet', tone: 'refuse', hint: 'Keep the distance.', win: { text: '“Then at the end, Juno.”' } },
    ],
  }),
  offer({
    id: 'offer_name', from: 'Prefect Idris Calloway · Office of Peace', title: 'A name for three days',
    text: '“Your friend on the Leaky Tin. Give me their fence’s name and you get three days. The Gutter won’t know it was you.”',
    truths: [{ id: 'quiet', weight: 2, read: 'Office channel, encrypted · she keeps her sources' }, { id: 'leaks', weight: 1, read: 'The channel is open · anyone could be listening' }],
    choices: [
      { id: 'accept', label: 'Give her the name', tone: 'trade', hint: 'Three days, and a friend sold.', loseIf: ['leaks'],
        win: { text: 'Three days · and a fence in the Gutter will not see the week out', hunt: 3, standing: { gutter: -3 }, unflag: 'gutter_friend' },
        lose: { text: 'Three days · and the Gutter heard you say it', hunt: 3, standing: { gutter: -4 }, unflag: 'gutter_friend', notice: { gutter: 8 } } },
      { id: 'refuse', label: 'Refuse', tone: 'refuse', hint: 'Some things are not for sale.', win: { text: '“Loyal. I can respect that. It changes nothing.”' } },
    ],
  }),
  offer({
    id: 'offer_tank', from: 'Prefect Idris Calloway · Office of Peace', title: 'A full tank',
    text: '“You’re always short of Cyrite, Juno. Tell me your heading and a tender fills you up. No tricks. I want you alive.”',
    choices: [
      { id: 'accept', label: 'Take the Cyrite', tone: 'trade', hint: 'Twenty Cyrite. She knows your heading.', win: { text: 'The tender pumps Cyrite aboard · she knows where you are going', cyrite: 20, heat: -0.2, hunt: -1.5 } },
      { id: 'lie', label: 'Take it, with a false heading', tone: 'bluff', hint: 'The Cyrite, and the wrong lane. If you’ve lied before, she checks.', odds: { base: 0.5, heat: -0.2, learn: 'lie' },
        win: { text: 'The Cyrite, and she turns for the wrong lane', cyrite: 20, hunt: 0.5 },
        lose: { text: '“That is not where you are going.” · the tender pulls away', hunt: -1 } },
      { id: 'refuse', label: 'Refuse', tone: 'refuse', hint: 'You will find your own.', win: { text: '“Then count it carefully.”' } },
    ],
  }),
  offer({
    id: 'offer_truce', from: 'Prefect Idris Calloway · Office of Peace', title: 'Stop, and I stop',
    text: '“Every Custody ship you break, I write to a family. Stop killing them and I stop sending them. My word for yours.”',
    choices: [
      { id: 'accept', label: 'Give her your word', tone: 'help', hint: 'Custody and Office ease off. Kill one later and she’ll know.',
        win: { text: 'Your word, and hers · the bulletins come down', notice: { custody: -8, office: -6 } } },
      { id: 'refuse', label: 'Refuse', tone: 'refuse', hint: 'They shoot first.', win: { text: '“Then I will keep writing letters.”' } },
    ],
  }),
  offer({
    id: 'offer_info', from: 'Prefect Idris Calloway · Office of Peace', title: 'What did you see?',
    text: '“The Office logs things it cannot name. You have been closer than anyone. What did you see? I will trade what we know.”',
    choices: [
      { id: 'tell', label: 'Tell her what you saw', tone: 'help', hint: 'The Office’s maps of the Net’s edge. She learns what you know.', win: { text: 'She listens · and sends her maps of the Net’s edge', flag: ['news', 'calloway_curious'], score: 400, hunt: -0.5 } },
      { id: 'sell', label: 'Sell her one piece', tone: 'trade', hint: 'Forty chits for one thing you saw. She does not get all of it.', win: { text: 'Forty chits · she knows less than she thinks', chits: 40 } },
      { id: 'refuse', label: 'Say nothing', tone: 'refuse', hint: 'What you saw is yours.', win: { text: '“Then we both guess.”' } },
    ],
  }),
  offer({
    id: 'offer_shelter', from: 'Prefect Idris Calloway · Office of Peace', title: 'Come alongside',
    text: '“Your hull is a mess. A tender can have you whole by the next watch. I will not board. My word.”',
    choices: [
      { id: 'accept', label: 'Let the tender in', tone: 'trade', hint: 'Two plates mended. The Custody is called off for now. She knows where you are.', win: { text: 'Two plates mended · her fleet stands off', plates: 2, notice: { custody: -4 }, hunt: -1 } },
      { id: 'refuse', label: 'Wave the tender off', tone: 'refuse', hint: 'You will mend her yourself.', win: { text: '“Then be careful with that hull.”' } },
    ],
  }),
  offer({
    id: 'offer_passage', from: 'Prefect Idris Calloway · Office of Peace', title: 'A clean transit stamp',
    text: '“Net checkpoints ahead. I can stamp you through the next. My name on the permit. I only need to know your exit.”',
    choices: [
      { id: 'accept', label: 'Take the permit', tone: 'trade', hint: 'The Net holds off here for four days. She knows your exit.', win: { text: 'Stamped · the checkpoints wave you on', stall: 4, hunt: -1.5, flag: 'permit' } },
      { id: 'lie', label: 'Take it, name a false exit', tone: 'bluff', hint: 'The permit and the wrong lane. If you have lied before, she checks.', odds: { base: 0.5, heat: -0.2, learn: 'lie' },
        win: { text: 'Stamped · she turns for the wrong exit', stall: 4, hunt: 0.5, flag: 'permit' },
        lose: { text: '“That is not an exit.” · the permit is void', hunt: -1 } },
      { id: 'refuse', label: 'Refuse', tone: 'refuse', hint: 'You will find your own way.', win: { text: '“Then the checkpoints are yours.”' } },
    ],
  }),
  offer({
    id: 'offer_identity', from: 'Prefect Idris Calloway · Office of Peace', title: 'A name that is not yours',
    text: '“A transponder under another name. Clean history, no Custody notice. In return, you owe me one answer, when I ask.”',
    choices: [
      { id: 'accept', label: 'Take the name', tone: 'trade', hint: 'Custody and Office forget you for a while. You owe her an answer.', win: { text: 'A new name · the bulletins go quiet', notice: { custody: -10, office: -8 }, hunt: -1, flag: 'owes_calloway' } },
      { id: 'refuse', label: 'Keep your own', tone: 'refuse', hint: 'It is the only one that is true.', win: { text: '“It is also the one they hunt.”' } },
    ],
  }),
  offer({
    id: 'offer_home', from: 'Prefect Idris Calloway · Office of Peace', title: 'The best there is',
    text: '“Come home, Juno. Bring the archive and you get a hearing, not a cell. It’s the best there is. I won’t offer it twice.”',
    choices: [
      { id: 'think', label: 'Say you will think about it', tone: 'bluff', hint: 'She waits for an answer, if she believes you.', odds: { base: 0.55, learn: 'lie' },
        win: { text: 'She gives you a day to think. You use it to run.', hunt: 1.5 },
        lose: { text: '“You are not thinking. You are running.”', hunt: -0.5 } },
      { id: 'answer', label: 'Tell her why you cannot', tone: 'help', hint: 'The archive, and what is in it.', win: { text: 'A long silence on the channel', score: 400, heat: 0.04, flag: 'calloway_told' } },
      { id: 'silence', label: 'Cut the channel', tone: 'refuse', hint: 'She triangulates while you listen.', win: { text: 'Channel cut' } },
    ],
  }),
];
