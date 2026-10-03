import {
  CanvasTexture, Color, EdgesGeometry, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, RepeatWrapping,
  SRGBColorSpace, type BufferGeometry, type Group, type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ── the cyberpunk kit ─────────────────────────────────────────────────────
// Dark matte armour, every hard edge traced in neon. The neon is HDR colour
// (components above 1), so the bloom pass turns it into light; the armour is
// rough and nearly black, so the light is all there is to read a silhouette
// by. Models are baked to two draws each: one mesh for the armour, one line
// set for the edges.

let armourMap: Texture | null = null;

/** Dark plating: faint seams, sparse lit slits in magenta and cyan. */
export function armourTexture(): Texture {
  if (armourMap) return armourMap;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  let s = 91;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  g.fillStyle = '#26292f';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 120; i++) {
    const x = r() * 512, y = r() * 512, w = 30 + r() * 140, h = 14 + r() * 60, v = 30 + r() * 18;
    g.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(0,0,0,.6)';
    g.strokeRect(x + 0.5, y + 0.5, w, h);
  }
  for (let i = 0; i < 70; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(255,60,220,.95)' : 'rgba(0,240,255,.9)';
    g.fillRect(r() * 512, r() * 512, 2 + r() * 10, 1.5);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(0.6, 0.6);
  armourMap = t;
  return t;
}

export function armour(tint = 0xffffff): MeshStandardMaterial {
  return new MeshStandardMaterial({ map: armourTexture(), color: tint, roughness: 0.82, metalness: 0.4, flatShading: true });
}

export function neonLine(c: Color): LineBasicMaterial {
  return new LineBasicMaterial({ color: c, toneMapped: false });
}

export interface Baked { body: BufferGeometry; edges: BufferGeometry; }

/**
 * Merge every mesh under `root` into one armour geometry, and trace its hard
 * edges (anything sharper than `angle` degrees) into one line geometry.
 * Meshes whose material is not the armour (glow strips, ports) are left out.
 */
export function bake(root: Group, angle = 28): Baked {
  root.updateMatrixWorld(true);
  const bodies: BufferGeometry[] = [], edges: BufferGeometry[] = [];
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || m.userData.glow) return;
    let g = m.geometry.clone();
    g = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(m.matrixWorld);
    bodies.push(g);
    const e = new EdgesGeometry(m.geometry, angle);
    e.applyMatrix4(m.matrixWorld);
    edges.push(e);
  });
  return { body: mergeGeometries(bodies)!, edges: mergeGeometries(edges)! };
}

/** An armour mesh with its neon edges, from a bake. */
export function neonModel(b: Baked, body: MeshStandardMaterial, edge: LineBasicMaterial): [Mesh, LineSegments] {
  return [new Mesh(b.body, body), new LineSegments(b.edges, edge)];
}
