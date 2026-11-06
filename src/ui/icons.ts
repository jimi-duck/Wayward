// ── icons ─────────────────────────────────────────────────────────────────
// The HUD's line icons for the ship's systems (the sprite in index.html),
// shared by the HUD and the refit bay.

export function icon(id: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'ico');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

/** A module's own glyph (public/icons/node, cut by tools/cut-bay-icons.py): a mask, so it takes the colour around it. */
export function nodeIcon(id: string): HTMLElement {
  const el = document.createElement('span');
  el.className = 'ico-img';
  // resolved here: a url() in a custom property is read against the stylesheet, not the page
  el.style.setProperty('--img', `url(${new URL(`${import.meta.env.BASE_URL}icons/node/${id}.png`, document.baseURI).href})`);
  return el;
}
