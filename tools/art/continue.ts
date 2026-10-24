import { SLOTS, type SlotId } from '../../src/content/art';
import { player, portraitSpec, type Brief } from './briefs';
import { EXTRA_LOOK, OWNED_LOOK } from './looks';
import { STYLE_SHORT } from './starter';

// The second brief: a continuation for an image generator that has already made the
// first 109 pictures. Same look, new subjects, one picture per image. Written by
// art-brief.pilot.ts.

const OWNED = new Set(Object.keys(OWNED_LOOK));
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

const SHAPE: Partial<Record<SlotId, string>> = {
  fleet: 'Make it a wide landscape picture (3:2), the ship on pure black.',
  job: 'Make it a wide landscape picture (16:9).',
  phenomenon: 'Make it a landscape picture (4:3).',
};

const BATCHES: Array<{ id: string; title: string; note: string; pick: (b: Brief) => boolean }> = [
  { id: 'K', title: 'Capital ships', note: 'The nine flagships the captains fly. Each is huge: show scale with tiny windows and gantries. These matter most.', pick: (b) => b.slot === 'fleet' && b.id.startsWith('capital-') },
  { id: 'L', title: 'The Wayward, fitted', note: 'Her four ways of being fitted. Keep her the same ship as in the title art: only the fittings change.', pick: (b) => b.slot === 'fleet' && b.id.startsWith('wayward-') },
  { id: 'M', title: 'Ships going about their business', note: 'Eight neutral hulls for the jobs and the traffic. Not warships.', pick: (b) => b.slot === 'fleet' && !b.id.startsWith('capital-') && !b.id.startsWith('wayward-') && !OWNED.has(b.id) },
  { id: 'N', title: 'The same hull, a different owner', note: 'Six pictures of ships the first set already drew, but in the colours of whoever actually owns them. Today a Kellern security call, a Drift fleet and a Guild food trader all show a Custody hull. Keep the same silhouette as the matching picture in the first set (attach it if you can) and change only the paint, markings and fittings.', pick: (b) => b.slot === 'fleet' && OWNED.has(b.id) },
  { id: 'O', title: 'Jobs', note: 'Twenty-four scenes, one per job card. The moment just before the job starts, with the Wayward small in the frame.', pick: (b) => b.slot === 'job' },
  { id: 'P', title: 'Phenomena', note: 'Fourteen strange things out in space, as found camera stills.', pick: (b) => b.slot === 'phenomenon' },
];

export function continueBrief(all3: Brief[]): string {
  // the third run (wrecks, gates, planets, debrief) has its own brief: docs/art/NEXT-BRIEF.md
  const list = all3.filter((b) => !(b.slot === 'fleet' && b.id in EXTRA_LOOK) && !['gate', 'planet', 'debrief', 'baybanner', 'spec'].includes(b.slot));
  const md: string[] = [];
  const P = (...l: string[]) => md.push(...l, '');
  const all = BATCHES.flatMap((bt) => list.filter(bt.pick));

  P('# Wayward artwork: the continuation', `*Written by \`npm run art:brief\`. Give this whole file to the image generator that made the first set (same chat if you still have it). ${all.length} new pictures in six batches.*`);

  P('## Read this first',
    'The first 109 pictures for the game WAYWARD are done and in use: captains, contacts, emblems, fifteen ships, ports, endings, sightings, pieces of the file and regions. This is **the same job, continued**: new subjects, the identical look. If you remember the first set, match it. If you do not, match the attached reference pictures (the Wayward title art).',
    '**The one thing that went wrong last time:** several pictures came back as a **contact sheet** (a 2×2 board of four panels, or ten marks on one image). The game needs **one picture per image**. A board has to be cut up, and cutting a quarter out of a sheet halves the quality. So:',
    '- **Make every picture as its own full-frame image. Never a grid, a board, a collage or "four variations".**',
    '- One subject per image, filling the frame, at the shape asked for.');

  P('## What to deliver',
    `- ${all.length} pictures, **each a separate PNG**, named exactly as the \`Save as\` line says (for example \`fleet__capital-vance.png\`; two underscores after the folder name).`,
    '- Hand them back as **one ZIP** of PNGs. If you cannot make a ZIP, give one PDF with one picture per page and the file name written on the page, in a caption **outside** the picture.',
    '- No text, lettering, numbers, logos, captions, watermark, frame or border **inside** any picture.',
    '- Do the batches in order K, L, M, N, O, P. If you run out of room, stop at the end of a picture and carry on when told "continue".');

  P('## The look (it is the same as before)',
    'Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted. Industrial cyberpunk frontier, "used, not dirty": old, patched, regulated, repurposed technology; worn painted metal, faded paint, replacement panels, stencils, cable runs, maintenance labels. Mostly dark and desaturated (void black, off-white, dust grey, rust brown) with one warm yellow-orange anchor (the Wayward). Signal teal only for screens and information; alert red only for threat; dull gold only for caution; nebula purple only far in the background; no neon pink. Low-key light: one key light with a soft rim light and haze; glow small and restrained (engine blue, window orange); nothing blown out. No text anywhere in the picture.',
    '**The Wayward** is the player\'s ship: a long, low, aerodynamic ore hauler in worn yellow-orange, split side engine pods, brand marks WAYWARD and OBEDIENCE CLASS. It appears small in many scenes below. Keep it the same ship every time.');

  P('## Sizes and shapes',
    '| Kind | Shape to make | Notes |', '| --- | --- | --- |',
    `| Ships (fleet) | wide 3:2 | one ship, three-quarter side view from slightly above, nose pointing right, pure black background, the whole hull in frame and **large in the frame** (fill about 80% of the width) |`,
    `| Jobs | 16:9 | cinematic, lower third calm |`,
    `| Phenomena | 4:3 | a found camera still, slightly grainy |`,
    '', 'The game crops and resizes from the centre, so keep the subject centred and away from the edges.');

  for (const bt of BATCHES) {
    const items = list.filter(bt.pick);
    P(`## Batch ${bt.id}: ${bt.title} (${items.length})`, bt.note);
    for (const b of items) {
      let body = oneLine(b.body.replace(portraitSpec, '').replace(player, ''));
      body = body.replace(/ ?16:9 is fine;[^.]*\./, '').replace('cinematic 16:9, ', '');
      const msg = oneLine(`${STYLE_SHORT} ${body} ${SHAPE[b.slot] ?? ''} One picture only, full frame, not a sheet or a grid.`);
      md.push(`### ${SLOTS[b.slot].dir}/${b.id}`, '', `Save as: **\`${SLOTS[b.slot].dir}__${b.id}.png\`**`, '', '```text', msg, '```', '');
    }
  }

  P('## If it goes wrong',
    '- **It made a sheet or a grid:** reply "make this as one single full-frame picture, not a sheet".',
    '- **Text or letters in the picture:** reply "remove all text and lettering".',
    '- **Ship too small in the frame:** reply "same ship, much closer, filling the frame, still on pure black".',
    '- **Too bright or too clean:** reply "much darker, more worn and used, muted colours".',
    '- **The Wayward looks different from the title art:** attach the title art and say "this exact ship, only the fittings change".',
    '- **The style drifts:** attach the best picture so far and say "match this one".');

  P('## Ideas for later (not in this run)',
    'Written down so nothing is lost; the game has no slot for them yet. Do not make them now.',
    '- **Wrecks:** each of the fifteen hulls as a stripped hulk, for salvage.',
    '- **Damage stages** of the Wayward (scorched, holed, limping) for the debrief.',
    '- **Faction liveries:** the Gutter, Custody and Guild paint on the same traffic hull.',
    '- **Stations and planets:** one hero picture per region gate.',
    '- **Elite enemies:** a glowing, armoured or cloaked version of a hull.',
    '- **Debrief scenes:** adrift, boarded, caught by the Custody.');
  return md.join('\n');
}
