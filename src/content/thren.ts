import type { CardDef } from '../sim/comms';

// ── the Thren, rising ─────────────────────────────────────────────────────
// Mining draws them (docs/STORY_DIRECTION.md §3). Stillwater is the Drift's
// swarm emergency: a knot comes for a Holdfast rig's Cyrite, and the answer
// is whose Cyrite feeds it, or a fight that keeps everything if it holds.

export const THREN_CARDS: CardDef[] = [
  {
    id: 'thren_still', kind: 'plea', caller: 'miners', trigger: 'story', gist: 'A Thren knot comes for Stillwater',
    from: 'Hester Vane · Stillwater', title: 'A knot on the rig',
    text: '“A knot’s coming in on the rig. Ten years we’ve reported them, and the Survey never came. They want the Cyrite. Mine, or yours.”',
    cargo: 'Stillwater rig · forty crew',
    choices: [
      { id: 'vent', label: 'Vent your Cyrite', tone: 'help', hint: 'Ten Cyrite into the dark. The knot feeds and drifts off. The rig keeps its year.',
        cost: { cyrite: 10 }, win: { text: 'The knot turns for your Cyrite · the rig holds', flag: 'still_vented', calm: 120, standing: { miners: 1 } } },
      { id: 'rig', label: 'Vent the rig’s hold', tone: 'trade', hint: 'The knot feeds. Kellern docks a year’s pay from forty contracts.',
        win: { text: 'The rig’s hold vents · a year’s pay into the dark', flag: 'still_rig_vented', calm: 120, standing: { miners: -1 } } },
      { id: 'fight', label: 'Fight them off', tone: 'fight', hint: 'Six motes and a web layer. The rig keeps everything, if you hold.',
        win: { text: 'The knot comes on', flag: 'still_fought', spawn: [{ variant: 'weaver', n: 1, from: 'ahead' }, { variant: 'mote', n: 6, from: 'ahead' }] } },
    ],
  },
];
