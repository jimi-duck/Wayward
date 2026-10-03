import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, Points, Quaternion, RingGeometry, ShaderMaterial, Sprite, SpriteMaterial, TetrahedronGeometry,
  Vector3, type Scene, type Texture,
} from 'three';

// ── effects ───────────────────────────────────────────────────────────────
// The original's language of impact, in 3D: a flash (bloom), a shockwave,
// sparks, and debris. Pools throughout, so nothing is allocated mid-fight.
// Colours are given in HDR (components above 1) so they bloom.

const MAX_SPARKS = 1400;

/** Sparks and embers: one Points draw, additive, sized in world units. */
class Sparks {
  readonly points: Points;
  private readonly pos = new Float32Array(MAX_SPARKS * 3);
  private readonly col = new Float32Array(MAX_SPARKS * 3);
  private readonly size = new Float32Array(MAX_SPARKS);
  private readonly vel = new Float32Array(MAX_SPARKS * 3);
  private readonly life = new Float32Array(MAX_SPARKS);
  private readonly decay = new Float32Array(MAX_SPARKS);
  private readonly base = new Float32Array(MAX_SPARKS * 4); // r g b size at birth
  private readonly drag = new Float32Array(MAX_SPARKS);
  private next = 0;

  constructor() {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(this.pos, 3));
    g.setAttribute('color', new BufferAttribute(this.col, 3));
    g.setAttribute('size', new BufferAttribute(this.size, 1));
    const mat = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uScale: { value: 400 } },
      vertexShader: /* glsl */ `
        attribute float size; attribute vec3 color; varying vec3 vCol; uniform float uScale;
        void main() {
          vCol = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vCol * a, a);
        }`,
    });
    this.points = new Points(g, mat);
    this.points.frustumCulled = false;
  }

  setScale(px: number): void {
    (this.points.material as ShaderMaterial).uniforms.uScale!.value = px;
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, c: Color, size: number, life: number, drag = 0.9): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX_SPARKS;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.base.set([c.r, c.g, c.b, size], i * 4);
    this.life[i] = 1;
    this.decay[i] = 1 / life;
    this.drag[i] = drag;
  }

  update(dt: number): void {
    for (let i = 0; i < MAX_SPARKS; i++) {
      if (this.life[i]! <= 0) { this.size[i] = 0; continue; }
      const l = (this.life[i] = this.life[i]! - this.decay[i]! * dt);
      const d = Math.pow(this.drag[i]!, dt * 60);
      this.vel[i * 3]! *= d; this.vel[i * 3 + 1]! *= d; this.vel[i * 3 + 2]! *= d;
      this.pos[i * 3] = this.pos[i * 3]! + this.vel[i * 3]! * dt;
      this.pos[i * 3 + 1] = this.pos[i * 3 + 1]! + this.vel[i * 3 + 1]! * dt;
      this.pos[i * 3 + 2] = this.pos[i * 3 + 2]! + this.vel[i * 3 + 2]! * dt;
      const k = Math.max(0, l);
      this.col[i * 3] = this.base[i * 4]! * k;
      this.col[i * 3 + 1] = this.base[i * 4 + 1]! * k;
      this.col[i * 3 + 2] = this.base[i * 4 + 2]! * k;
      this.size[i] = this.base[i * 4 + 3]! * (0.4 + 0.6 * k);
    }
    const g = this.points.geometry;
    g.attributes.position!.needsUpdate = true;
    g.attributes.color!.needsUpdate = true;
    g.attributes.size!.needsUpdate = true;
  }
}

const MAX_DEBRIS = 160;

/** Rock fragments: tumbling, lit chunks that shrink away. */
class Debris {
  readonly mesh: InstancedMesh;
  private readonly p = new Float32Array(MAX_DEBRIS * 3);
  private readonly v = new Float32Array(MAX_DEBRIS * 3);
  private readonly a = new Float32Array(MAX_DEBRIS * 4); // axis + angle
  private readonly s = new Float32Array(MAX_DEBRIS * 2); // size, spin
  private readonly life = new Float32Array(MAX_DEBRIS);
  private next = 0;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly ax = new Vector3();
  private readonly pv = new Vector3();
  private readonly sv = new Vector3();

  constructor(rockMap: Texture) {
    this.mesh = new InstancedMesh(new TetrahedronGeometry(1, 0),
      new MeshStandardMaterial({ map: rockMap, color: 0x8a8090, roughness: 0.9, flatShading: true, emissive: new Color(0.35, 0.12, 0.5) }), MAX_DEBRIS);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < MAX_DEBRIS; i++) this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
  }

  emit(x: number, z: number, vx: number, vz: number, size: number): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX_DEBRIS;
    this.p.set([x, -0.2, z], i * 3);
    this.v.set([vx, (Math.random() - 0.3) * 4, vz], i * 3);
    const ax = Math.random() - 0.5, ay = Math.random() - 0.5, az = Math.random() - 0.5, n = Math.hypot(ax, ay, az) || 1;
    this.a.set([ax / n, ay / n, az / n, Math.random() * 6], i * 4);
    this.s.set([size, (Math.random() - 0.5) * 12], i * 2);
    this.life[i] = 1;
  }

  update(dt: number): void {
    for (let i = 0; i < MAX_DEBRIS; i++) {
      if (this.life[i]! <= 0) continue;
      const l = (this.life[i] = this.life[i]! - dt * 0.7);
      if (l <= 0) { this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0)); continue; }
      const d = Math.pow(0.97, dt * 60);
      for (let k = 0; k < 3; k++) { this.v[i * 3 + k]! *= d; this.p[i * 3 + k] = this.p[i * 3 + k]! + this.v[i * 3 + k]! * dt; }
      this.a[i * 4 + 3] = this.a[i * 4 + 3]! + this.s[i * 2 + 1]! * dt;
      this.q.setFromAxisAngle(this.ax.set(this.a[i * 4]!, this.a[i * 4 + 1]!, this.a[i * 4 + 2]!), this.a[i * 4 + 3]!);
      const sz = this.s[i * 2]! * Math.min(1, l * 2.5);
      this.m.compose(this.pv.set(this.p[i * 3]!, this.p[i * 3 + 1]!, this.p[i * 3 + 2]!), this.q, this.sv.set(sz, sz, sz));
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

interface Flash { sprite: Sprite; life: number; decay: number; max: number; }
interface Ring { mesh: Mesh; life: number; decay: number; max: number; }

export class Effects {
  private readonly sparks = new Sparks();
  private readonly debris: Debris;
  private readonly flashes: Flash[] = [];
  private readonly rings: Ring[] = [];
  private readonly c = new Color();

  constructor(scene: Scene, glow: Texture, rockMap: Texture) {
    this.debris = new Debris(rockMap);
    scene.add(this.sparks.points, this.debris.mesh);
    for (let i = 0; i < 24; i++) {
      const sprite = new Sprite(new SpriteMaterial({ map: glow, blending: AdditiveBlending, depthWrite: false, transparent: true }));
      sprite.visible = false;
      scene.add(sprite);
      this.flashes.push({ sprite, life: 0, decay: 1, max: 1 });
    }
    const ringGeo = new RingGeometry(0.9, 1, 64).rotateX(-Math.PI / 2);
    for (let i = 0; i < 12; i++) {
      const mesh = new Mesh(ringGeo, new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
      mesh.visible = false;
      scene.add(mesh);
      this.rings.push({ mesh, life: 0, decay: 1, max: 1 });
    }
  }

  /** Point sizes are in world units at a reference viewport height. */
  setViewportHeight(px: number): void {
    this.sparks.setScale(px * 0.28);
  }

  flash(x: number, y: number, z: number, size: number, rgb: [number, number, number], life = 0.18): void {
    const f = this.flashes.find((q) => q.life <= 0) ?? this.flashes[0]!;
    f.sprite.position.set(x, y, z);
    (f.sprite.material as SpriteMaterial).color.setRGB(...rgb);
    f.life = 1; f.decay = 1 / life; f.max = size;
    f.sprite.visible = true;
  }

  ring(x: number, z: number, radius: number, rgb: [number, number, number], life = 0.45): void {
    const r = this.rings.find((q) => q.life <= 0) ?? this.rings[0]!;
    r.mesh.position.set(x, -0.1, z);
    (r.mesh.material as MeshBasicMaterial).color.setRGB(...rgb);
    r.life = 1; r.decay = 1 / life; r.max = radius;
    r.mesh.visible = true;
  }

  burst(x: number, z: number, n: number, rgb: [number, number, number], speed: number, size = 0.35, life = 0.6): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = speed * (0.3 + Math.random() * 0.9);
      this.c.setRGB(...rgb);
      this.sparks.emit(x, (Math.random() - 0.4) * 0.6, z, Math.cos(a) * sp, (Math.random() - 0.3) * sp * 0.4, Math.sin(a) * sp,
        this.c, size * (0.5 + Math.random()), life * (0.6 + Math.random() * 0.8));
    }
  }

  /** One spark with a given velocity: trails, exhaust. */
  mote(x: number, y: number, z: number, vx: number, vz: number, rgb: [number, number, number], size: number, life: number): void {
    this.c.setRGB(...rgb);
    this.sparks.emit(x, y, z, vx, 0, vz, this.c, size, life, 0.94);
  }

  rubble(x: number, z: number, vx: number, vz: number, n: number, size: number, speed: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = speed * (0.3 + Math.random());
      this.debris.emit(x, z, vx + Math.cos(a) * sp, vz + Math.sin(a) * sp, size * (0.4 + Math.random() * 0.8));
    }
  }

  update(dt: number): void {
    this.sparks.update(dt);
    this.debris.update(dt);
    for (const f of this.flashes) {
      if (f.life <= 0) continue;
      f.life -= f.decay * dt;
      if (f.life <= 0) { f.sprite.visible = false; continue; }
      const k = f.life;
      f.sprite.scale.setScalar(f.max * (1.4 - 0.4 * k));
      (f.sprite.material as SpriteMaterial).opacity = k;
    }
    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= r.decay * dt;
      if (r.life <= 0) { r.mesh.visible = false; continue; }
      const t = 1 - r.life;
      r.mesh.scale.setScalar(r.max * (0.15 + 0.85 * (1 - (1 - t) * (1 - t))));
      (r.mesh.material as MeshBasicMaterial).opacity = r.life * 0.9;
    }
  }
}
