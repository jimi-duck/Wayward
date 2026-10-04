import type { CaptainDef, Personality, PersonalityDef } from '../sim/captains';

// ── named captains ────────────────────────────────────────────────────────
// The people in command of the capital ships, once a faction has noticed
// the Wayward enough to send someone by name (sim/captains.ts has the
// rules). Each is a name, a face, a ship of their faction's class, a
// personality, and what they say: the first time, out of an ambush, when
// they will deal, when they turn away, and when they come back after each
// way the last meeting could have gone. Which faction names which captains,
// and in what order, is in content/factions.ts.
//
// Personalities set how they come and what they will do; memory changes it
// (a scarred captain ambushes and never deals, whatever they were before).

export const PERSONALITIES: Record<Personality, PersonalityDef> = {
  duelist:  { word: 'Duelist · announces, fights fair',        approach: 'announce', fee: null, nerve: Infinity, hp: 1,    survive: 0.55, run: 0.55 },
  zealot:   { word: 'Zealot · never deals, never turns away',  approach: 'announce', fee: null, nerve: Infinity, hp: 1.2,  survive: 0.35, run: 0.45 },
  broker:   { word: 'Broker · would rather be paid',           approach: 'announce', fee: 45,   nerve: 1.4,      hp: 0.9,  survive: 0.7,  run: 0.6 },
  ambusher: { word: 'Ambusher · comes out of the rock',        approach: 'ambush',   fee: null, nerve: Infinity, hp: 0.95, survive: 0.65, run: 0.4 },
  cautious: { word: 'Cautious · weighs every fight',           approach: 'announce', fee: 35,   nerve: 1.0,      hp: 0.85, survive: 0.8,  run: 0.65 },
};

export const CAPTAINS: CaptainDef[] = [
  {
    id: 'vance', name: 'Oriel Vance', rank: 'Captain', ship: 'CCV Reprimand', faction: 'custody', personality: 'duelist',
    face: { skin: '#c99a7a', hair: 'crop', hairColour: '#d8d2c4', eye: 'none', mark: 'none', jaw: 'square' },
    lines: {
      hail: '“Wayward. This is Captain Vance of the Reprimand. I do not shoot haulers in the back, so I am telling you now: turn about, or come and settle it.”',
      ambush: '“No speeches this time, Wayward.” The Reprimand lights up out of the rock.',
      bargain: '',
      leave: 'Vance holds off the lane, logs your heading, and lets you go.',
      back: {
        won: '“The last time cost you a hull. You flew it again anyway. I respect that, a little.”',
        scarred: '“You burned my ship out from under me. I walked home through vacuum. Let us finish it.”',
        escaped: '“I broke off last time because my wing could not hold. It can now.”',
        evaded: '“You ran last time. I have charted every rock you could run into.”',
        bargained: '“You paid someone else to let you go. Not me.”',
        left: '“I let you pass once. I was wrong to.”',
      },
    },
  },
  {
    id: 'sorensen', name: 'Hale Sorensen', rank: 'Commander', ship: 'CCV Due Process', faction: 'custody', personality: 'zealot',
    face: { skin: '#e2c2a6', hair: 'shaved', hairColour: '#3b3330', eye: 'implant', mark: 'brand', jaw: 'narrow' },
    lines: {
      hail: '“By the Continuance, under the Ordinance of Return: the hull you fly is property, and so are you. There is nothing to discuss.”',
      ambush: 'A Continuance anthem on every band, and the Due Process comes about out of the rock.',
      bargain: '',
      leave: 'Sorensen breaks off. The Ordinance will wait.',
      back: {
        won: '“The Ordinance was served once. You crawled away from it. It will be served again.”',
        scarred: '“My crew died in your fire. Their names are on my hull now. Read them.”',
        escaped: '“I withdrew to rearm. That is all it was.”',
        evaded: '“Flight is a confession. You have confessed twice.”',
        bargained: '“You bought your way past lesser officers. There is no price on the Ordinance.”',
        left: '“I was ordered off last time. Nobody is ordering me now.”',
      },
    },
  },
  {
    id: 'kade', name: 'Brannoch Kade', rank: 'Captain', ship: 'Ironmaw', faction: 'gutter', personality: 'broker',
    face: { skin: '#8d5a3c', hair: 'long', hairColour: '#2a2220', eye: 'patch', mark: 'tattoo', jaw: 'square' },
    lines: {
      hail: '“Hauler! Kade, of the Ironmaw. You have been killing Gutter crews, and that is bad for business. Mine, mostly.”',
      ambush: '“Surprise, hauler.” The Ironmaw grinds out of the rock with its maw open.',
      bargain: '“Or we keep it civil: {fee} chits, and the Ironmaw finds something else to eat.”',
      leave: 'Kade looks at your guns, laughs, and takes the Ironmaw elsewhere.',
      back: {
        won: '“Look who is flying again. I sold your wreck’s plating twice, you know.”',
        scarred: '“New Ironmaw. Same teeth. And I am not selling anything today.”',
        escaped: '“Last time was business going badly. This time I brought partners.”',
        evaded: '“You slipped me in the rock once. I paid a miner to map it.”',
        bargained: '“My favourite customer! Prices have gone up, I am afraid.”',
        left: '“I walked away once, and the crews laughed for a week. Not again.”',
      },
    },
  },
  {
    id: 'vex', name: 'Sister Vex', rank: 'Captain', ship: 'Last Mercy', faction: 'gutter', personality: 'ambusher',
    face: { skin: '#b07f62', hair: 'hood', hairColour: '#1c1a1a', eye: 'visor', mark: 'circuit', jaw: 'narrow' },
    lines: {
      hail: 'A soft voice on an open band: “Sister Vex, of the Last Mercy. I will be quick.”',
      ambush: '“Peace be with you, hauler.” The Last Mercy decloaks in your shadow, guns already warm.',
      bargain: '',
      leave: 'The Last Mercy slides back into the dark.',
      back: {
        won: '“I prayed for your crew last time. I will pray for them again.”',
        scarred: '“You gave me these scars. I kept every one.”',
        escaped: '“I left you last time to bring my sisters. Here they are.”',
        evaded: '“You know how to run from me now. I know which way you run.”',
        bargained: '“You paid me once. Mercy is not for sale twice.”',
        left: '“I let you go once. The Mercy does not forgive me for it.”',
      },
    },
  },
  {
    id: 'ashgrove', name: 'Mr Ashgrove', rank: 'Inquisitor', ship: 'Kind Regard', faction: 'office', personality: 'cautious',
    face: { skin: '#f0d6c0', hair: 'swept', hairColour: '#8a7e72', eye: 'none', mark: 'none', jaw: 'narrow' },
    lines: {
      hail: '“Good afternoon. Ashgrove, Office of Peace, aboard the Kind Regard. I think we can both avoid a very messy hour.”',
      ambush: '“Forgive the theatrics.” The Kind Regard is suddenly very close.',
      bargain: '“A consultancy fee of {fee} chits would close the file. Purely administrative.”',
      leave: 'Ashgrove closes the channel with a polite word. The Kind Regard is gone from the scope.',
      back: {
        won: '“We have met. You were unconscious for most of it.”',
        scarred: '“I have been reassigned to you personally. I asked to be.”',
        escaped: '“I withdrew to reconsider. I have reconsidered.”',
        evaded: '“You took a route I did not anticipate. I have anticipated it now.”',
        bargained: '“The file has reopened, I am afraid. These things do. The fee has been revised.”',
        left: '“I declined to engage last time. My superiors have asked me why.”',
      },
    },
  },
  {
    id: 'pell', name: 'Quiet Pell', rank: 'Inquisitor', ship: 'Silent Witness', faction: 'office', personality: 'ambusher',
    face: { skin: '#a6866e', hair: 'shaved', hairColour: '#2e2a28', eye: 'implant', mark: 'tattoo', jaw: 'square' },
    lines: {
      hail: 'An Office cipher on the band, and a single word: “Pell.”',
      ambush: 'No hail. The Silent Witness is just there, in your wake, and its wing is spreading out.',
      bargain: '',
      leave: 'The Silent Witness was never there.',
      back: {
        won: 'The Silent Witness sends one file: the footage of your last wreck.',
        scarred: 'The cipher again, and a second word: “Owed.”',
        escaped: 'The Silent Witness, and twice the wing.',
        evaded: 'Pell has been waiting in exactly the rock you used last time.',
        bargained: '“Pell does not bargain.”',
        left: 'The Silent Witness does not withdraw twice.',
      },
    },
  },
  {
    id: 'chorus', name: 'The Chorus of Nine', rank: 'Foundry', ship: 'Foundry Nine', faction: 'voice', personality: 'zealot',
    face: { skin: '#9aa3ab', hair: 'hood', hairColour: '#2b3036', eye: 'visor', mark: 'circuit', jaw: 'square' },
    lines: {
      hail: 'Nine voices on one band, a half-beat apart: “Hauler. You are made of parts we want.”',
      ambush: 'The rock around you opens, and it is not rock. Foundry Nine has been waiting.',
      bargain: '',
      leave: 'The Chorus falls silent and Foundry Nine grinds away.',
      back: {
        won: '“We kept a piece of your hull. We have learned its shape.”',
        scarred: '“You cut away three of us. We have grown four.”',
        escaped: '“We withdrew to grow. We have grown.”',
        evaded: '“We have mapped the way you run. All nine of us.”',
        bargained: '“Payment was noted. The Chorus does not take it again.”',
        left: '“We let you pass once. The nine have voted otherwise.”',
      },
    },
  },
  {
    id: 'loom', name: 'The Loom', rank: 'Thren', ship: 'Thren Hollow', faction: 'thren', personality: 'ambusher',
    face: { skin: '#7d6a8c', hair: 'hood', hairColour: '#3a2d44', eye: 'implant', mark: 'tattoo', jaw: 'narrow' },
    lines: {
      hail: 'A pattern on every band, too slow to be speech.',
      ambush: 'Web across your bow, and the Thren Hollow unfolding out of it.',
      bargain: '',
      leave: 'The web thins and the Hollow is gone.',
      back: {
        won: 'The pattern again, with your hull number woven into it.',
        scarred: 'The pattern is ragged where you tore it, and it is louder.',
        escaped: 'Twice the web, and the Hollow at its centre.',
        evaded: 'The web is already across the way you ran last time.',
        bargained: 'The Loom does not take payment twice.',
        left: 'The Hollow does not unweave twice.',
      },
    },
  },
];
