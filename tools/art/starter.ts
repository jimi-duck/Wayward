import { SLOTS, type SlotId } from '../../src/content/art';
import { player, portraitSpec, type Brief } from './briefs';

// A small first set for a free image-generator account: 15 pictures, one short
// prompt each, to paste one at a time. Written by art-brief.pilot.ts.

/** The look in a few lines, put at the head of every message (free chats forget). */
export const STYLE_SHORT = 'Cinematic, richly detailed sci-fi concept art, painterly-realistic, dark and muted, in the look of the Wayward title art. Industrial cyberpunk frontier, "used, not dirty": worn painted metal, faded paint, patches, stencils, cables. Mostly dark, one warm yellow-orange anchor, teal only for screens, red only for danger, no neon pink. Soft haze, one key light with a rim light, small restrained glow. No text, lettering, numbers, logos, watermark or border anywhere in the picture.';

/** The fifteen, in the order to make them: if a daily limit stops you, the first ones matter most. */
const PICKS: Array<[SlotId, string]> = [
  ['captain', 'calloway'], ['captain', 'vance'], ['captain', 'kade'], ['captain', 'ashgrove'],
  ['contact', 'story_warden'], ['contact', 'story_broker'], ['contact', 'foreman'],
  ['emblem', 'custody'], ['emblem', 'gutter'], ['emblem', 'thren'],
  ['ship', 'lancer'], ['ship', 'scout'],
  ['place', 'kellern'], ['place', 'frontier'],
  ['ending', 'vanish'],
];

const SHAPE: Record<SlotId, string> = {
  captain: 'Make it a tall portrait picture (2:3).', contact: 'Make it a tall portrait picture (2:3).', emblem: 'Make it a square picture (1:1).',
  ship: 'Make it a wide landscape picture (3:2).', place: 'Make it a wide landscape picture (3:2); keep everything important in the middle third of the height, because it will be cropped to a thin banner.',
  ending: 'Make it a wide landscape picture (3:2).', sighting: '', file: '', region: '', fleet: '', job: '', phenomenon: '', gate: '', planet: '', debrief: '', baybanner: '',
};

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

export function starterBrief(list: Brief[]): string {
  const md: string[] = [];
  const P = (...l: string[]) => md.push(...l, '');
  P('# Wayward artwork: the starter 15', '*For a free ChatGPT account. Written by `npm run art:brief`; the full brief for a paid run is [CHATGPT-BRIEF.md](CHATGPT-BRIEF.md).*');
  P('## What you need',
    '- A ChatGPT chat, free account. Free accounts only allow a few pictures a day and forget things quickly, so: **one picture per message, and every message already carries the whole look.** Nothing to attach except, if it lets you, `docs/art/reference/wayward-title-art.jpg` on the first message.',
    '- If it stops ("limit reached"), come back later in the **same chat** and carry on from the next number. The list is ordered so the first ones matter most.',
    '- A folder on your computer to save each picture into.');
  P('## How',
    '1. Start a new chat. Attach `wayward-title-art.jpg` if you can, and send message 1 below.',
    '2. When the picture comes, look at it. If it has **text in it, a border, or a bright background**, reply "no text, no border, darker, try again". If it is fine, save it (click it, download).',
    '3. **Name the file exactly as shown** under each message (for example `captains__vance.png`). That name is how it goes into the game.',
    '4. From message 2 on, start each message with: *"Same style as the previous pictures."* then paste the next prompt.',
    '5. When you have some, put them in one folder and give them to me (or run `npm run art:prep -- <folder>`): they are cropped, resized and put in the game. Send me screenshots and I will check how they look.');
  P('## The 15 messages', 'Paste each whole block (the grey box) as one message.');
  let n = 0;
  for (const [slot, id] of PICKS) {
    const b = list.find((x) => x.slot === slot && x.id === id);
    if (!b) throw new Error(`starter pick ${slot}/${id} has no brief`);
    n++;
    let body = oneLine(b.body.replace(portraitSpec, '').replace(player, ''));
    const portrait = slot === 'captain' || slot === 'contact';
    const extra = portrait ? 'Head-and-shoulders portrait, the face large and clear (it will be shown very small), eyes in the upper third, looking at the viewer, dark out-of-focus setting behind.' : '';
    if (slot === 'ship') body = body.replace(/Framing:.*$/, '') + ' One ship only, three-quarter side view from slightly above, nose pointing right, whole hull in frame, on a plain pure black background, no stars or planets. It must read as a clear silhouette even when small.';
    if (slot === 'emblem') body = body.replace(/Style: stencilled.*$/, '').replace('Part of a set of ten marks; keep stroke weight and size the same across the set.', '');
    body = body.replace(' 16:9 is fine; the prep step crops to a 4:1 band.', '').replace(' Square, 1:1.', '').replace('cinematic 16:9, ', '').replace(' Keep everything important in the middle third of the height, because the game crops the top and bottom.', '');
    const msg = `${slot === 'emblem' ? '' : STYLE_SHORT + ' '}${body} ${extra} ${SHAPE[slot]}`.replace(/\s+/g, ' ').trim();
    md.push(`### ${n}. ${SLOTS[slot].dir}/${id}`, '', `Save as: **\`${SLOTS[slot].dir}__${id}.png\`**`, '', '```text', msg, '```', '');
  }
  P('## If it goes wrong',
    '- **Text or letters in the picture:** reply "remove all text and lettering".',
    '- **Too bright or too clean:** reply "much darker, more worn and used, muted colours".',
    '- **Emblem is not white on black:** reply "pure white shape on a pure black background, flat, no shading".',
    '- **A face you do not like:** reply "same person, different pose and lighting", or just ask again. Save only the ones you like.',
    '- **It forgets the look between messages:** that is why every message carries it; if the style still drifts, attach the best picture so far and say "match this one".');
  return md.join('\n');
}
