import { CARDS } from './cards';
import { COPY } from './copy';
import { ECONOMY } from './economy';
import { MISSIONS } from './missions';
import { SCENES } from './scenes';
import { SPACE } from './space';
import { STORY } from './story';
import { UI } from './ui';
import { WORLD } from './world';

// ── German ────────────────────────────────────────────────────────────────
// English on the left, German on the right. Short and informal (du), like the
// English: say what to do, cut the rest. Split by where the text lives:
//   ui     · the HUD, the panels, the start card (src/ui, index.html, main.ts)
//   world  · the sim's lines, ship systems, upgrades, modules, places, regions
//   cards  · comms cards (content/cards.ts)
//   story  · captains, Calloway, the endings, unlocks
//   space  · the shared world's features and expanses (content/features.ts)
//   scenes · situations: their calls, goals and the Archive's sightings (content/situations.ts)

export const DE: Record<string, string> = { ...UI, ...WORLD, ...SPACE, ...CARDS, ...STORY, ...SCENES, ...ECONOMY, ...MISSIONS, ...COPY };

/** Names, the same in German: the ship, the people, the factions, the places. */
export const KEEP = new Set<string>([
  'Wayward', 'OB-7731-A', 'Drifter', 'Ironmaw', '1.0 km',
  // captains and their ships
  'Oriel Vance', 'Hale Sorensen', 'Brannoch Kade', 'Mr Ashgrove', 'Quiet Pell', 'CCV Reprimand', 'CCV Due Process', 'Last Mercy',
  'Kind Regard', 'Silent Witness', 'Foundry Nine', 'Thren Hollow',
  // capital ships
  'Red Tithe', 'Butcher’s Due', 'CCV Diligence', 'CCV Vigilance', 'CCV Patience', 'CCV Temperance', 'Quiet Hand', 'Gentle Inquiry',
  // systems and ports
  'Halden’s Reach', 'Tollmere', 'Vesk', 'Ashgrove', 'Corrin Deep', 'Marrow', 'Sallow', 'Pell', 'Ninefold', 'Dunmore', 'Kettle', 'Brask',
  'Oriel', 'Wick', 'Lantern', 'Hask', 'Sable Run', 'Greyhollow', 'Imbrie', 'Coldwater', 'Tamsin’s Rest', 'Orrin', 'Fallow', 'Quarry Nine',
  'Cerro', 'Kellern Fuel Dock', 'Kellern Claim Office', 'Frontier Supply Depot', 'Dust Traders Exchange', 'Guild Hall', 'The Bent Nail',
  'Salvage Barge', 'Holdfast Stores', 'The Claim Hall', 'Free Dock', 'Claim Shack', 'Kellern Mining',
  'Foundry Seven', 'Mother Lathe', 'Foundry Thirty', 'The Hesse Choir', 'Thren Lattice', 'Thren Bloom', 'Thren Knot',
]);
