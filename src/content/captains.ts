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
    id: 'vance', name: 'Isla Vance', rank: 'Captain', ship: 'CCV Reprimand', faction: 'custody', personality: 'duelist',
    face: { skin: '#c99a7a', hair: 'crop', hairColour: '#d8d2c4', eye: 'none', mark: 'none', jaw: 'square' },
    lines: {
      hail: '“Wayward, Captain Vance of the Reprimand. I don’t shoot people in the back. Turn around, or come settle it.”',
      ambush: '“No speeches this time, Wayward.” The Reprimand lights up out of the rock.',
      bargain: '',
      leave: 'Vance holds off the lane, logs your heading, and lets you go.',
      back: {
        won: '“Last time cost you a ship. You’re back anyway. I respect that, a little.”',
        scarred: '“You burned my ship. I walked home through vacuum. Let’s finish it.”',
        escaped: '“I broke off last time because my wing couldn’t hold. It can now.”',
        evaded: '“You ran last time. I’ve charted every rock you could hide in.”',
        bargained: '“You paid someone else to let you go. Not me.”',
        left: '“I let you pass once. I was wrong to.”',
      },
    },
  },
  {
    id: 'sorensen', name: 'Hale Sorensen', rank: 'Commander', ship: 'CCV Due Process', faction: 'custody', personality: 'zealot',
    face: { skin: '#e2c2a6', hair: 'shaved', hairColour: '#3b3330', eye: 'implant', mark: 'brand', jaw: 'narrow' },
    lines: {
      hail: '“By the Ordinance of Return, that ship is property. So are you. Nothing to discuss.”',
      ambush: 'A Continuance anthem on every band. The Due Process comes out of the rock.',
      bargain: '',
      leave: 'Sorensen breaks off. The Ordinance will wait.',
      back: {
        won: '“The Ordinance caught you once. You crawled away. It’ll catch you again.”',
        scarred: '“My crew died in your fire. Their names are on my hull now. Read them.”',
        escaped: '“I withdrew to rearm. That is all it was.”',
        evaded: '“Flight is a confession. You have confessed twice.”',
        bargained: '“You bought off lesser officers. The Ordinance has no price.”',
        left: '“I was ordered off last time. Nobody is ordering me now.”',
      },
    },
  },
  {
    id: 'kade', name: 'Brennan Kade', rank: 'Captain', ship: 'Ironmaw', faction: 'gutter', personality: 'broker',
    face: { skin: '#8d5a3c', hair: 'long', hairColour: '#2a2220', eye: 'patch', mark: 'tattoo', jaw: 'square' },
    lines: {
      hail: '“Hauler! Kade, of the Ironmaw. You’ve been killing Gutter crews. Bad for business. Mine, mostly.”',
      ambush: '“Surprise, hauler.” The Ironmaw grinds out of the rock with its maw open.',
      bargain: '“Or keep it civil: {fee} Cyrite and the Ironmaw eats elsewhere.”',
      leave: 'Kade looks at your guns, laughs, and takes the Ironmaw elsewhere.',
      back: {
        won: '“Look who’s flying again. I sold your wreck’s plating twice.”',
        scarred: '“New Ironmaw. Same teeth. And I am not selling anything today.”',
        escaped: '“Last time was business going badly. This time I brought partners.”',
        evaded: '“You slipped me in the rock once. I paid a miner to map it.”',
        bargained: '“My favourite customer! Prices have gone up, I am afraid.”',
        left: '“I walked away once, and the crews laughed for a week. Not again.”',
      },
    },
  },
  {
    id: 'vex', name: 'Sister Vera Hask', rank: 'Captain', ship: 'Last Mercy', faction: 'gutter', personality: 'ambusher',
    face: { skin: '#b07f62', hair: 'hood', hairColour: '#1c1a1a', eye: 'visor', mark: 'circuit', jaw: 'narrow' },
    lines: {
      hail: 'A soft voice on an open band: “Sister Vera Hask, of the Last Mercy. I will be quick.”',
      ambush: '“Peace be with you.” The Last Mercy decloaks behind you, guns warm.',
      bargain: '',
      leave: 'The Last Mercy slides back into the dark.',
      back: {
        won: '“I prayed for you last time. I’ll pray for you again.”',
        scarred: '“You gave me these scars. I kept every one.”',
        escaped: '“I left you last time to bring my sisters. Here they are.”',
        evaded: '“You know how to run from me. I know which way you run.”',
        bargained: '“You paid me once. Mercy is not for sale twice.”',
        left: '“I let you go once. The Mercy does not forgive me for it.”',
      },
    },
  },
  {
    id: 'ashgrove', name: 'Ashgrove', rank: 'Inspector', ship: 'Kind Regard', faction: 'office', personality: 'cautious',
    face: { skin: '#f0d6c0', hair: 'swept', hairColour: '#8a7e72', eye: 'none', mark: 'none', jaw: 'narrow' },
    lines: {
      hail: '“Good afternoon. Ashgrove, Offices of Peace, aboard the Kind Regard. Let’s avoid a messy hour.”',
      ambush: '“Forgive the theatrics.” The Kind Regard is suddenly very close.',
      bargain: '“A consultancy fee of {fee} Cyrite would close the file. Purely administrative.”',
      leave: 'Ashgrove closes the channel politely. The Kind Regard is gone.',
      back: {
        won: '“We have met. You were unconscious for most of it.”',
        scarred: '“I have been reassigned to you personally. I asked to be.”',
        escaped: '“I withdrew to reconsider. I have reconsidered.”',
        evaded: '“You took a route I didn’t expect. I expect it now.”',
        bargained: '“The file has reopened, I’m afraid. The fee has been revised.”',
        left: '“I declined to engage last time. My superiors have asked me why.”',
      },
    },
  },
  {
    id: 'pell', name: 'Quiet Pell', rank: 'Inspector', ship: 'Silent Witness', faction: 'office', personality: 'ambusher',
    face: { skin: '#a6866e', hair: 'shaved', hairColour: '#2e2a28', eye: 'implant', mark: 'tattoo', jaw: 'square' },
    lines: {
      hail: 'An Office cipher on the band, and a single word: “Pell.”',
      ambush: 'No hail. The Silent Witness is just there behind you, its wing spreading out.',
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
    id: 'chorus', name: 'The Nine', rank: 'Foundry', ship: 'Foundry Nine', faction: 'voice', personality: 'zealot',
    face: { skin: '#9aa3ab', hair: 'hood', hairColour: '#2b3036', eye: 'visor', mark: 'circuit', jaw: 'square' },
    lines: {
      hail: 'Nine voices, half a beat apart: “Hauler. You are made of parts we want.”',
      ambush: 'The rock around you opens, and it is not rock. Foundry Nine has been waiting.',
      bargain: '',
      leave: 'The Nine falls silent and Foundry Nine grinds away.',
      back: {
        won: '“We kept a piece of your hull. We have learned its shape.”',
        scarred: '“You cut away three of us. We have grown four.”',
        escaped: '“We withdrew to grow. We have grown.”',
        evaded: '“We have mapped the way you run. All nine of us.”',
        bargained: '“Payment was noted. The Nine does not take it again.”',
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
