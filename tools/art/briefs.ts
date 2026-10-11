import { CAPTAINS, PERSONALITIES } from '../../src/content/captains';
import { SLOTS, type SlotId } from '../../src/content/art';
import { CARDS } from '../../src/content/cards';
import { ENDINGS } from '../../src/content/endings';
import { REGIONS_LONG, } from '../../src/content/regions';
import { regionSlug } from '../../src/content/art';
import { OBSERVATIONS } from '../../src/content/situations';
import { FRAGMENTS_ALL, STORY_CARDS } from '../../src/content/story';
import { CALLOWAY_FACE } from '../../src/content/calloway';
import { MISSION_CARDS } from '../../src/content/missions';
import { FEATURES, type FeatureId } from '../../src/content/features';
import { ALIEN_TYPES, VARIANTS } from '../../src/sim/enemies';
import type { Face } from '../../src/sim/captains';
import { artIds, artOptional } from './ids';
import { CAPITAL_LOOK, JOB_SCENE, TRAFFIC_LOOK, WAYWARD_LOOK, CAPTAIN_LOOK, CONTACT_LOOK, EMBLEM_IDEA, ENDING_SCENE, FACTION_LOOK, PLACE_LOOK, REGION_LOOK, SHIP_LOOK } from './looks';

// The prompt for every picture, written from the game's rows and tools/art/looks.ts.
// Plain text, one block per picture, to paste into any image generator.

type Raw = Omit<Brief, 'body'>;
export interface Brief {
  slot: SlotId;
  id: string;
  /** Where the finished file goes. */
  file: string;
  /** The prompt, ready to paste. */
  prompt: string;
  /** What to leave out (for generators with a negative prompt field). */
  avoid: string;
  /** Pixels to deliver, and the background wanted. */
  size: string;
  background: string;
  /** Shown on: where the player sees it, and what the game does if it is missing. */
  where: string;
  /** The game rows the prompt was built from, for checking a result against its card. */
  facts: string[];
  optional?: boolean;
  /** The prompt without the style block (the master brief states the style once). */
  body: string;
}

/** The look of the whole game in one block, put at the head of every prompt. */
export const STYLE = [
  'Style: cinematic, richly detailed sci-fi concept art in the look of the Wayward title art (the attached reference): dark space, painterly-realistic, high detail, volumetric haze. Industrial cyberpunk frontier, "used, not dirty": advanced technology that is old, patched, regulated and repurposed; everything has a previous owner, a serial number and a warning label.',
  'Worn painted metal, faded paint, replacement panels, exposed fasteners, cable runs, stencilled markings, maintenance labels; lava-veined dark rock where rock appears; warm amber window lights against deep blue-black shadow.',
  'Palette: mostly dark and desaturated (void black #080D0E, industrial off-white #D8D5C6, dust grey #596160, deep rust brown #4A3A27) with the Wayward\'s yellow-orange (#D99A27) as the warm anchor. Accents sparingly: signal teal #39AEB7 only for screens and information; alert red #C94A3F only for threat; a dull gold #C9AB66 only for caution. Nebula purple only far in the background. No neon pink.',
  'Lighting: low-key, one clear key light with soft rim light and haze, glow kept restrained and small (engine blue, window orange); nothing blown out.',
].join(' ');

export const AVOID_ALL = 'text, lettering, captions, watermark, signature, logo, UI frame, border, lens flare, neon pink, purple cityscape, glossy chrome, sleek luxury sci-fi, clean new surfaces, cartoon, anime, extra fingers, distorted face';

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
const skinWord = (hex: string) => { const l = lum(hex); return l > 0.78 ? 'pale' : l > 0.68 ? 'light' : l > 0.56 ? 'tan' : l > 0.42 ? 'brown' : 'deep brown'; };
const hairWord = (hex: string) => { const l = lum(hex); return l > 0.7 ? 'white-grey' : l > 0.45 ? 'brown-grey' : l > 0.22 ? 'dark brown' : 'black'; };
const HAIR: Record<Face['hair'], string> = { shaved: 'a shaved head with stubble', crop: 'short cropped hair', swept: 'swept-back hair', long: 'long hair worn down past the shoulders', hood: 'a deep hood framing the face' };
const EYE: Record<Face['eye'], string> = { none: '', patch: 'one eye covered by a patch', implant: 'a glowing implant in one eye', visor: 'a narrow visor across the eyes' };
const MARK: Record<Face['mark'], string> = { none: '', tattoo: 'small tattoo lines on the cheek', brand: 'a square brand mark on the forehead', circuit: 'a fine circuit-line implant at the temple' };

function faceWords(f: Face): string {
  return [`${skinWord(f.skin)} skin`, HAIR[f.hair] + ` (${hairWord(f.hairColour)})`, EYE[f.eye], MARK[f.mark], f.jaw === 'square' ? 'a square jaw' : 'a narrow jaw'].filter(Boolean).join(', ');
}

const dir = (s: SlotId) => `src/art/${SLOTS[s].dir}`;
const sz = (s: SlotId) => `${SLOTS[s].w}×${SLOTS[s].h}`;

export const portraitSpec = [
  'Framing: head and shoulders portrait, 4:5 vertical, the face filling about two thirds of the frame height so it still reads when shown 48 pixels wide. Eyes in the upper third, looking toward the viewer.',
  'Lighting: the key light from the side or the screens in front; a plain dark, out-of-focus setting behind. The person is the whole picture.',
].join(' ');

export const player = 'The viewer is "Juno", a miner who stole the wrong ship; this person is someone met over a comms channel.';

function captainBrief(id: string, scarred = false): Raw {
  const c = CAPTAINS.find((x) => x.id === id);
  const face = c?.face ?? CALLOWAY_FACE;
  const look = CAPTAIN_LOOK[id] ?? '';
  const faction = c ? FACTION_LOOK[c.faction] : FACTION_LOOK.office;
  const name = c ? `${c.rank} ${c.name}` : 'Prefect Idris Calloway';
  const human = id !== 'chorus' && id !== 'loom';
  const personality = c ? PERSONALITIES[c.personality].word.split(' · ')[0] : 'Hunter';
  const hail = c?.lines.hail ?? '“Wayward, this is Prefect Calloway of the Office of Peace.”';
  const scar = scarred ? (human ? ' Show the damage Juno has done: two or three fresh scars, a burn, a dressing, a harder look.' : ' Show damage: cracked displays, burn marks, flickering.') : '';
  return {
    slot: 'captain', id: scarred ? `${id}-scarred` : id, file: `${dir('captain')}/${scarred ? `${id}-scarred` : id}.webp`,
    prompt: `${STYLE}\n\nSubject: ${name}, ${c ? `who flies the ${c.ship} for ${faction}` : `${FACTION_LOOK.office} She hunts the player across the Scatter.`} Personality: ${personality}. ${look}${human ? ` Face (from the game's portrait): ${faceWords(face)}.` : ''}${scar}\nMood: how they sound when they first open a channel: ${hail}\n\n${portraitSpec}\n${player}`,
    avoid: AVOID_ALL, size: sz('captain'), background: 'full picture (a dark setting)',
    where: scarred ? 'The comms call from a captain you have already scarred; the plain portrait is used if this is missing.' : 'The comms call: top left of the transmission. The drawn face is used if this is missing.',
    facts: [`name ${name}`, c ? `faction ${c.faction}, ship ${c.ship}` : 'Office of Peace', `personality ${personality}`, `face ${faceWords(face)}`],
    optional: scarred,
  };
}

const cardOf = (id: string) => [...CARDS, ...STORY_CARDS].find((c) => c.id === id)!;
const CALLER_FACTION: Record<string, string> = { miners: 'miners', kellern: 'kellern', guild: 'guild', frontier: 'frontier', gutter: 'gutter', custody: 'custody', office: 'office' };

function contactBrief(id: string): Raw {
  const c = cardOf(id);
  const look = CONTACT_LOOK[id] ?? '';
  const [name, role] = c.from.split(' · ');
  const faction = FACTION_LOOK[CALLER_FACTION[c.caller] ?? 'frontier'];
  return {
    slot: 'contact', id, file: `${dir('contact')}/${id}.webp`,
    prompt: `${STYLE}\n\nSubject: ${name}${role ? `, ${role}` : ''}. ${look}\nTheir people: ${faction}\nMood: what they say to the player: ${c.text.slice(0, 220)}\n\n${portraitSpec}\n${player}`,
    avoid: AVOID_ALL, size: sz('contact'), background: 'full picture (a dark setting)',
    where: `The comms call "${c.title}" (${id}), top left of the transmission. The caller's emblem is used if this is missing.`,
    facts: [`from "${c.from}"`, `caller ${c.caller}`, `title "${c.title}"`],
  };
}

function emblemBrief(id: string): Raw {
  return {
    slot: 'emblem', id, file: `${dir('emblem')}/${id}.webp`,
    prompt: `A single flat emblem, a one-colour graphic mark for ${FACTION_LOOK[id]}\nThe mark: ${EMBLEM_IDEA[id]}.\nDraw it as a bold white shape on a pure black background, centred, with generous empty margin (the mark fills about 70% of the frame), thick clean strokes that survive being shrunk to 24 pixels, no gradients, no shading, no texture, no text. Square, 1:1. It will be tinted by the game, so it must work as a plain silhouette.\nStyle: stencilled, industrial, used: edges may be slightly worn, never decorative. Part of a set of ten marks; keep stroke weight and size the same across the set.`,
    avoid: 'text, letters, numbers, colour, gradient, shading, 3D, background pattern, border, drop shadow',
    size: sz('emblem'), background: 'white mark on pure black (the prep step turns the black into transparency)',
    where: 'The comms call: the little mark at top left when the caller has no portrait, tinted white/teal/red like the rest of the panel. The plain diamond sigil is used if this is missing.',
    facts: [`faction ${id}`],
  };
}

function shipBrief(id: string): Raw {
  const v = VARIANTS[id]!, T = ALIEN_TYPES[v.kind];
  const size = T.r >= 3 ? 'large' : T.r >= 2.2 ? 'medium-large' : T.r >= 1.6 ? 'medium' : 'small';
  return {
    slot: 'ship', id, file: `${dir('ship')}/${id}.webp`,
    prompt: `${STYLE}\n\nSubject: a spacecraft, the "${v.label}" (${T.role}) of ${FACTION_LOOK[v.faction]}\nSilhouette: ${SHIP_LOOK[id] ?? ''} Relative size in the game: ${size}. It fights by ${T.tactic} (${T.fire} fire).\nFraming: one ship, three-quarter side view from slightly above, nose pointing right, the whole hull in frame with room around it, on a pure black background, lit from one side with a rim light. No planet, no other ships, no stars, no text. Wide 2:1.\nThe ship must read at 120 pixels wide: a clear silhouette first, detail second.`,
    avoid: `${AVOID_ALL}, background scenery, stars, planets, cockpit pilot visible`,
    size: sz('ship'), background: 'pure black (blended in the game, no cut-out needed; a transparent PNG is also fine)',
    where: 'The comms call: above the strength bars when the card has ships. Nothing is shown if this is missing.',
    facts: [`variant ${id}`, `kind ${v.kind}, role ${T.role}`, `faction ${v.faction}`, `size r=${T.r}`],
  };
}

function placeBrief(id: string): Raw {
  return {
    slot: 'place', id, file: `${dir('place')}/${id}.webp`,
    prompt: `${STYLE}\n\nSubject: ${PLACE_LOOK[id]}\nFraming: a wide establishing shot of the port seen from a ship approaching, ultra-wide banner. Keep everything important in the middle third of the height, because the game crops the top and bottom. A hint of a ship docked or approaching for scale. 16:9 is fine; the prep step crops to a 4:1 band.\nThe place should feel lived in: people work here.`,
    avoid: AVOID_ALL, size: sz('place'), background: 'full picture',
    where: 'The port panel: a banner above the title. Nothing is shown if this is missing.',
    facts: [`holder ${id}`],
  };
}

function endingBrief(id: string): Raw {
  const e = ENDINGS.find((x) => x.id === id)!;
  return {
    slot: 'ending', id, file: `${dir('ending')}/${id}.webp`,
    prompt: `${STYLE}\n\nSubject: the ending "${e.name}": ${e.pitch}\nScene: ${ENDING_SCENE[id]}\nFraming: cinematic 16:9, the Wayward (a long, low, aerodynamic ore hauler in worn yellow-orange with split side engine pods; brand marks WAYWARD and OBEDIENCE CLASS) small in the frame with room around it; leave the lower third calm because text sits over it.\nFirst-person hindsight: the picture should feel like a memory of that moment.`,
    avoid: AVOID_ALL, size: sz('ending'), background: 'full picture',
    where: 'The Threshold, once you have chosen: above the epilogue. The Archive shows it beside the reached ending. Nothing is shown if this is missing.',
    facts: [`ending ${id}`, `pitch "${e.pitch}"`, `file "${e.file}"`],
  };
}

function sightingBrief(flag: string): Raw {
  const o = OBSERVATIONS.find((x) => x.flag === flag)!;
  const group = /thren/.test(flag) || flag === 'saw_thren' ? FACTION_LOOK.thren : /voice/.test(flag) || flag === 'saw_voice' ? FACTION_LOOK.voice : 'something unexplained, between the Voice and the Thren';
  return {
    slot: 'sighting', id: flag, file: `${dir('sighting')}/${flag}.webp`,
    prompt: `${STYLE}\n\nSubject: a sensor still, "${o.name}": ${o.line}\nIt belongs to: ${group}\nThe player’s own theory in the Archive: ${o.theory}\nFraming: a found photograph from the Wayward’s external camera, 4:3, grainy and slightly overexposed, a little motion blur, a HUD-less raw frame. The thing is far away and hard to read; leave the mystery intact. A faint timestamp-style corner mark is fine as a shape, not as legible text.`,
    avoid: AVOID_ALL, size: sz('sighting'), background: 'full picture',
    where: 'The Archive, beside a sighting once it has been seen. Unseen sightings stay blank.',
    facts: [`flag ${flag}`, `name "${o.name}"`, `line "${o.line}"`],
  };
}

function fileBrief(flag: string): Raw {
  const f = FRAGMENTS_ALL.find((x) => x.flag === flag)!;
  return {
    slot: 'file', id: flag, file: `${dir('file')}/${flag}.webp`,
    prompt: `${STYLE}\n\nSubject: a piece of the Severance file, "${f.name}": ${f.line}\nMake it a physical or screen artefact that fits the name: a scanned page, a ledger, a sealed recorder, a hand-drawn chart, a list of names, a stamped order.\nFraming: a top-down or slightly angled still life on a dark steel table lit by one lamp, 4:3, the artefact large and readable as an object. Any writing must be illegible scribble or redacted bars, never real words.`,
    avoid: `${AVOID_ALL}, legible words, readable text`,
    size: sz('file'), background: 'full picture',
    where: 'The Archive, beside a piece of the file once you have found it. Missing pieces stay blank.',
    facts: [`flag ${flag}`, `name "${f.name}"`, `line "${f.line}"`],
  };
}

function regionBrief(slug: string): Raw {
  const r = REGIONS_LONG.find((x) => regionSlug(x.name) === slug)!;
  return {
    slot: 'region', id: slug, file: `${dir('region')}/${slug}.webp`,
    prompt: `${STYLE}\n\nSubject: ${r.name}: ${r.blurb}\nScene: ${REGION_LOOK[slug]}\nFraming: a wide establishing view with the Wayward very small for scale (a long, low, worn yellow-orange hauler), 8:3 banner; keep the important part in the middle band.`,
    avoid: AVOID_ALL, size: sz('region'), background: 'full picture',
    where: 'Not drawn yet: the slot is ready for the chart’s region header and the region gate card.',
    facts: [`region ${r.name}`, `gate ${r.gate}`],
  };
}

const BLACK_HULL = 'Framing: one ship, three-quarter side view from slightly above, nose pointing right, the whole hull in frame with generous room around it, on a pure black background, lit from one side with a soft rim light. Make the silhouette read clearly at small size. No people, no scenery, no text.';

function fleetBrief(id: string): Raw {
  const cap = /^capital-/.test(id), way = /^wayward-/.test(id);
  const key = id.replace(/^capital-/, '');
  const look = (cap ? CAPITAL_LOOK[key] : way ? WAYWARD_LOOK[id] : TRAFFIC_LOOK[id]) ?? "";
  const c = CAPTAINS.find((x) => x.id === key);
  const faction = c ? FACTION_LOOK[c.faction] : cap ? FACTION_LOOK.office : '';
  const scale = cap ? 'Very large: a capital ship, far bigger than the Wayward, with a sense of scale from tiny lit windows and gantries.' : 'Medium in the game.';
  return {
    slot: 'fleet', id, file: `${dir('fleet')}/${id}.webp`,
    prompt: `${STYLE}\n\nSubject: ${look.replace(/\.?$/, ".")}${faction ? `\nIt belongs to: ${faction}` : ''}\n${way ? 'Keep the Wayward consistent with the first set of pictures: a long, low, worn yellow-orange ore hauler with split side engine pods.' : scale}\n${BLACK_HULL}`,
    avoid: `${AVOID_ALL}, background scenery, stars, planets, cockpit pilot visible`,
    size: sz('fleet'), background: 'pure black (blended in the game, no cut-out needed)',
    where: cap ? 'Not drawn yet: ready for the capital ship hail and the Arcade capital warning.' : way ? 'Not drawn yet: ready for the bay (the ship as fitted) and the debrief.' : 'Not drawn yet: ready for jobs and neutral traffic cards.',
    facts: [`id ${id}`, ...(c ? [`ship ${c.ship}`, `captain ${c.name}`] : [])],
  };
}

function jobBrief(id: string): Raw {
  const c = MISSION_CARDS.find((x) => x.id === id)!;
  return {
    slot: 'job', id, file: `${dir('job')}/${id}.webp`,
    prompt: `${STYLE}\n\nSubject: the job "${c.title}". ${c.text.replace(/[“”]/g, '"')}\nScene: ${JOB_SCENE[id]}.\nFraming: cinematic 16:9, the moment just before the job starts. The Wayward (a long, low, worn yellow-orange ore hauler with split side engine pods) is small in the frame with room around it; keep the lower third calm because the job text sits over it. One clear subject, the read at a glance.\nNo people's faces, no text, no UI.`,
    avoid: AVOID_ALL, size: sz('job'), background: 'full picture',
    where: 'Not drawn yet: ready for the job card in comms and the objective header.',
    facts: [`card ${id}`, `title "${c.title}"`, `from "${c.from}"`],
  };
}

function phenomenonBrief(id: string): Raw {
  const f = FEATURES[id as FeatureId];
  return {
    slot: 'phenomenon', id, file: `${dir('phenomenon')}/${id}.webp`,
    prompt: `${STYLE}\n\nSubject: "${f.name}": ${f.blurb}\nFraming: a found photograph from the Wayward’s external camera, 4:3, slightly grainy, a little overexposed, no HUD. The thing is large, strange and unexplained; the Wayward may be a tiny silhouette for scale. Keep it atmospheric and a little mysterious.`,
    avoid: AVOID_ALL, size: sz('phenomenon'), background: 'full picture',
    where: 'Not drawn yet: ready for the chart’s place markers and the Archive.',
    facts: [`feature ${id}`, `name "${f.name}"`],
  };
}

/** The slots added after the first set, for the continuation brief. */
export const CONTINUATION: SlotId[] = ['fleet', 'job', 'phenomenon'];

export function allBriefs(): Brief[] {
  const ids = artIds(), opt = artOptional();
  const out: Raw[] = [];
  for (const id of ids.captain) out.push(captainBrief(id));
  for (const id of opt.captain ?? []) out.push(captainBrief(id.replace(/-scarred$/, ''), true));
  for (const id of ids.contact) out.push(contactBrief(id));
  for (const id of ids.emblem) out.push(emblemBrief(id));
  for (const id of ids.ship) out.push(shipBrief(id));
  for (const id of ids.place) out.push(placeBrief(id));
  for (const id of ids.ending) out.push(endingBrief(id));
  for (const id of ids.sighting) out.push(sightingBrief(id));
  for (const id of ids.file) out.push(fileBrief(id));
  for (const id of ids.region) out.push(regionBrief(id));
  for (const id of ids.fleet) out.push(fleetBrief(id));
  for (const id of ids.job) out.push(jobBrief(id));
  for (const id of ids.phenomenon) out.push(phenomenonBrief(id));
  return out.map((b) => ({ ...b, body: b.prompt.startsWith(STYLE) ? b.prompt.slice(STYLE.length).trimStart() : b.prompt }));
}
