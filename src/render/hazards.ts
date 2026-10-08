import {
  AdditiveBlending, Color, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, RingGeometry,
  SphereGeometry, Sprite, SpriteMaterial, TorusGeometry, type Material, type Object3D, type Scene, type Texture,
} from 'three';
import type { Strike, Telegraph } from '../sim/bosses';
import type { Encounter } from '../sim/encounters';
import { NEON } from './enemies';

// ── warnings and set pieces ───────────────────────────────────────────────
// Everything that tells the player where something is about to happen is
// drawn flat on the play plane, where the ship is: a capital ship's lines
// (a charge, a volley) and rings (a nova), and the circles where shells,
// lightning or webs will land, filling as the moment comes. Faction colour
// for a capital ship's tells, amber for shells, blue-white for lightning,
// violet for webs.
//
// And the sector events' props: the distress beacon (a pillar of light in a
// circle you hold), the derelict (a dark broken hull that tumbles), and the
// anomaly (a black core in turning rings).

const MAX_TELE = 24;
const MAX_STRIKES = 24;
const STRIKE_COLOR: Record<Strike['kind'], Color> = {
  blast: new Color(2.6, 0.9, 0.3),
  lightning: new Color(1.6, 2.2, 3.4),
  web: new Color(1.8, 0.8, 2.8),
};
const AMBER = new Color(2.8, 1.7, 0.4);

const additive = (opacity = 1) => new MeshBasicMaterial({
  color: 0xffffff, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide,
});

interface Mark { root: Group; track: Mesh; fill: Mesh; ring: Mesh; disc: Mesh; edge: Mesh; }

export class HazardView {
  private readonly marks: Mark[] = [];
  private readonly strikes: Mark[] = [];
  private readonly beacon: Group;
  private readonly zone: Mesh;
  private readonly zoneFill: Mesh;
  private readonly well: Group;
  private readonly wellRings: Mesh[] = [];
  private wreck: Object3D | null = null;
  private time = 0;

  constructor(private readonly scene: Scene, glow: Texture, private readonly makeWreck: () => Object3D) {
    const line = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0);
    const ring = new RingGeometry(0.93, 1, 56).rotateX(-Math.PI / 2);
    const disc = new RingGeometry(0, 1, 40).rotateX(-Math.PI / 2);
    const edge = new RingGeometry(0.96, 1, 56).rotateX(-Math.PI / 2);
    const make = (list: Mark[], n: number) => {
      for (let i = 0; i < n; i++) {
        const root = new Group();
        const m: Mark = { root, track: new Mesh(line, additive(0.22)), fill: new Mesh(line, additive(0.5)), ring: new Mesh(ring, additive(0.8)), disc: new Mesh(disc, additive(0.28)), edge: new Mesh(edge, additive(0.9)) };
        root.add(m.track, m.fill, m.ring, m.disc, m.edge);
        root.visible = false;
        scene.add(root);
        list.push(m);
      }
    };
    make(this.marks, MAX_TELE);
    make(this.strikes, MAX_STRIKES);

    // the distress beacon: a pillar of light in the circle to hold
    this.beacon = new Group();
    const pillar = new Mesh(new CylinderGeometry(0.18, 0.5, 40, 12, 1, true).translate(0, 20, 0), additive(0.5));
    (pillar.material as MeshBasicMaterial).color.copy(AMBER);
    const top = new Sprite(new SpriteMaterial({ map: glow, color: AMBER, blending: AdditiveBlending, depthWrite: false }));
    top.position.y = 1.5;
    top.scale.setScalar(5);
    this.beacon.add(pillar, top);
    this.beacon.visible = false;
    this.zone = new Mesh(ring, additive(0.9));
    (this.zone.material as MeshBasicMaterial).color.copy(AMBER);
    this.zoneFill = new Mesh(disc, additive(0.12));
    (this.zoneFill.material as MeshBasicMaterial).color.copy(AMBER);
    this.zone.visible = this.zoneFill.visible = false;
    scene.add(this.beacon, this.zone, this.zoneFill);

    // the anomaly: a black core in turning rings
    this.well = new Group();
    const core = new Mesh(new SphereGeometry(1, 24, 16), new MeshBasicMaterial({ color: 0x000000 }));
    core.scale.setScalar(2.6);
    const rim = new Sprite(new SpriteMaterial({ map: glow, color: new Color(1.6, 0.7, 3), blending: AdditiveBlending, depthWrite: false }));
    rim.scale.setScalar(11);
    this.well.add(rim, core);
    for (let i = 0; i < 4; i++) {
      const r = new Mesh(new TorusGeometry(4 + i * 5, 0.08 + i * 0.03, 6, 64), additive(0.7 - i * 0.12));
      (r.material as MeshBasicMaterial).color.setRGB(1.2 + i * 0.3, 0.5, 2.6 - i * 0.3);
      r.rotation.x = Math.PI / 2;
      this.well.add(r);
      this.wellRings.push(r);
    }
    this.well.visible = false;
    scene.add(this.well);
  }

  /** One beat for every warning: slow and shallow at first, quicker as the moment comes, never a strobe. */
  private pulse(prog: number): number {
    return 0.8 + 0.2 * Math.sin(this.time * (8 + prog * 12));
  }

  update(tele: readonly Telegraph[], strikes: readonly Strike[], e: Encounter | null, dt: number): void {
    this.time += dt;
    // a capital ship's tells
    this.marks.forEach((m, i) => {
      const t = tele[i];
      m.root.visible = !!t;
      if (!t) return;
      const prog = 1 - t.t / Math.max(0.01, t.total);
      const col = NEON[t.faction];
      const pulse = this.pulse(prog);
      m.root.position.set(t.x, 0.06, t.z);
      m.root.rotation.y = t.ang;
      const isLine = t.kind === 'line';
      m.track.visible = m.fill.visible = isLine;
      m.ring.visible = m.disc.visible = m.edge.visible = !isLine;
      if (isLine) {
        const w = t.len > 40 ? 1.2 : 0.8;
        m.track.scale.set(t.len, 1, w);
        m.fill.scale.set(t.len * prog, 1, w * 0.5);
        tint(m.track, col, 0.35 * pulse);
        tint(m.fill, col, 0.6);
      } else {
        m.ring.scale.setScalar(t.r);
        m.disc.scale.setScalar(t.r * prog);
        tint(m.ring, col, 0.6 * pulse);
        tint(m.disc, col, 0.18);
        m.edge.scale.setScalar(Math.max(0.01, t.r * prog));
        tint(m.edge, col, 0.9);
      }
    });
    // landing circles
    this.strikes.forEach((m, i) => {
      const k = strikes[i];
      m.root.visible = !!k;
      if (!k) return;
      const prog = 1 - k.t / Math.max(0.01, k.total);
      const col = STRIKE_COLOR[k.kind];
      m.root.position.set(k.x, 0.07, k.z);
      m.track.visible = m.fill.visible = false;
      m.ring.visible = m.disc.visible = m.edge.visible = true;
      m.ring.scale.setScalar(k.r);
      m.disc.scale.setScalar(k.r * prog);
      m.edge.scale.setScalar(Math.max(0.01, k.r * prog));
      tint(m.ring, col, (0.5 + 0.5 * prog) * this.pulse(prog));
      tint(m.disc, col, 0.12 + 0.2 * prog);
      tint(m.edge, col, 0.9);
    });

    // the events' props
    const live = e && !e.done ? e : null;
    const beacon = live?.id === 'distress';
    this.beacon.visible = this.zone.visible = this.zoneFill.visible = beacon || live?.id === 'derelict';
    if (live && (beacon || live.id === 'derelict')) {
      this.beacon.visible = beacon;
      this.beacon.position.set(live.x, 0, live.z);
      (this.beacon.children[1] as Sprite).scale.setScalar(4 + Math.sin(this.time * 5) * 1.2);
      this.zone.position.set(live.x, 0.08, live.z);
      this.zone.scale.setScalar(live.r);
      this.zoneFill.position.set(live.x, 0.07, live.z);
      this.zoneFill.scale.setScalar(Math.max(0.01, live.r * live.progress));
    }
    if (live?.id === 'derelict' && live.progress < 1) {
      if (!this.wreck) { this.wreck = this.makeWreck(); this.scene.add(this.wreck); }
      this.wreck.visible = true;
      this.wreck.position.set(live.x, 0.6, live.z);
      this.wreck.rotation.set(0.5 + this.time * 0.07, this.time * 0.11, 0.3);
    } else if (this.wreck) this.wreck.visible = false;
    this.well.visible = live?.id === 'anomaly';
    if (live?.id === 'anomaly') {
      this.well.position.set(live.x, 0.5, live.z);
      this.wellRings.forEach((r, i) => { r.rotation.z = this.time * (0.8 - i * 0.15) * (i % 2 ? -1 : 1); r.rotation.x = Math.PI / 2 + Math.sin(this.time * 0.4 + i) * 0.12; });
    }
  }
}

function tint(m: Mesh, c: Color, k: number): void {
  const mat = m.material as Material & { color: Color };
  mat.color.copy(c).multiplyScalar(k);
}
