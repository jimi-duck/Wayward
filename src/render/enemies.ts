import {
  AdditiveBlending, BoxGeometry, BufferGeometry, Color, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Group,
  InstancedBufferAttribute, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, OctahedronGeometry, Quaternion, Shape, SphereGeometry, Sprite, SpriteMaterial, TorusGeometry,
  Vector2, Vector3, type Scene, type Texture,
} from 'three';
import { STEP } from '../core/loop';
import type { Boss } from '../sim/bosses';
import {
  ALIEN_TYPES, BEAM_FIRE, BEAM_LEN, type Alien, type AlienKind, type Faction, type Pickup, type Shot, type Web,
} from '../sim/enemies';
import { armour, bake, neonLine, type Baked } from './neon';

// ── the enemy ─────────────────────────────────────────────────────────────
// Every hostile hull is dark matte armour traced in its faction's neon, and
// every faction is warm or green, never the player's cyan. Silhouettes follow
// the roster: the scout a swept bird, the raptor a long-necked runner, the
// lancer a spine with a fan for a head, the warbird a double crescent, the
// stalker a forward-swept bird, the drone a lit cube, the weaver a crystal
// shard. Capital ships are their faction's hull at 2.6×, with a turning ring.

export const NEON: Record<Faction, Color> = {
  klingon: new Color(3.4, 0.7, 0.35),
  cardassian: new Color(3.2, 1.7, 0.3),
  romulan: new Color(0.45, 3.2, 1.3),
  borg: new Color(0.6, 3.4, 0.5),
  tholian: new Color(3.4, 1.5, 0.3),
};
const WEB = new Color(2.2, 0.9, 3.4);

function slab(points: Array<[number, number]>, height: number): BufferGeometry {
  const g = new ExtrudeGeometry(new Shape(points.map(([x, y]) => new Vector2(x, y))),
    { depth: height, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -height / 2, 0);
  return g;
}

/** An outline flipped to the other side of the centreline. */
const mirror = (pts: Array<[number, number]>, s: number): Array<[number, number]> => pts.map(([x, y]) => [x, y * s]);

/** Hull shapes, nose +X, sized to a radius of about 1 (scaled by the hull's r). */
function shape(kind: AlienKind): Group {
  const g = new Group();
  const m = armour();
  const add = (geo: BufferGeometry, x = 0, y = 0, z = 0, rx = 0, rz = 0) => {
    const mesh = new Mesh(geo, m); mesh.position.set(x, y, z); mesh.rotation.x = rx; mesh.rotation.z = rz; g.add(mesh); return mesh;
  };
  switch (kind) {
    case 'scout':
    case 'stalker': {
      const fwd = kind === 'stalker' ? 0.35 : -0.25;
      add(slab([[1, 0], [0.2, 0.22], [-0.6, 0.18], [-0.6, -0.18], [0.2, -0.22]], 0.26));
      for (const s of [-1, 1]) add(slab(mirror([[0.1, 0], [fwd, 1.0], [fwd - 0.3, 1.0], [-0.45, 0.15]], s), 0.08), 0, -0.04, 0, s * 0.18);
      add(new CylinderGeometry(0.16, 0.22, 0.5, 6), 0.75, 0.02, 0, 0, Math.PI / 2);
      break;
    }
    case 'raptor':
      add(slab([[1.1, 0], [0.7, 0.12], [-0.2, 0.12], [-0.4, 0.75], [-0.9, 0.75], [-0.9, -0.75], [-0.4, -0.75], [-0.2, -0.12], [0.7, -0.12]], 0.22));
      add(new BoxGeometry(0.3, 0.18, 0.34), 1.05, 0.04, 0);
      break;
    case 'lancer':
      add(slab([[1, 0.55], [1.15, 0], [1, -0.55], [0.55, -0.2], [-1, -0.16], [-1, 0.16], [0.55, 0.2]], 0.2));
      add(new BoxGeometry(1.3, 0.16, 0.14), -0.2, 0.16, 0);
      break;
    case 'warbird':
      for (const s of [-1, 1]) add(slab(mirror([[0.9, 0.05], [0.3, 0.95], [-0.6, 1.05], [-0.2, 0.4], [-0.5, 0.05]], s), 0.1), 0, s * 0.12, 0);
      add(slab([[1.1, 0], [0.4, 0.16], [-0.6, 0.12], [-0.6, -0.12], [0.4, -0.16]], 0.3));
      break;
    case 'drone':
      add(new BoxGeometry(1.4, 1.4, 1.4));
      add(new BoxGeometry(0.5, 1.5, 0.5), 0.5, 0, 0.5);
      add(new BoxGeometry(0.5, 1.5, 0.5), -0.5, 0, -0.5);
      break;
    case 'weaver': {
      const o = add(new OctahedronGeometry(0.8, 0));
      o.scale.set(1.5, 0.55, 0.8);
      add(slab([[0.2, 0], [-0.4, 0.9], [-0.7, 0.8], [-0.3, 0]], 0.06));
      add(slab([[0.2, 0], [-0.4, -0.9], [-0.7, -0.8], [-0.3, 0]], 0.06));
      break;
    }
  }
  return g;
}

interface Kit { baked: Baked; edge: LineBasicMaterial; body: MeshStandardMaterial; flash: MeshStandardMaterial; }

class HullView {
  readonly root = new Group();
  readonly body: Mesh;
  readonly edges: LineSegments;
  readonly glow: Sprite;
  constructor(readonly kit: Kit, glowTex: Texture, c: Color) {
    this.body = new Mesh(kit.baked.body, kit.body);
    this.edges = new LineSegments(kit.baked.edges, kit.edge);
    this.glow = new Sprite(new SpriteMaterial({ map: glowTex, color: c.clone().multiplyScalar(0.6), blending: AdditiveBlending, depthWrite: false }));
    this.glow.position.set(-0.9, 0, 0);
    this.glow.scale.setScalar(1.3);
    this.root.add(this.body, this.edges, this.glow);
  }
}

export class EnemyView {
  private readonly kits = new Map<AlienKind, Kit>();
  private readonly pools = new Map<AlienKind, HullView[]>();
  private readonly live = new Map<number, HullView>();
  private readonly shots: InstancedMesh;
  private readonly beams: Mesh[] = [];
  private readonly webs: LineSegments[] = [];
  private readonly picks: Group[] = [];
  private bossView: { id: number; root: Group; hull: HullView; ring: Mesh; mats: MeshStandardMaterial[] } | null = null;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3();
  private readonly c = new Color();
  private time = 0;

  constructor(private readonly scene: Scene, private readonly glowTex: Texture) {
    for (const k of Object.keys(ALIEN_TYPES) as AlienKind[]) {
      const c = NEON[ALIEN_TYPES[k].faction];
      this.kits.set(k, {
        baked: bake(shape(k)), edge: neonLine(c), body: armour(),
        flash: new MeshStandardMaterial({ color: 0x222222, emissive: new Color(2.4, 2.4, 2.4) }),
      });
      this.pools.set(k, []);
    }
    this.shots = new InstancedMesh(new SphereGeometry(1, 10, 8), new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 400);
    this.shots.instanceColor = new InstancedBufferAttribute(new Float32Array(400 * 3), 3);
    this.shots.count = 0;
    this.shots.frustumCulled = false;
    scene.add(this.shots);
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
      const crystal = new Mesh(new OctahedronGeometry(0.55, 0), new MeshBasicMaterial({ color: new Color(0.6, 3, 3.4), toneMapped: false }));
      const halo = new Sprite(new SpriteMaterial({ map: glowTex, color: new Color(0.3, 1.6, 2), blending: AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(2.4);
      g.add(crystal, halo);
      g.visible = false;
      scene.add(g);
      this.picks.push(g);
    }
  }

  private take(kind: AlienKind): HullView {
    const pool = this.pools.get(kind)!;
    const v = pool.pop() ?? new HullView(this.kits.get(kind)!, this.glowTex, NEON[ALIEN_TYPES[kind].faction]);
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
      v.root.position.set(al.x - al.vx * back, 0.2, al.z - al.vz * back);
      v.root.rotation.set(0, al.face, al.kind === 'drone' ? 0 : Math.sin(this.time * 2 + al.id) * 0.12);
      if (al.kind === 'drone') v.root.rotation.y = this.time * 0.4 + al.id;
      v.root.scale.setScalar(al.r);
      v.body.material = al.hitT > 0 ? v.kit.flash : v.kit.body;
    }
    for (const [id, v] of this.live) {
      if (seen.has(id)) continue;
      v.root.removeFromParent();
      this.pools.get(this.kindOf(v))!.push(v);
      this.live.delete(id);
    }

    // the capital ship
    if (boss && (!this.bossView || this.bossView.id !== boss.id)) this.makeBoss(boss);
    if (!boss && this.bossView) { this.bossView.root.removeFromParent(); this.bossView = null; }
    if (boss && this.bossView) {
      const bv = this.bossView;
      bv.root.position.set(boss.x - boss.vx * back, 0.4, boss.z - boss.vz * back);
      bv.root.rotation.y = boss.face;
      bv.ring.rotation.z = this.time * 0.8;
      const vis = 1 - boss.cloak * 0.9;
      for (const m of bv.mats) { m.opacity = vis; m.transparent = vis < 1; }
      bv.hull.edges.visible = boss.cloak < 0.6;
      bv.hull.body.material = boss.hitT > 0 ? bv.hull.kit.flash : bv.mats[0]!;
    }

    // enemy fire: faction-coloured spheres; plasma bigger and pulsing
    let n = 0;
    for (const b of shots) {
      if (n >= 400) break;
      const r = b.hp > 0 ? b.r * (1.1 + Math.sin(this.time * 14 + b.id) * 0.15) : b.r;
      this.m.compose(this.p.set(b.x - b.vx * back, 0.15, b.z - b.vz * back), this.q.identity(), this.s.set(r, r, r));
      this.shots.setMatrixAt(n, this.m);
      this.shots.setColorAt(n, this.c.copy(NEON[b.faction]).multiplyScalar(b.hp > 0 ? 1.2 : 1));
      n++;
    }
    this.shots.count = n;
    this.shots.instanceMatrix.needsUpdate = true;
    if (this.shots.instanceColor) this.shots.instanceColor.needsUpdate = true;

    // beams: a thin telegraph while winding up, then the cut
    const bms = [...aliens.filter((a) => a.beamT > 0), ...(boss?.beams.filter((b) => b.beamT > 0) ?? [])];
    this.beams.forEach((mesh, i) => {
      const b = bms[i];
      mesh.visible = !!b;
      if (!b) return;
      const live = b.beamT <= BEAM_FIRE;
      const w = live ? 0.55 + Math.sin(this.time * 40) * 0.08 : 0.08;
      mesh.position.set(b.x, 0.2, b.z);
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

  private kindOf(v: HullView): AlienKind {
    for (const [k, kit] of this.kits) if (kit === v.kit) return k;
    return 'scout';
  }

  private makeBoss(b: Boss): void {
    this.bossView?.root.removeFromParent();
    const kind = { klingon: 'raptor', cardassian: 'lancer', romulan: 'warbird', borg: 'drone', tholian: 'weaver' }[b.faction] as AlienKind;
    const kit = this.kits.get(kind)!;
    const hull = new HullView({ ...kit, body: kit.body.clone() }, this.glowTex, NEON[b.faction]);
    hull.root.scale.setScalar(b.r * 0.62);
    const ring = new Mesh(new TorusGeometry(b.r * 0.95, 0.06, 6, 48), new MeshBasicMaterial({ color: NEON[b.faction].clone().multiplyScalar(0.8), toneMapped: false }));
    ring.rotation.x = Math.PI / 2;
    const root = new Group();
    root.add(hull.root, ring);
    this.scene.add(root);
    this.bossView = { id: b.id, root, hull, ring, mats: [hull.body.material as MeshStandardMaterial] };
  }
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
