import {
  Color, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Mesh, PerspectiveCamera, Scene, type WebGLRenderer,
} from 'three';
import { HULL_ORDER, type HullId } from '../content/hulls';
import { buildHull } from './ships';

// The hull schematic in the console: the ship you are flying as a turning
// wireframe, coloured by the state of its hull (signal when whole, command
// when worn, alert at one plate). Drawn into the console panel's rectangle
// on the main canvas with a scissor, so it costs no second WebGL context.

const SIGNAL = new Color('#00F0FF');
const COMMAND = new Color('#FF9F43');
const ALERT = new Color('#FF2D78');

export class Schematic {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(32, 1, 0.1, 50);
  private readonly models = new Map<HullId, Group>();
  private readonly mat = new LineBasicMaterial({ color: SIGNAL.clone(), transparent: true, opacity: 0.9 });
  private readonly dim = new LineBasicMaterial({ color: SIGNAL.clone(), transparent: true, opacity: 0.25 });
  private current: HullId;
  private angle = 0.6;

  constructor(hull: HullId) {
    for (const id of HULL_ORDER) {
      const g = new Group();
      buildHull(id).root.traverse((o) => {
        if (!(o as Mesh).isMesh) return;
        const m = o as Mesh;
        m.updateWorldMatrix(true, false);
        const edges = new LineSegments(new EdgesGeometry(m.geometry, 24), this.mat);
        edges.applyMatrix4(m.matrixWorld);
        g.add(edges);
        const inner = new LineSegments(new EdgesGeometry(m.geometry, 1), this.dim);
        inner.applyMatrix4(m.matrixWorld);
        g.add(inner);
      });
      g.visible = false;
      this.models.set(id, g);
      this.scene.add(g);
    }
    this.current = hull;
    this.models.get(hull)!.visible = true;
    this.camera.position.set(-3.2, 2.6, 3.4);
    this.camera.lookAt(0, -0.1, 0);
  }

  setHull(id: HullId): void {
    this.models.get(this.current)!.visible = false;
    this.current = id;
    this.models.get(id)!.visible = true;
  }

  /** `integrity` is 0 to 1. `rect` is the panel slot in CSS pixels, from the top left. */
  render(renderer: WebGLRenderer, rect: DOMRect | null, integrity: number, dt: number): void {
    if (!rect || rect.width < 8 || rect.height < 8) return;
    this.angle += dt * 0.35;
    const g = this.models.get(this.current)!;
    g.rotation.y = this.angle;
    const c = integrity > 0.67 ? SIGNAL : integrity > 0.34 ? COMMAND : ALERT;
    this.mat.color.copy(c);
    this.dim.color.copy(c);

    const H = renderer.domElement.clientHeight;
    const x = rect.left, y = H - rect.bottom, w = rect.width, h = rect.height;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    renderer.setScissorTest(true);
    renderer.setScissor(x, y, w, h);
    renderer.setViewport(x, y, w, h);
    renderer.setClearColor(0x050c12, 1);
    renderer.clear(true, true, false);
    renderer.render(this.scene, this.camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, renderer.domElement.clientWidth, H);
  }
}
