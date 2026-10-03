import {
  AdditiveBlending, BoxGeometry, Color, Float32BufferAttribute, Group, InstancedBufferAttribute, InstancedMesh,
  LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, Quaternion,
  SphereGeometry, Sprite, SpriteMaterial, Vector3, BufferGeometry, type Material, type Scene, type Texture,
} from 'three';
import { STEP } from '../core/loop';
import type { Boss } from '../sim/bosses';
import {
  ALIEN_TYPES, BEAM_FIRE, BEAM_LEN, JINK_ROLL, type Alien, type AlienKind, type Faction, type Pickup, type Shot, type Web,
} from '../sim/enemies';
import { Kit, metal, seeded, type V3 } from './kit';

// ── the enemy ─────────────────────────────────────────────────────────────
// Built from the same industrial kit as the player's ships, so the whole sky
// is one world: weathered, heavy, lived-in. Each faction has its own metal
// (rust-brown, ochre, verdigris, black, amber crystal) and its own engine
// colour, which is how you read a hull 150 units out: the engines are lit
// bright enough to see long before the hull is.
//
//   scout   · a swept bird: a fuselage, angled wings, wingtip guns
//   raptor  · a long neck and a heavy head on a broad wing
//   stalker · forward-swept wings, a hunter's profile
//   lancer  · the heavy cruiser: a spine, a fan for a head, side hulls,
//             towers and batteries, three engines
//   warbird · a double crescent around a central hull
//   drone   · a cube, every face crusted with machinery, green slits
//   weaver  · a crystal shard with blades
//
// Capital ships are their faction's hull at several times the size.

export const NEON: Record<Faction, Color> = {
  klingon: new Color(3.6, 1.3, 0.25),
  cardassian: new Color(3.4, 2.5, 0.5),
  romulan: new Color(0.5, 3.4, 1.2),
  borg: new Color(0.7, 3.6, 0.6),
  tholian: new Color(3.0, 1.0, 3.4),
};
const FACTION_METAL: Record<Faction, number> = {
  klingon: 0x7a5646,
  cardassian: 0x8f805c,
  romulan: 0x5c7466,
  borg: 0x3b403d,
  tholian: 0x9a7a52,
};
const WEB = new Color(2.2, 0.9, 3.4);
const WHITE = new Color(3.5, 3.5, 3.5);

interface Model { root: Group; engines: V3[]; }

function lamp(c: Color): MeshBasicMaterial {
  return new MeshBasicMaterial({ color: c, toneMapped: false });
}

/** A hull of unit radius, nose +X. */
function build(kind: AlienKind): Model {
  const k = new Kit(), rnd = seeded(kind.length * 31 + kind.charCodeAt(0));
  const engines: V3[] = [];
  const engine = (x: number, y: number, z: number, r: number) => {
    k.cyl('dark', r, r * 1.15, r * 2.2, [x + r, y, z], 'x', 12);
    k.cyl('dark', r * 0.95, r * 1.25, r * 0.6, [x - r * 0.3, y, z], 'x', 12, true);
    engines.push([x - r * 0.5, y, z]);
  };
  switch (kind) {
    case 'scout':
    case 'stalker': {
      const fwd = kind === 'stalker' ? 0.35 : -0.3;
      k.wedge('hull', [[1.0, 0], [0.45, 0.2], [-0.6, 0.22], [-0.7, 0], [-0.6, -0.22], [0.45, -0.2]], 0.28);
      k.box('dark', [0.4, 0.14, 0.22], [0.15, 0.2, 0]);
      for (const s of [-1, 1]) {
        k.wedge('dark', [[0.15, 0.18 * s], [fwd, 1.0 * s], [fwd - 0.32, 1.0 * s], [-0.5, 0.18 * s]], 0.07, [0, -0.04, 0], [s * 0.18, 0, 0]);
        k.cyl('dark', 0.04, 0.05, 0.6, [fwd + 0.05, -0.04 - s * 0.16, s * 0.98], 'x', 6);
        k.box('trim', [0.3, 0.02, 0.12], [fwd - 0.12, 0.0, s * 0.7]);
      }
      k.cyl('dark', 0.12, 0.16, 0.36, [0.85, 0.02, 0], 'x', 8);
      k.greebles('dark', rnd, -0.5, 0.4, -0.15, 0.15, 0.14, 8, 0.1);
      for (const s of [-1, 1]) engine(-0.75, 0, s * 0.16, 0.11);
      break;
    }
    case 'raptor':
      k.box('hull', [0.9, 0.12, 0.16], [0.65, 0.02, 0]);
      k.wedge('hull', [[1.25, 0], [1.05, 0.2], [0.9, 0.2], [0.9, -0.2], [1.05, -0.2]], 0.22);
      k.wedge('hull', [[0.25, 0.14], [-0.4, 0.8], [-0.9, 0.8], [-0.9, -0.8], [-0.4, -0.8], [0.25, -0.14]], 0.2);
      k.box('dark', [0.8, 0.1, 1.5], [-0.55, 0.14, 0]);
      k.greebles('dark', rnd, -0.85, -0.2, -0.7, 0.7, 0.19, 18, 0.1);
      for (const s of [-1, 1]) { k.cyl('dark', 0.05, 0.05, 0.55, [-0.4, -0.05, s * 0.82], 'x', 6); engine(-1.0, 0, s * 0.45, 0.12); }
      break;
    case 'lancer':
      k.wedge('hull', [[1.0, 0.55], [1.18, 0], [1.0, -0.55], [0.6, -0.22], [-1.0, -0.2], [-1.05, 0], [-1.0, 0.2], [0.6, 0.22]], 0.22);
      k.box('hull', [1.5, 0.18, 0.2], [-0.15, 0.2, 0]);
      for (const s of [-1, 1]) {
        k.box('hull', [1.0, 0.2, 0.22], [-0.45, -0.02, s * 0.36]);
        k.box('dark', [0.9, 0.06, 0.26], [-0.45, 0.11, s * 0.36]);
        for (let i = 0; i < 3; i++) k.cyl('dark', 0.025, 0.03, 0.2, [-0.2 - i * 0.25, -0.02, s * 0.52], 'z', 6);
      }
      k.box('hull', [0.22, 0.32, 0.18], [-0.35, 0.42, 0]);
      k.box('dark', [0.28, 0.04, 0.24], [-0.35, 0.6, 0]);
      k.cyl('dark', 0.012, 0.012, 0.3, [-0.4, 0.75, 0], 'y', 5);
      k.box('trim', [0.6, 0.02, 0.5], [0.75, 0.12, 0]);
      k.greebles('dark', rnd, -0.95, 0.5, -0.18, 0.18, 0.29, 22, 0.08);
      for (const z of [-0.36, 0, 0.36]) engine(-1.15, 0, z, 0.1);
      break;
    case 'warbird':
      for (const s of [-1, 1]) {
        k.wedge('hull', [[0.9, 0.05 * s], [0.3, 0.95 * s], [-0.6, 1.05 * s], [-0.2, 0.4 * s], [-0.5, 0.05 * s]], 0.08, [0, s * 0.16, 0]);
        k.box('dark', [0.5, 0.04, 0.3], [0, s * 0.21, s * 0.6]);
      }
      k.wedge('hull', [[1.1, 0], [0.4, 0.16], [-0.6, 0.13], [-0.6, -0.13], [0.4, -0.16]], 0.3);
      k.box('trim', [0.5, 0.02, 0.12], [0.3, 0.16, 0]);
      k.greebles('dark', rnd, -0.5, 0.5, -0.12, 0.12, 0.15, 10, 0.08);
      engine(-0.75, 0, 0, 0.13);
      for (const s of [-1, 1]) engine(-0.65, s * 0.16, s * 0.9, 0.07);
      break;
    case 'drone': {
      k.box('dark', [1.4, 1.4, 1.4], [0, 0, 0]);
      // machinery on every face
      for (const [ax, sgn] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]] as const) {
        for (let i = 0; i < 14; i++) {
          const u = (rnd() - 0.5) * 1.2, v = (rnd() - 0.5) * 1.2, s = 0.08 + rnd() * 0.22, h = 0.04 + rnd() * 0.12;
          const pos: V3 = [0, 0, 0], size: V3 = [s, s, s];
          pos[ax] = sgn * (0.7 + h / 2); size[ax] = h;
          pos[(ax + 1) % 3] = u; pos[(ax + 2) % 3] = v;
          k.box(rnd() < 0.5 ? 'hull' : 'dark', size, pos);
        }
        for (let i = 0; i < 3; i++) {
          const pos: V3 = [0, 0, 0], size: V3 = [0.5, 0.03, 0.03];
          pos[ax] = sgn * 0.71; size[ax] = 0.02;
          pos[(ax + 1) % 3] = (rnd() - 0.5) * 1.0; pos[(ax + 2) % 3] = (rnd() - 0.5) * 1.0;
          if (ax === 1) { size[0] = 0.03; size[2] = 0.5; }
          k.box('lamp', size, pos);
        }
      }
      engines.push([-0.72, 0, 0]);
      break;
    }
    case 'weaver':
      k.crystal('trim', 0.8, [0, 0, 0], [1.5, 0.55, 0.8]);
      for (const s of [-1, 1]) k.wedge('hull', [[0.2, 0], [-0.4, 0.9 * s], [-0.7, 0.8 * s], [-0.3, 0]], 0.06);
      k.crystal('lamp', 0.25, [0.2, 0, 0], [1.6, 0.6, 0.8]);
      engines.push([-0.8, 0, 0]);
      break;
  }
  const faction = ALIEN_TYPES[kind].faction;
  return { root: k.build(factionMaterials(faction)), engines };
}

const factionMats = new Map<Faction, Record<string, Material>>();
function factionMaterials(f: Faction): Record<string, Material> {
  let m = factionMats.get(f);
  if (!m) {
    const tint = FACTION_METAL[f];
    m = {
      hull: metal({ tint, roughness: 0.6, metalness: 0.55, scale: 1.6 }),
      dark: metal({ tint: new Color(tint).multiplyScalar(0.55), roughness: 0.5, metalness: 0.7, scale: 2.2 }),
      trim: f === 'tholian'
        ? new MeshStandardMaterial({ color: 0x5a3a14, emissive: new Color(1.4, 0.7, 0.1), roughness: 0.25, metalness: 0.2 })
        : metal({ tint: 0x6a2220, roughness: 0.65, metalness: 0.35, scale: 2 }),
      lamp: lamp(NEON[f].clone().multiplyScalar(0.9)),
    };
    factionMats.set(f, m);
  }
  return m;
}

const FLASH = new MeshStandardMaterial({ color: 0x444444, emissive: new Color(3, 2.6, 2.2) });

class HullView {
  readonly root = new Group();
  readonly body = new Group();
  readonly meshes: Mesh[];
  readonly mats: Material[];
  readonly glows: Sprite[] = [];
  constructor(readonly kind: AlienKind, model: Model, glowTex: Texture, c: Color) {
    const copy = model.root.clone();
    this.meshes = copy.children as Mesh[];
    this.mats = this.meshes.map((m) => m.material as Material);
    this.body.add(copy);
    for (const e of model.engines) {
      const g = new Sprite(new SpriteMaterial({ map: glowTex, color: c.clone().multiplyScalar(0.55), blending: AdditiveBlending, depthWrite: false }));
      g.position.set(...e);
      g.scale.setScalar(0.8);
      this.glows.push(g);
      this.body.add(g);
    }
    this.root.add(this.body);
  }

  flash(on: boolean): void {
    this.meshes.forEach((m, i) => { m.material = on ? FLASH : this.mats[i]!; });
  }
}

const MAX_SHOTS = 400;
const X = new Vector3(1, 0, 0);

export class EnemyView {
  private readonly models = new Map<AlienKind, Model>();
  private readonly pools = new Map<AlienKind, HullView[]>();
  private readonly live = new Map<number, HullView>();
  private readonly shots: InstancedMesh;
  private readonly shotGlow: InstancedMesh;
  private readonly beams: Mesh[] = [];
  private readonly webs: LineSegments[] = [];
  private readonly picks: Group[] = [];
  private bossView: { id: number; root: Group; hull: HullView; mats: Material[] } | null = null;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3();
  private readonly d = new Vector3();
  private readonly c = new Color();
  private time = 0;
  /** The camera's position, for distance-aware glow sizes. */
  readonly eye = new Vector3();

  constructor(private readonly scene: Scene, private readonly glowTex: Texture) {
    for (const k of Object.keys(ALIEN_TYPES) as AlienKind[]) {
      this.models.set(k, build(k));
      this.pools.set(k, []);
    }
    // enemy fire: a hot slug in a glow of its faction's colour, stretched along its flight
    this.shots = new InstancedMesh(new SphereGeometry(1, 10, 8), new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), MAX_SHOTS);
    this.shotGlow = new InstancedMesh(new SphereGeometry(1, 10, 8),
      new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, blending: AdditiveBlending, depthWrite: false, toneMapped: false }), MAX_SHOTS);
    for (const im of [this.shots, this.shotGlow]) {
      im.instanceColor = new InstancedBufferAttribute(new Float32Array(MAX_SHOTS * 3), 3);
      im.count = 0;
      im.frustumCulled = false;
      scene.add(im);
    }
    for (let i = 0; i < 8; i++) {
      const b = new Mesh(new BoxGeometry(1, 1, 1).translate(0.5, 0, 0), new MeshBasicMaterial({ color: NEON.borg.clone(), transparent: true, blending: AdditiveBlending, depthWrite: false }));
      b.visible = false;
      scene.add(b);
      this.beams.push(b);
    }
    const webGeo = webGeometry();
    for (let i = 0; i < 12; i++) {
      const w = new LineSegments(webGeo, new LineBasicMaterial({ color: WEB.clone(), transparent: true, toneMapped: false }));
      w.visible = false;
      scene.add(w);
      this.webs.push(w);
    }
    for (let i = 0; i < 8; i++) {
      const g = new Group();
      const crystal = new Mesh(new OctahedronGeometry(0.5, 0), new MeshBasicMaterial({ color: new Color(3, 2.6, 1.6), toneMapped: false }));
      const halo = new Sprite(new SpriteMaterial({ map: glowTex, color: new Color(2, 1.4, 0.6), blending: AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(2.4);
      g.add(crystal, halo);
      g.visible = false;
      scene.add(g);
      this.picks.push(g);
    }
  }

  private take(kind: AlienKind): HullView {
    const pool = this.pools.get(kind)!;
    const v = pool.pop() ?? new HullView(kind, this.models.get(kind)!, this.glowTex, NEON[ALIEN_TYPES[kind].faction]);
    this.scene.add(v.root);
    return v;
  }

  update(aliens: readonly Alien[], boss: Boss | null, shots: readonly Shot[], webs: readonly Web[], picks: readonly Pickup[], alpha: number, dt: number): void {
    this.time += dt;
    const back = (1 - alpha) * STEP;

    // hulls: pooled per kind, keyed by id
    const seen = new Set<number>();
    for (const al of aliens) {
      seen.add(al.id);
      let v = this.live.get(al.id);
      if (!v) { v = this.take(al.kind); this.live.set(al.id, v); }
      v.root.position.set(al.x - al.vx * back, al.y - al.vy * back, al.z - al.vz * back);
      v.root.scale.setScalar(al.r);
      if (al.kind === 'drone') {
        v.body.rotation.set(0, this.time * 0.4 + al.id, 0);
      } else {
        // yaw, then pitch with the climb, then bank (and a jink's barrel roll)
        const hs = Math.hypot(al.vx, al.vz);
        const pitch = Math.atan2(al.vy, Math.max(4, hs)) * 0.8;
        const roll = al.roll >= 0 ? al.rollDir * Math.PI * 2 * smooth(al.roll / JINK_ROLL) : 0;
        v.body.rotation.set(al.bank + roll + Math.sin(this.time * 1.7 + al.id) * 0.04, al.face, pitch, 'YZX');
      }
      v.flash(al.hitT > 0);
      const burn = 0.9 + Math.min(1, Math.hypot(al.vx, al.vy, al.vz) / 30) * 0.9;
      // engines read from far off: the glow keeps a minimum size on screen as the hull shrinks with distance
      const far = Math.max(1, Math.hypot(v.root.position.x - this.eye.x, v.root.position.y - this.eye.y, v.root.position.z - this.eye.z) / 40);
      for (const g of v.glows) g.scale.setScalar((0.45 + 0.3 * burn) * Math.sqrt(far) * (1 + Math.sin(this.time * 31 + al.id) * 0.06));
    }
    for (const [id, v] of this.live) {
      if (seen.has(id)) continue;
      v.root.removeFromParent();
      this.pools.get(v.kind)!.push(v);
      this.live.delete(id);
    }

    // the capital ship
    if (boss && (!this.bossView || this.bossView.id !== boss.id)) this.makeBoss(boss);
    if (!boss && this.bossView) { this.bossView.root.removeFromParent(); this.bossView = null; }
    if (boss && this.bossView) {
      const bv = this.bossView;
      bv.root.position.set(boss.x - boss.vx * back, boss.y - boss.vy * back, boss.z - boss.vz * back);
      const pitch = boss.arriving ? Math.atan2(boss.vy, Math.max(6, Math.hypot(boss.vx, boss.vz))) * 0.5 : 0;
      bv.hull.body.rotation.set(Math.sin(this.time * 0.6) * 0.03, boss.face, pitch, 'YZX');
      if (boss.faction === 'borg') bv.hull.body.rotation.y = this.time * 0.15;
      const vis = 1 - boss.cloak * 0.92;
      for (const m of bv.mats) { m.opacity = vis; m.transparent = vis < 1; }
      for (const g of bv.hull.glows) g.visible = boss.cloak < 0.6;
      bv.hull.flash(boss.hitT > 0);
    }

    // enemy fire
    let n = 0;
    for (const b of shots) {
      if (n >= MAX_SHOTS) break;
      const r = b.hp > 0 ? b.r * (1.1 + Math.sin(this.time * 14 + b.id) * 0.15) : b.r;
      this.q.setFromUnitVectors(X, this.d.set(b.vx, b.vy, b.vz).normalize());
      this.p.set(b.x - b.vx * back, b.y - b.vy * back + 0.1, b.z - b.vz * back);
      this.m.compose(this.p, this.q, this.s.set(r * (b.hp > 0 ? 1.1 : 1.9), r * 0.42, r * 0.42));
      this.shots.setMatrixAt(n, this.m);
      this.c.copy(NEON[b.faction]).lerp(WHITE, 0.12);
      this.shots.setColorAt(n, this.c);
      this.m.compose(this.p, this.q, this.s.set(r * (b.hp > 0 ? 2.2 : 2.8), r * 1.1, r * 1.1));
      this.shotGlow.setMatrixAt(n, this.m);
      this.shotGlow.setColorAt(n, this.c.copy(NEON[b.faction]).multiplyScalar(0.5));
      n++;
    }
    for (const im of [this.shots, this.shotGlow]) {
      im.count = n;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }

    // beams: a thin telegraph while winding up, then the cut
    const bms = [
      ...aliens.filter((a) => a.beamT > 0).map((a) => ({ x: a.x, y: a.y, z: a.z, beamT: a.beamT, beamAng: a.beamAng })),
      ...(boss?.beams.filter((b) => b.beamT > 0).map((b) => ({ ...b, y: boss.y })) ?? []),
    ];
    this.beams.forEach((mesh, i) => {
      const b = bms[i];
      mesh.visible = !!b;
      if (!b) return;
      const live = b.beamT <= BEAM_FIRE;
      const w = live ? 0.55 + Math.sin(this.time * 40) * 0.08 : 0.08;
      mesh.position.set(b.x, b.y + 0.2, b.z);
      mesh.rotation.set(0, b.beamAng, 0);
      mesh.scale.set(BEAM_LEN, w, w);
      (mesh.material as MeshBasicMaterial).opacity = live ? 1 : 0.45;
    });

    // webs
    this.webs.forEach((mesh, i) => {
      const w = webs[i];
      mesh.visible = !!w && w.r > 0.1;
      if (!w) return;
      mesh.position.set(w.x, 0.05, w.z);
      mesh.scale.setScalar(w.r);
      mesh.rotation.y = this.time * 0.3 + w.id;
      (mesh.material as LineBasicMaterial).opacity = Math.min(1, w.life);
    });

    // hull repairs
    this.picks.forEach((g, i) => {
      const p = picks[i];
      g.visible = !!p;
      if (!p) return;
      g.position.set(p.x, 0.4 + Math.sin(this.time * 3 + p.id) * 0.15, p.z);
      g.children[0]!.rotation.y = this.time * 2;
      g.visible = p.life > 2 || Math.sin(this.time * 20) > 0;
    });
  }

  private makeBoss(b: Boss): void {
    this.bossView?.root.removeFromParent();
    const kind = { klingon: 'raptor', cardassian: 'lancer', romulan: 'warbird', borg: 'drone', tholian: 'weaver' }[b.faction] as AlienKind;
    const model = this.models.get(kind)!;
    // its own materials, so the cloak can fade them
    const own: Model = { root: model.root.clone(), engines: model.engines };
    const mats: Material[] = [];
    for (const m of own.root.children as Mesh[]) { m.material = (m.material as Material).clone(); mats.push(m.material); }
    const hull = new HullView(kind, own, this.glowTex, NEON[b.faction]);
    hull.root.scale.setScalar(b.r * 0.85);
    for (const g of hull.glows) g.scale.setScalar(0.9);
    const root = new Group();
    root.add(hull.root);
    this.scene.add(root);
    this.bossView = { id: b.id, root, hull, mats };
  }
}

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

/** A Tholian web of unit radius: three rings and eight spokes. */
function webGeometry(): BufferGeometry {
  const pts: number[] = [];
  for (const r of [0.35, 0.68, 1]) {
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
      pts.push(Math.cos(a0) * r, 0, Math.sin(a0) * r, Math.cos(a1) * r, 0, Math.sin(a1) * r);
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pts.push(0, 0, 0, Math.cos(a), 0, Math.sin(a));
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return g;
}
