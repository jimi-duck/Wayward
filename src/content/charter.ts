import type { CardDef } from '../sim/comms';
import { CHARTER_FORGED } from '../sim/charter';

// ── the Charter's cards ───────────────────────────────────────────────────
// The forged Charter (docs/STORY_DIRECTION.md §2): Val sells one at Kiln. It is
// comfort, not a lockout either way: Kellern fluid at the posted price and a
// day off the hunt, until a Custody patrol's check strips it (sim/traffic.ts).

export const CHARTER_CARDS: CardDef[] = [
  {
    id: 'charter_offer', kind: 'trade', caller: 'gutter', trigger: 'story', gist: 'Val sells a forged Charter',
    from: 'Val · a broker of the Gutter', title: 'A dead woman’s Charter',
    text: '“A Charter. Real seal, a dead woman’s name. Kellern pumps at the posted price, and gates that wave you through. Patrols look closer than gates do.”',
    cargo: 'A broker’s yacht · very clean guns',
    choices: [
      { id: 'buy', label: 'Buy the Charter', tone: 'trade', hint: 'Posted fuel prices, a day off the hunt. A patrol’s check takes it.', cost: { chits: 150 },
        win: { text: 'Chartered, on paper · the broadcasts start talking to you', flag: CHARTER_FORGED, hunt: 1, standing: { gutter: 1 } } },
      { id: 'no', label: 'Stay Bonded', tone: 'refuse', hint: 'Keep your Cyrite, and your own name.', win: { text: '“Suit yourself. The queue is that way.”' } },
    ],
  },
];
