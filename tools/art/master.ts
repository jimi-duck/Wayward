import { SLOTS, type SlotId } from '../../src/content/art';
import { AVOID_ALL, player, portraitSpec, type Brief } from './briefs';
import { FACTION_LOOK } from './looks';

// The one file to give an image generator: who the game is, how it looks, how to
// deliver, and every picture with its own prompt. Written by art-brief.pilot.ts.

const TITLES: Record<SlotId, string> = {
  captain: 'Captains and Calloway', contact: 'Named contacts', emblem: 'Emblems', ship: 'Ship profiles', place: 'Port banners',
  ending: 'Endings', sighting: 'Sightings', file: 'Pieces of the file', region: 'Regions',
};
const BATCHES: Array<{ id: string; slot: SlotId; optional?: boolean; note: string }> = [
  { id: 'A', slot: 'emblem', note: 'Smallest and quickest to judge. Do these first after the style sheet.' },
  { id: 'B', slot: 'captain', note: 'Nine people (and machines). The most important faces in the game.' },
  { id: 'C', slot: 'contact', note: 'Eighteen named people. Same lighting and framing as the captains.' },
  { id: 'D', slot: 'ship', note: 'Fifteen hulls, one set. Read them as silhouettes first.' },
  { id: 'E', slot: 'place', note: 'Seven port banners, very wide.' },
  { id: 'F', slot: 'ending', note: 'Six endings, cinematic.' },
  { id: 'G', slot: 'sighting', note: 'Twenty found photographs.' },
  { id: 'H', slot: 'file', note: 'Eight artefacts.' },
  { id: 'I', slot: 'region', note: 'Eight region banners.' },
  { id: 'J', slot: 'captain', optional: true, note: 'Optional: the same captains, scarred. Only after batch B is approved, using those portraits as the reference.' },
];

export function masterBrief(list: Brief[]): string {
  const n = (slot: SlotId, optional = false) => list.filter((b) => b.slot === slot && !!b.optional === optional).length;
  const md: string[] = [];
  const P = (...l: string[]) => md.push(...l, '');

  P('# WAYWARD: artwork brief', '*Generated from the game by `npm run art:brief`. Give this whole file to the image generator, with the two reference pictures attached.*');

  P('> **For Jimi: how to use this**',
    '> 1. Open a new ChatGPT chat. Attach `docs/art/reference/wayward-title-art.jpg` and `wayward-menu-art.jpg` (the title screen art) and attach this file (it is long, so attach rather than paste).',
    '> 2. Write: *"Do the whole brief in one run and give me one file at the end."* It is told below to make all ' + list.length + ' pictures in order without stopping to ask, then to hand back **one PDF**, one page per picture, each page captioned with the picture\'s file name.',
    '> 3. If it stops part-way (long runs often do), just say **"continue"**; it keeps going from where it stopped and still ends with the one file.',
    '> 4. Give me the file (drop it in the project, or a folder on your computer). `npm run art:prep -- <folder>` cuts out each picture by its caption, crops and sizes it, and puts it into the game.',
    '> 5. Fallback if it cannot make one PDF: one ZIP of the pictures, each named with its file name (for example `captains__vance.png`). That works too.');

  P('## 1. Your job',
    'You are making the artwork for **WAYWARD**, a 3D space-survival roguelite for desktop and phone browsers. The pictures appear in the game where the player pauses: when someone calls them on the comms channel (portraits, a faction emblem, the hull of the ship calling), when they dock at a port (a banner), at the ending, and in the Archive (found photographs and objects). There are **' + list.filter((b) => !b.optional).length + ' pictures** (plus ' + list.filter((b) => b.optional).length + ' optional), listed in section 8, each with its own prompt.',
    'Do the whole list in one run (section 6). Make every picture in the same look, as one set, matching the attached reference. Do not put any text, lettering or numbers in a picture. The game draws all words itself.');

  P('## 2. The game in brief',
    '**You play Juno**, a miner who stole the wrong ship: the *Wayward*, an Obedience-class ore hauler, carrying a file (the **Severance**) that could expose seventy years of lies. The ruling power, **the Continuance**, once switched off the jump lanes and has run the story ever since. You flee out through the **Scatter**, a broken frontier, choosing what to spend, who to trust and what to risk. Combat is possible but rarely the point.',
    '**The hunter** is **Prefect Idris Calloway** of the Continuance\'s Office of Peace. She follows Juno across the chart, learns how Juno flies, and sends messages that are sometimes threats and sometimes almost reasonable. She believes she is holding civilisation together.',
    '**The people of the Scatter:** *Holdfasts* (settlements built from whatever survived, each its own small nation), *Drifts* (nomadic fleets that never stop), *the Gutter* (pirates and scavengers beyond law), the *Dust Traders Guild* (merchants), *Kellern Mining* (a heavy-industry company), *Frontier* independents.',
    '**Stranger things:** *the Voice* (old fabrication systems that began making their own decisions; it speaks through terminals and relays, never in person) and *the Thren* (nobody knows what they are; they gather where Cyrite moves; the right reaction is "what am I looking at?").',
    '**The journey** crosses eight regions: the Reach, the Marches, the Salvage Belt, the Drift Deep, the Breaker Yards, the Free Ports, the Hollows, the Last Lanes, and ends at **the Threshold**, where the player decides what the file is worth (six endings: Broadcast, Unite, Sell, Trade, Seal, Vanish).',
    'Tone: **industrial, oppressive, scrappy, mysterious, human, dangerous.** Everything has a previous owner, a serial number and a warning label. The world is exhausted, not shiny.');

  P('## 3. The look',
    '**Match the attached title art.** It is the north star. What to take from it:',
    '- **Cinematic, richly detailed, painterly-realistic** digital concept art; deep blue-black space; volumetric haze; a clear key light with a soft rim.',
    '- **The Wayward** is a long, low, aerodynamic ore hauler in worn yellow-orange, layered hull plating, **split side engine pods with a small blue engine glow**; stencilled WAYWARD and a number on the hull. It reads as a freight machine first, a ship second, a warship last.',
    '- **Human structures** are tall, black, industrial spires and gantries with warm **orange window lights** and small teal accents; scale shown by tiny ships.',
    '- **Rock** is dark and crusted, with glowing orange **lava-vein** cracks.',
    '- **Colour** is mostly dark and muted; one warm anchor (the Wayward\'s yellow-orange); purple nebula only deep in the background.',
    '',
    '**Tempered for a game panel:** the pictures sit inside dark interface panels, so keep the darks dark and the edges calm; no bright backgrounds, no busy corners.',
    '',
    '**Rules, from the game\'s brand guide:**',
    '- Technology must look **used**: scratches, faded paint, replacement panels, exposed fasteners, cable runs, warning stickers, serial numbers, inspection marks, mismatched parts. Never factory-fresh, never sleek luxury.',
    '- **Teal means information** (screens, readouts). **Red means threat and nothing else.** A dull gold means caution only. **No neon pink or purple city lights.** Keep glow small and restrained.',
    '- Not generic neon cyberpunk, not military sci-fi, not horror: there is also work, commerce and ordinary survival.',
    '- Ship markings can be implied as painted shapes but must not carry readable words other than the hull name WAYWARD and the class mark OBEDIENCE CLASS / 0B-7731-A on the Wayward itself.',
    '',
    '**Global avoid list** (add to every picture): ' + AVOID_ALL + '.');

  P('## 4. How each faction looks');
  md.push('| Who | Look |', '|---|---|');
  for (const [k, v] of Object.entries(FACTION_LOOK)) md.push(`| ${k} | ${v.replace(/\|/g, '/')} |`);
  md.push('');

  P('## 5. Technical rules',
    '| Kind | Final size in the game | Aspect to make | Notes |', '|---|---|---|---|',
    ...(Object.values(SLOTS).map((s) => `| ${TITLES[s.id]} | ${s.w}×${s.h} | ${s.id === 'emblem' ? '1:1' : s.id === 'ship' ? '2:1' : s.id === 'place' ? 'widest you can; subject in the middle third of the height' : s.id === 'captain' || s.id === 'contact' ? '4:5 (or 2:3, with the head and shoulders kept compact and central)' : s.id === 'region' ? 'widest you can; subject in the middle band' : '16:9 or 4:3'} | ${s.alpha ? 'on pure black, see the prompt' : 'full picture'} |`)),
    '',
    '- **If your tool cannot make an exact ratio,** make the nearest one and keep everything important in the **central area**. The game crops from the middle.',
    '- **Make them larger than needed** if you can; they are shrunk. At least the sizes above.',
    '- **Small-size test.** Portraits must still read as a face when shown **48 pixels wide**; ships at **120 px**; emblems at **24 px**. Bold shapes, clear silhouette first, detail second.',
    '- **Emblems and ships are on a pure black background** (#000000), nothing else in the frame; the game removes the black. Emblems are a flat **white** shape.',
    '- **No text in any picture.** Illegible scribble or redacted bars are fine where a document is shown.',
    '- **No borders, frames, captions or logos** inside a picture.',
    '',
    '**Portraits (captains and contacts), one rule for all:** ' + portraitSpec + ' ' + player,
    '',
    '**Ships:** one hull, three-quarter side view from slightly above, nose pointing right, whole hull in frame with room around it, pure black background, one side light with a rim light; no planet, stars, other ships or visible pilot.');

  P('## 6. Delivery: everything in one run, one file at the end',
    '**Make all ' + list.length + ' pictures in one run, without stopping to ask for approval or notes between them.** Work through section 8 in the order given (the batches A to J). Do not pause after a batch, do not show candidates, do not ask questions: use your best judgement and keep going. If you run out of room in a response, carry on in the next as soon as I say "continue", picking up exactly where you stopped.',
    '',
    '**To keep it one set without stopping:** before the first picture, fix the look once, in your own words, in a short private note: the rendering style, grain, lighting direction, colour grade and level of detail of the title art. Keep to that note for every picture. Make the **emblems first** (they are quick and set the stencilled, worn graphic language), then the captains, contacts, ships, ports and the rest. For the optional scarred captains (batch J), keep the same person as in batch B.',
    '');
  md.push('| Batch | What | Pictures | Note |', '|---|---|---|---|');
  for (const b of BATCHES) md.push(`| ${b.id} | ${TITLES[b.slot]}${b.optional ? ' (scarred)' : ''} | ${n(b.slot, !!b.optional)} | ${b.note} |`);
  md.push('');
  P('**At the end, hand over ONE file:** a single PDF named `wayward-art-all.pdf`:',
    '- **Page 1:** a contact sheet of all the pictures (small thumbnails with their file names), so I can judge the set at a glance.',
    '- **Then one page per picture, in the order of section 8:** the picture as large as the page allows, and under it, as plain page text (not inside the picture), exactly this line, copied from the picture\'s heading in section 8:',
    '  `FILE: captains/vance`',
    '  (the slot folder, a slash, the id). This line is how the picture is put into the game, so it must be exact, and every picture needs its own page.',
    '- Keep the PDF to a size that can be downloaded (aim for under about 150 MB): embed each picture at roughly the size listed in section 5 (up to 1.5 times larger is fine), not at the largest your tool can make.',
    '',
    '**If one PDF is not possible** (too large, or your tool cannot build one), hand over one ZIP file instead, with every picture as a PNG named after its file line with the slash written as two underscores: `captains__vance.png`, `emblems__custody.png`.',
    '',
    'Before you put a picture in the file, check it against section 7 and remake it if it fails; show me only the finished file, not the attempts.');

  P('## 7. Check each picture before you hand it over',
    '1. Does it look like it belongs to the title art, and to the rest of the set?',
    '2. Is there **any text, lettering, numbers or logo** in it? If so, remove it.',
    '3. Is it **used, not clean**? (wear, patches, marks)',
    '4. Does it **read small**? (a face at 48 px, a ship at 120 px, a mark at 24 px)',
    '5. Colour rules: red only for threat, teal only for information, no neon pink.',
    '6. For a person: do they match the description in section 8 (age, build, clothes, face details)? Keep the same person the same in every picture of them.',
    '7. For emblems and ships: pure black background, nothing else in the frame.');

  P('## 8. The pictures',
    `Each entry: its **file** (copy the \`FILE:\` line exactly), the **size**, where it is shown, and the **prompt**. The style (section 3) and the global avoid list apply to every one and are not repeated. ${list.length} entries.`);

  for (const b of BATCHES) {
    const rows = list.filter((x) => x.slot === b.slot && !!x.optional === !!b.optional);
    md.push(`### Batch ${b.id}: ${TITLES[b.slot]}${b.optional ? ' (optional, scarred)' : ''} (${rows.length})`, '', b.note, '');
    for (const r of rows) {
      const key = `${SLOTS[r.slot].dir}/${r.id}`;
      md.push(`#### ${key}`, '', `\`FILE: ${key}\``, '', `- **Size:** ${r.size}. **Background:** ${r.background}.`, `- **Shown:** ${r.where}`, `- **Prompt:** ${r.body.replace(portraitSpec, '(portrait framing: section 5)').replace(player, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()}`, ...(r.slot === 'emblem' ? [`- **Avoid:** ${r.avoid}`] : []), '');
    }
  }
  return md.join('\n');
}
