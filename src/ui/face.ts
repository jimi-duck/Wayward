import type { Face } from '../sim/captains';

// ── a captain's face ──────────────────────────────────────────────────────
// A small portrait for the comms card, drawn as SVG from a named captain's
// face (content/captains.ts): head and jaw, hair, eyes and what is done to
// them, a mark, and a line for every scar the Wayward has given them. The
// faction's colour picks out the edges, as everything on the panel does.

const HAIR: Record<Face['hair'], string> = {
  shaved: '',
  crop: 'M17 26 Q18 10 32 9 Q46 10 47 26 Q44 17 32 16 Q20 17 17 26 Z',
  swept: 'M16 28 Q15 8 34 8 Q50 9 49 24 Q42 14 30 18 Q22 21 16 28 Z',
  long: 'M15 30 Q14 8 32 8 Q50 8 49 30 L51 54 L45 54 L45 27 Q44 16 32 16 Q20 16 19 27 L19 54 L13 54 Z',
  hood: 'M10 60 Q8 6 32 4 Q56 6 54 60 L47 60 Q50 20 32 15 Q14 20 17 60 Z',
};

/** The portrait as an SVG string. `scars`: lines across the face, one a meeting that broke their ship. */
export function faceSvg(f: Face, colour: string, scars = 0): string {
  const head = f.jaw === 'square'
    ? 'M17 27 Q17 12 32 12 Q47 12 47 27 L47 37 Q47 49 38 52 L26 52 Q17 49 17 37 Z'
    : 'M18 28 Q18 12 32 12 Q46 12 46 28 Q46 44 36 52 Q32 54 28 52 Q18 44 18 28 Z';
  const eyes = (() => {
    switch (f.eye) {
      case 'visor': return `<rect x="17" y="27" width="30" height="5" rx="1" fill="${colour}" opacity=".85"/>`;
      case 'patch': return `<path d="M17 25 L47 31" stroke="#111" stroke-width="1.5"/><rect x="22" y="27" width="7" height="5" rx="1.5" fill="#111"/><rect x="36" y="29" width="5" height="1.6" fill="#1b1b1b"/>`;
      case 'implant': return `<rect x="23" y="29" width="5" height="1.6" fill="#1b1b1b"/><circle cx="38.5" cy="29.8" r="2.4" fill="${colour}"/><circle cx="38.5" cy="29.8" r="4" fill="none" stroke="${colour}" stroke-width=".6" opacity=".7"/>`;
      default: return '<rect x="23" y="29" width="5" height="1.6" fill="#1b1b1b"/><rect x="36" y="29" width="5" height="1.6" fill="#1b1b1b"/>';
    }
  })();
  const mark = (() => {
    switch (f.mark) {
      case 'tattoo': return '<path d="M21 36 l3 7 M24 36 l3 7 M27 37 l2 5" stroke="#2a1d1a" stroke-width="1" opacity=".75"/>';
      case 'brand': return `<rect x="29.5" y="17" width="5" height="5" fill="none" stroke="#6e2a20" stroke-width="1.2"/>`;
      case 'circuit': return `<path d="M44 20 h-4 v5 h-3 M44 25 h-2 v4" stroke="${colour}" stroke-width=".8" fill="none"/><circle cx="37" cy="25" r=".9" fill="${colour}"/>`;
      default: return '';
    }
  })();
  const cuts = Array.from({ length: Math.min(4, scars) }, (_, i) => {
    const x = 22 + i * 6, y = 20 + (i % 2) * 14;
    return `<path d="M${x} ${y} l${7 - i} ${10 + i}" stroke="#ff5a4e" stroke-width="1.1" stroke-linecap="round" opacity=".9"/>`;
  }).join('');
  const hair = HAIR[f.hair];
  const behind = f.hair === 'hood' || f.hair === 'long' ? `<path d="${hair}" fill="${f.hairColour}"/>` : '';
  const over = hair && !behind ? `<path d="${hair}" fill="${f.hairColour}"/>` : '';
  const stubble = f.hair === 'shaved' ? `<path d="M18 26 Q18 12 32 12 Q46 12 46 26" fill="none" stroke="${f.hairColour}" stroke-width="2" opacity=".55"/>` : '';
  return `<svg viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<rect x="0" y="0" width="64" height="72" fill="#0d0f12"/>`
    + `<path d="M4 72 Q6 56 22 54 L42 54 Q58 56 60 72 Z" fill="#1d2127" stroke="${colour}" stroke-width="1"/>`
    + `<rect x="27" y="47" width="10" height="9" fill="${f.skin}" opacity=".85"/>`
    + behind
    + `<path d="${head}" fill="${f.skin}"/>`
    + stubble + over + eyes
    + `<path d="M28 44 h8" stroke="#3a2622" stroke-width="1.2" stroke-linecap="round"/>`
    + mark + cuts
    + `<rect x=".5" y=".5" width="63" height="71" fill="none" stroke="${colour}" stroke-width="1" opacity=".6"/>`
    + `</svg>`;
}
