import { OVERS, SLOGANS } from '../sim/scars';

// ── the signs by the Jump Gates ───────────────────────────────────────────
// Every live gate on the road stands beside a few public displays (sim/signs.ts
// picks, render/signs.ts draws). Their lines live here, as plain rows, so one
// can be added, edited or removed on its own. Write them in sentence case; the
// panel sets them in capitals.
//
//   official    · the Continuance's own, calm and sure
//   defaced     · the same, altered by hand: `[old|new]` shows the old words struck out and the new ones over them
//   resistance  · written by those the closure cost, angry and plain
//   krail       · the truth behind the Severance: the 94% (Wall: Krail reserves)
//   civilian    · one person, to anyone who might hear
//   warden      · the old gate infrastructure, still running its protocol
//   rare        · found now and then; each has its own look
//
// Row options (all optional):
//   w       weight among its category (default 1)
//   relays  Warden relays she has woken before it can show (default 0)
//   needs   a flag she must hold: `clue_reserves` is the Krail record
//   legs    only on these legs of the road, [first, last] (0 = the Reach)
//   gate    warden lines: `dark` while the gate's own relay sleeps, `lit` once she has woken it
//   look    which category's look a rare line wears (default: its own)
//   then    a rare line that follows it on the same panel, if its terms hold
//   id      a name to point at it with (default: made from the words)

export type SignCat = 'official' | 'defaced' | 'resistance' | 'krail' | 'civilian' | 'warden' | 'rare';
export type SignLook = Exclude<SignCat, 'rare' | 'krail'> | 'krail';

export interface SignRow {
  w?: number; relays?: number; needs?: string; legs?: [number, number]; gate?: 'dark' | 'lit'; look?: SignCat; then?: string; id?: string;
}
export interface SignDef extends SignRow {
  id: string; cat: SignCat; text: string; look: SignCat;
}

const slug = (s: string) => s.toLowerCase().replace(/\[[^|\]]*\|/g, '').replace(/[^a-z0-9]+/g, '_').slice(0, 28).replace(/^_|_$/g, '');

export const SIGNS: SignDef[] = [];
function add(cat: SignCat, lines: readonly string[], row: SignRow = {}, per: Record<number, SignRow> = {}): void {
  lines.forEach((text, i) => {
    const r = { ...row, ...per[i] };
    SIGNS.push({ ...r, id: r.id ?? `${cat}_${slug(text)}`, cat, text, look: r.look ?? cat });
  });
}

// A. Official Continuance broadcasts
add('official', [
  'The Severance keeps you safe',
  'The lanes are closed. The systems are secure.',
  'Order through separation.',
  'The Continuance protects what remains.',
  'Unauthorised transit endangers everyone.',
  'Stability is the price of survival.',
  'Trust the closure. Trust the Continuance.',
  'The old lanes brought only chaos.',
  'Your safety is our highest priority.',
  'Separation today. Security tomorrow.',
]);
// the billboard of each leg, as it always stood by its gate (sim/scars.ts)
SLOGANS.forEach((line, leg) => { if (leg > 0) add('official', [line], { w: 4, legs: [leg, leg] }); });

// B. Defaced government broadcasts: the official line, altered
add('defaced', [
  'The Severance keeps you [safe|prisoners]',
  'The lanes are closed. [The systems are secure.|We are left to die.]',
  '[Order|Tyranny] through separation.',
  'The Continuance [protects|abandoned] what remains.',
  '[Stability is the price of survival.|How many must die for your stability?]',
  '[Trust the closure. Trust the Continuance.|Trust was the first thing they stole.]',
  'The old lanes brought [only chaos|us together].',
  'Your [safety|silence] is our highest priority.',
]);

// C. Angry resistance broadcasts
add('resistance', [
  'You closed the gates. You left us to die.',
  'Seventy years. How many more must suffer?',
  'The Continuance is not your saviour.',
  'They have walls. We have nothing.',
  'We did not consent to the Severance.',
  'You cannot govern people you have abandoned.',
  'The gates belong to everyone.',
  'They took our future and called it peace.',
  'No one elected you to seal our fate.',
  'We remember who closed the gates.',
  'The Continuance feeds while we starve.',
  'Your order is built on our suffering.',
  'We were not sacrificed. We were betrayed.',
  'They closed the lanes. They opened the graves.',
  'You cannot bury the truth forever.',
], {}, { 10: { relays: 1 }, 11: { relays: 1 }, 13: { relays: 2 }, 14: { relays: 2 } });
// what the Scatter writes over each leg's billboard once Ada's key has spoken (sim/scars.ts)
OVERS.forEach((line, i) => { if (i > 0 && !SIGNS.some((s) => s.text === line)) add('resistance', [line], { needs: 'relay_broadcast', w: 3, legs: [i, i === 6 ? 7 : i] }); });

// D. Krail, and the hidden truth. Each one waits for its place in the proof: the record first, the rest as relays wake
add('krail', [
  '94% remained. They knew.',
  'There was no shortage. There was a decision.',
  'They had the Krail. They closed the gates anyway.',
  'How many systems died for a lie?',
  'Who ordered the Severance?',
  'Find the reserves. Find the truth.',
  'The gates were not broken. They were silenced.',
  'They didn’t run out of Krail. They ran out of excuses.',
  'Ask the Wardens what really happened.',
  'The records still exist. They can’t hide them all.',
], { needs: 'clue_reserves' }, {
  1: { relays: 2 }, 2: { relays: 3 }, 3: { relays: 4 }, 6: { relays: 5 }, 7: { relays: 6, w: 2 }, 8: { relays: 3 }, 9: { relays: 4 },
  // two questions anyone could scrawl, before she has seen a single record
  4: { needs: undefined, w: 0.5 }, 5: { needs: undefined, w: 0.5 },
});

// E. Civilian transmissions
add('civilian', [
  'My son was born after the closure. He has never seen my face.',
  'We waited for help. No one came.',
  'Three generations. Still no way home.',
  'My family is on the other side.',
  'We sent 42 distress calls. None were answered.',
  'They promised the closure was temporary.',
  'How do you explain a closed universe to a child?',
  'We are still here. Why did you forget us?',
  'Last transmission from Halden. Please, anyone.',
  'We used to be neighbours. Now we are strangers.',
], {}, { 8: { legs: [0, 1] } });

// F. Automated Warden messages: a gate still running its first protocol
add('warden', [
  'Warden authority required.',
  'Relay network offline.',
  'Transit permission denied.',
  'Network closure protocol active.',
  'No valid Warden response.',
  'Last authorized transit: 70 years ago.',
  'Emergency channel available. No response received.',
  'Gate status: sealed.',
  'Network handshake failed.',
  'Waiting for Warden authorization.',
], {}, {
  // true only while this gate's own relay sleeps
  1: { gate: 'dark' }, 2: { gate: 'dark' }, 4: { gate: 'dark' }, 7: { gate: 'dark' }, 8: { gate: 'dark' }, 9: { gate: 'dark' },
});
add('warden', ['Warden key accepted. Relay online.', 'Relay online. Awaiting network.'], { gate: 'lit' });

// G. Rare transmissions: found, not met. A removed message may come back, much later
add('rare', [
  'We used to be able to go home.',
  'The Wardens did not abandon you.',
  'Somebody still has the keys.',
  'They can close a gate. They cannot erase a memory.',
  'Please respond. My daughter is on the other side.',
  'This message has been flagged for removal.',
  'Message removed by order of the Continuance.',
  'Message restored. We are still here.',
], { w: 1 }, {
  0: { look: 'civilian' },
  1: { look: 'resistance', relays: 3 },
  2: { look: 'resistance', relays: 2 },
  3: { look: 'resistance' },
  4: { look: 'civilian' },
  5: { id: 'flagged', look: 'official', then: 'removed' },
  6: { id: 'removed', look: 'official', w: 0, then: 'restored' },
  7: { id: 'restored', look: 'resistance', w: 0, relays: 5 },
});
