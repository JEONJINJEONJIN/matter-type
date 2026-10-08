/** Low-poly library silhouettes; coordinates are normalized model-space design points. */
import {
  BoxGeometry,
  Float32BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  Path,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  CatmullRomCurve3,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { part, shape, roundBox } from './popForms';
import { config } from '../config';
const C = config.library.geometry;
const body = (g: BufferGeometry) => part(g, 0, true);
const accent = (g: BufferGeometry, slot = 4) => part(g, slot);
function tube(points: number[][], radius: number = C.wireRadius) {
  return new TubeGeometry(
    new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
    points.length * 2,
    radius,
    4,
    false,
  );
}
function disk(r: number, depth: number, segments: number = C.segments) {
  return new CylinderGeometry(r, r, depth, segments).rotateX(Math.PI / 2);
}
function piercedButton() {
  const s = new Shape();
  s.absarc(0, 0, 0.55, 0, Math.PI * 2, false);
  for (const x of [-0.18, 0.18])
    for (const y of [-0.18, 0.18]) {
      const hole = new Path();
      hole.absarc(x, y, 0.105, 0, Math.PI * 2, true);
      s.holes.push(hole);
    }
  return new ExtrudeGeometry(s, {
    depth: 0.12,
    bevelEnabled: false,
    curveSegments: 4,
    steps: 1,
  }).translate(0, 0, -0.06);
}
export function extraGeometry(id: string) {
  const p: BufferGeometry[] = [];
  switch (id) {
    case 'candy':
      p.push(body(new SphereGeometry(0.36, 8, 5).scale(1.35, 0.8, 0.8)));
      for (const sign of [-1, 1]) {
        p.push(
          accent(
            new CylinderGeometry(0.08, 0.08, 0.18, 4)
              .rotateZ(Math.PI / 2)
              .translate(sign * 0.48, 0, 0),
          ),
        );
        p.push(
          body(
            new CylinderGeometry(0.04, 0.28, 0.32, 4)
              .rotateY(sign * 0.65)
              .rotateZ((-sign * Math.PI) / 2)
              .translate(sign * 0.7, 0, 0),
          ),
        );
      }
      break;
    case 'capsule':
      for (const sign of [-1, 1])
        p.push(
          part(
            new SphereGeometry(0.29, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)
              .translate(0, 0.34, 0)
              .rotateZ(sign < 0 ? Math.PI : 0),
            sign < 0 ? 4 : 0,
            sign > 0,
          ),
        );
      p.push(
        body(new CylinderGeometry(0.29, 0.29, 0.34, 8, 1, true).translate(0, 0.17, 0)),
        accent(new CylinderGeometry(0.29, 0.29, 0.34, 8, 1, true).translate(0, -0.17, 0)),
      );
      break;
    case 'macaron':
      for (const sign of [-1, 1])
        p.push(
          body(new SphereGeometry(0.52, 10, 5).scale(1, 0.38, 1).translate(0, sign * 0.17, 0)),
        );
      p.push(accent(new CylinderGeometry(0.48, 0.48, 0.13, 10)));
      break;
    case 'sugar': {
      const g = roundBox();
      const a = g.getAttribute('position');
      for (let i = 0; i < a.count; i++) {
        const n = Math.sin(a.getX(i) * 37 + a.getY(i) * 71 + a.getZ(i) * 23) * 0.015;
        a.setXYZ(i, a.getX(i) + n, a.getY(i) + n, a.getZ(i) + n);
      }
      g.computeVertexNormals();
      p.push(accent(g));
      break;
    }
    case 'pawn':
      p.push(
        body(
          new LatheGeometry(
            [
              [0.4, -0.65],
              [0.43, -0.52],
              [0.3, -0.42],
              [0.19, -0.33],
              [0.13, 0.12],
              [0.28, 0.2],
              [0.22, 0.29],
            ].map((p) => new Vector2(...p)),
            8,
          ),
        ),
      );
      p.push(body(new SphereGeometry(0.25, 8, 5).translate(0, 0.48, 0)));
      break;
    case 'pencil':
      p.push(
        body(new CylinderGeometry(0.11, 0.11, 1.3, 6)),
        accent(new CylinderGeometry(0, 0.11, 0.27, 6).translate(0, 0.785, 0), 1),
        accent(new CylinderGeometry(0, 0.035, 0.1, 6).translate(0, 0.945, 0), 2),
        accent(new CylinderGeometry(0.115, 0.115, 0.12, 6).translate(0, -0.71, 0), 4),
        accent(new CylinderGeometry(0.11, 0.11, 0.17, 6).translate(0, -0.855, 0), 3),
      );
      break;
    case 'clip':
      p.push(
        body(
          tube([
            [0.03, -0.4, 0],
            [0.23, -0.4, 0],
            [0.27, 0.48, 0],
            [0.12, 0.67, 0],
            [-0.19, 0.61, 0],
            [-0.27, 0.38, 0],
            [-0.27, -0.57, 0],
            [-0.1, -0.72, 0],
            [0.14, -0.64, 0],
            [0.15, 0.35, 0],
            [0.02, 0.44, 0],
            [-0.09, 0.32, 0],
            [-0.09, -0.36, 0],
          ]),
        ),
      );
      break;
    case 'tack':
      p.push(
        body(new CylinderGeometry(0.35, 0.28, 0.12, 10).translate(0, 0.32, 0)),
        body(new CylinderGeometry(0.11, 0.23, 0.35, 8).translate(0, 0.09, 0)),
        accent(new CylinderGeometry(0.045, 0, 0.65, 6).translate(0, -0.41, 0)),
      );
      break;
    case 'button':
      p.push(body(piercedButton()), accent(new TorusGeometry(0.48, 0.025, 4, 12)));
      break;
    case 'coin':
      p.push(
        body(disk(0.52, 0.09, 16)),
        accent(new TorusGeometry(0.44, 0.023, 4, 12).translate(0, 0, 0.055), 1),
        accent(
          shape(
            [
              [0, 0.28],
              [0.08, 0.04],
              [0.27, 0],
              [0.08, -0.06],
              [0, -0.29],
              [-0.08, -0.06],
              [-0.27, 0],
              [-0.08, 0.04],
            ],
            0.01,
          )
            .scale(0.65, 0.65, 0.24)
            .translate(0, 0, 0.055),
          1,
        ),
      );
      break;
    case 'cap': {
      const g = new CylinderGeometry(0.52, 0.56, 0.2, 20),
        a = g.getAttribute('position');
      for (let i = 0; i < a.count; i++) {
        const angle = Math.atan2(a.getZ(i), a.getX(i));
        const k = Math.round((angle / (Math.PI * 2)) * 20);
        const f = k % 2 === 0 ? 1 : 0.91;
        a.setXYZ(i, a.getX(i) * f, a.getY(i), a.getZ(i) * f);
      }
      g.computeVertexNormals();
      p.push(
        body(g),
        accent(new TorusGeometry(0.37, 0.035, 4, 12).rotateX(Math.PI / 2).translate(0, 0.11, 0)),
      );
      break;
    }
    case 'key':
      p.push(
        body(new TorusGeometry(0.26, 0.09, 5, 12).translate(0, 0.45, 0)),
        body(new BoxGeometry(0.12, 0.83, 0.1).translate(0, -0.14, 0)),
        body(new BoxGeometry(0.28, 0.12, 0.1).translate(0.08, -0.49, 0)),
        body(new BoxGeometry(0.24, 0.1, 0.1).translate(0.06, -0.27, 0)),
      );
      break;
    case 'petal':
      p.push(
        body(
          shape(
            [
              [0, -0.65],
              [-0.24, -0.25],
              [-0.44, 0.23],
              [-0.32, 0.54],
              [0, 0.67],
              [0.32, 0.54],
              [0.44, 0.23],
              [0.24, -0.25],
            ],
            0.06,
          ).scale(1, 1, 0.35),
        ),
      );
      break;
    case 'leaf':
      p.push(
        body(
          shape(
            [
              [0, -0.64],
              [-0.38, -0.25],
              [-0.44, 0.16],
              [-0.2, 0.5],
              [0, 0.72],
              [0.3, 0.36],
              [0.42, 0],
              [0.26, -0.4],
            ],
            0.01,
          ).scale(1, 1, 0.25),
        ),
        accent(
          tube(
            [
              [0, -0.78, 0.035],
              [0, 0, 0.09],
              [0, 0.59, 0.035],
            ],
            0.015,
          ),
          1,
        ),
      );
      for (const sign of [-1, 1])
        for (const y of [-0.25, 0.05, 0.3])
          p.push(
            accent(
              tube(
                [
                  [0, y, 0.07],
                  [sign * 0.25, y + 0.18, 0.045],
                ],
                0.012,
              ),
              1,
            ),
          );
      break;
    case 'shell': {
      const vertices: number[] = [];
      const fan = Array.from({ length: 13 }, (_, i) => {
        const angle = (i / 12 - 0.5) * Math.PI * 0.8;
        return [Math.sin(angle) * 0.68, -0.5 + Math.cos(angle) * 1.05, 0.14 + (i % 2) * 0.055];
      });
      for (let i = 0; i < 12; i++) {
        const a = fan[i],
          b = fan[i + 1];
        vertices.push(0, -0.6, 0, ...b, ...a, 0, -0.6, -0.07, a[0], a[1], -0.07, b[0], b[1], -0.07);
        vertices.push(...a, ...b, b[0], b[1], -0.07, ...a, b[0], b[1], -0.07, a[0], a[1], -0.07);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(vertices, 3));
      g.computeVertexNormals();
      p.push(body(g));
      for (let i = 0; i < 13; i += 2) {
        const [x, y, z] = fan[i];
        p.push(
          accent(
            tube(
              [
                [0, -0.54, 0.02],
                [x * 0.5, (y - 0.54) / 2, z * 0.7],
                [x, y, z],
              ],
              0.018,
            ),
            1,
          ),
        );
      }
      p.push(body(new BoxGeometry(0.24, 0.12, 0.13).translate(0, -0.56, 0)));
      break;
    }
    case 'feather':
      p.push(
        accent(
          tube(
            [
              [0, -0.83, 0],
              [0, 0, 0.04],
              [0.12, 0.77, 0],
            ],
            0.022,
          ),
          4,
        ),
      );
      for (const sign of [-1, 1])
        for (let i = 0; i < 7; i++) {
          const y = -0.49 + i * 0.17;
          const w = 0.3 * Math.sin(((i + 1) / 8) * Math.PI);
          p.push(
            body(
              shape(
                [
                  [0, y],
                  [sign * w, y + 0.18],
                  [sign * w * 0.8, y + 0.25],
                  [0, y + 0.1],
                ],
                0.005,
              ).scale(1, 1, 0.13),
            ),
          );
        }
      break;
    case 'paper':
    case 'pebble': {
      const g = new IcosahedronGeometry(0.55, 1),
        a = g.getAttribute('position');
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i),
          y = a.getY(i),
          z = a.getZ(i);
        const n =
          1 +
          Math.sin(x * 31 + y * 47 + z * 67) *
            (id === 'paper' ? config.objects.paperNoise : config.objects.pebbleNoise);
        a.setXYZ(i, x * n, y * n * (id === 'pebble' ? 0.6 : 1), z * n);
      }
      g.computeVertexNormals();
      p.push(body(g));
      break;
    }
    case 'ring':
      p.push(body(new TorusGeometry(0.47, 0.105, 6, 16)));
      break;
    default:
      throw new Error(`Unknown library geometry: ${id}`);
  }
  const g = mergeGeometries(p)!;
  p.forEach((p) => p.dispose());
  g.rotateX(-Math.PI / 2);
  g.computeBoundingBox();
  const center = g.boundingBox!.getCenter(new Vector3());
  g.translate(-center.x, -center.y, -center.z);
  g.computeBoundingSphere();
  const scale = 1 / g.boundingSphere!.radius;
  g.scale(scale, scale, scale);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
