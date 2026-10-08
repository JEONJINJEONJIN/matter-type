/** Procedural pop-art models: merged parts, palette slots and bounded low-poly geometry. */
import {
  BoxGeometry,
  CapsuleGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  QuadraticBezierCurve3,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { config } from '../config';
export function triangleCount(g: BufferGeometry) {
  return (g.index?.count ?? g.getAttribute('position').count) / 3;
}
const C = config.pop.geometry;
export function part(g: BufferGeometry, slot: number, tint = false) {
  const n = g.index ? g.toNonIndexed() : g;
  if (n !== g) g.dispose();
  n.deleteAttribute('uv');
  const count = n.getAttribute('position').count,
    colors = new Float32Array(count * 3),
    slots = new Float32Array(count),
    masks = new Float32Array(count);
  const c = new Color(tint ? '#ffffff' : config.pop.palettes.primary[slot]);
  for (let i = 0; i < count; i++) {
    c.toArray(colors, i * 3);
    slots[i] = tint ? -1 : slot;
    masks[i] = tint ? 1 : 0;
  }
  n.setAttribute('color', new Float32BufferAttribute(colors, 3));
  n.setAttribute('paletteSlot', new Float32BufferAttribute(slots, 1));
  n.setAttribute('tintMask', new Float32BufferAttribute(masks, 1));
  return n;
}
export function shape(points: number[][], bevel: number = C.bevel) {
  const s = new Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return new ExtrudeGeometry(s, {
    depth: C.depth,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 2,
  }).translate(0, 0, -C.depth / 2);
}
export function roundBox() {
  const g = new BoxGeometry(1, 1, 1, 2, 2, 2),
    p = g.getAttribute('position'),
    v = new Vector3(),
    c = new Vector3(),
    radius = config.objects.roundedCube;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.copy(v).clampScalar(-0.5 + radius, 0.5 - radius);
    v.sub(c).normalize().multiplyScalar(radius).add(c);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
export function recolorGeometry(g: BufferGeometry, palette: readonly string[]) {
  const slots = g.getAttribute('paletteSlot'),
    colors = g.getAttribute('color');
  if (!slots || !colors) return;
  const c = new Color();
  for (let i = 0; i < slots.count; i++) {
    c.set(slots.getX(i) < 0 ? '#ffffff' : palette[slots.getX(i)]);
    colors.setXYZ(i, c.r, c.g, c.b);
  }
  colors.needsUpdate = true;
}
export function legacyGeometry(id: string) {
  const parts: BufferGeometry[] = [];
  if (id === 'donut') {
    parts.push(part(new TorusGeometry(0.62, 0.23, C.rings, C.segments * 2), 1));
    parts.push(
      part(
        new TorusGeometry(0.62, 0.19, C.rings, C.segments * 2)
          .scale(1, 1, 0.5)
          .translate(0, 0, 0.18),
        3,
      ),
    );
    for (let i = 0; i < C.sprinkles; i++) {
      const a = (i * Math.PI * 2) / C.sprinkles;
      parts.push(
        part(
          new CapsuleGeometry(0.035, 0.12, 1, 4)
            .rotateZ(a + 0.5)
            .translate(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.29),
          i % 5,
        ),
      );
    }
  } else if (id === 'cherry') {
    for (const sign of [-1, 1]) {
      parts.push(
        part(new SphereGeometry(0.35, C.segments, C.rings).translate(sign * 0.29, -0.21, 0), 0),
      );
      parts.push(
        part(
          new TubeGeometry(
            new QuadraticBezierCurve3(
              new Vector3(sign * 0.29, 0.04, 0),
              new Vector3(sign * 0.4, 0.65, 0),
              new Vector3(0, 0.7, 0),
            ),
            3,
            0.035,
            4,
            false,
          ),
          2,
        ),
      );
    }
  } else if (id === 'lollipop') {
    parts.push(
      part(
        new CylinderGeometry(0.49, 0.49, 0.17, C.segments * 2)
          .rotateX(Math.PI / 2)
          .translate(0, 0.25, 0),
        3,
        true,
      ),
    );
    parts.push(part(new TorusGeometry(0.27, 0.055, 4, C.segments).translate(0, 0.25, 0.105), 4));
    parts.push(part(new CylinderGeometry(0.045, 0.045, 0.95, 4).translate(0, -0.61, 0), 4));
  } else if (id === 'heart') {
    parts.push(
      part(
        shape(
          [
            [0, -0.68],
            [-0.58, -0.12],
            [-0.7, 0.23],
            [-0.6, 0.51],
            [-0.32, 0.62],
            [0, 0.35],
            [0.32, 0.62],
            [0.6, 0.51],
            [0.7, 0.23],
            [0.58, -0.12],
          ],
          C.bevel * 2,
        ).scale(1, 1, 2),
        0,
        true,
      ),
    );
  } else if (id === 'marble') {
    parts.push(part(new SphereGeometry(0.5, C.segments, C.rings), 2, true));
  } else if (id === 'star') {
    parts.push(
      part(
        shape(
          Array.from({ length: 10 }, (_, i) => {
            const a = Math.PI / 2 + (i * Math.PI) / 5,
              r = i % 2 ? 0.29 : 0.66;
            return [Math.cos(a) * r, Math.sin(a) * r];
          }),
        ),
        1,
        true,
      ),
    );
  } else if (id === 'lightning') {
    parts.push(
      part(
        shape([
          [-0.12, 0.8],
          [0.46, 0.8],
          [0.12, 0.14],
          [0.43, 0.14],
          [-0.4, -0.8],
          [-0.1, -0.12],
          [-0.46, -0.12],
        ]),
        1,
        true,
      ),
    );
  } else if (id === 'dice') {
    parts.push(part(roundBox(), 4));
    for (const [x, y] of [
      [-0.23, -0.23],
      [0.23, 0.23],
      [0, 0],
      [-0.23, 0.23],
      [0.23, -0.23],
    ])
      parts.push(
        part(
          new CylinderGeometry(0.065, 0.065, 0.012, 6).rotateX(Math.PI / 2).translate(x, y, 0.5),
          2,
        ),
      );
  } else {
    parts.push(part(new BoxGeometry(1, 0.6, 0.55), 2, true));
    for (const x of [-0.28, 0.28])
      for (const z of [-0.15, 0.15])
        parts.push(part(new CylinderGeometry(0.12, 0.12, 0.14, 6).translate(x, 0.37, z), 2, true));
  }
  const geometry = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  // Local +Y is front, matching uploaded inflated images and peel animation.
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  const center = geometry.boundingBox!.getCenter(new Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingSphere();
  const normalize = 1 / geometry.boundingSphere!.radius;
  geometry.scale(normalize, normalize, normalize);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  if (triangleCount(geometry) > config.objects.maxTriangles)
    throw new Error(`${id}: polygon budget exceeded (${triangleCount(geometry)})`);
  return geometry;
}
