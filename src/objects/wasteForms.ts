/** Discarded objects: damage is baked into low-poly geometry, never recomputed per frame.
 * Coordinates below author each silhouette in model units; global wear controls live in config.
 */
import {
  BufferGeometry,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  LatheGeometry,
  TubeGeometry,
  CatmullRomCurve3,
  Vector2,
  Vector3,
  Float32BufferAttribute,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { part, shape } from './popForms';
import { extraGeometry } from './forms';
import { config } from '../config';
const C = config.library.wear;
const body = (g: BufferGeometry) => part(g, 0, true);
const mark = (g: BufferGeometry, slot = 2) => part(g, slot);
function tube(points: number[][], radius: number = 0.028, segments?: number) {
  return new TubeGeometry(
    new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
    segments ?? points.length * 2,
    radius,
    4,
    false,
  );
}
function lathe(points: number[][], segments = 8, arc = Math.PI * 2) {
  return new LatheGeometry(
    points.map((p) => new Vector2(...p)),
    segments,
    0,
    arc,
  );
}
function distort(g: BufferGeometry, amount: number = C.dent) {
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const wave = Math.sin(y * 13 + x * 5 + z * 7);
    const crush = 1 - amount * (0.5 + 0.5 * Math.sin(y * 7 + 1));
    p.setXYZ(
      i,
      x * crush + amount * 0.2 * wave,
      y + amount * 0.16 * Math.sin(x * 11 + z * 13),
      z * (1 + amount * wave),
    );
  }
  g.computeVertexNormals();
  return g;
}
function sheet(points: number[][], depth = 0.035, bend: number = C.fold) {
  const g = shape(points, 0.005).scale(1, 1, depth / config.pop.geometry.depth);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    p.setZ(i, p.getZ(i) + bend * (Math.abs(x + 0.12) - 0.2) + bend * 0.35 * Math.sin(y * 7));
  }
  g.computeVertexNormals();
  return g;
}
function scratch(x: number, y: number, length: number, z: number) {
  return mark(new BoxGeometry(length, 0.012, 0.009).rotateZ(0.18).translate(x, y, z), 4);
}
/** Vertex wear survives palette edits; position-based values keep seams continuous. */
export function weather(g: BufferGeometry, id: string) {
  const p = g.getAttribute('position'),
    wear = new Float32Array(p.count),
    rust = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const noise = Math.sin(p.getX(i) * 29 + p.getY(i) * 43 + p.getZ(i) * 17);
    wear[i] = 1 - C.stain * (0.5 + 0.5 * noise);
    rust[i] = config.library.rustIds.includes(id)
      ? Math.max(0, noise) * config.library.rustStrength
      : 0;
  }
  g.setAttribute('wear', new Float32BufferAttribute(wear, 1));
  g.setAttribute('rustMask', new Float32BufferAttribute(rust, 1));
  return g;
}
export function wasteGeometry(id: string): BufferGeometry {
  if (['paper', 'ring', 'pebble', 'button', 'cap', 'key', 'coin'].includes(id)) {
    let g = extraGeometry(id);
    // Keep real button holes intact. Deform metal edges, not its pierced surface.
    if (['ring', 'cap', 'key', 'coin'].includes(id)) g = distort(g, C.edgeDamage);
    g.computeBoundingBox();
    const c = g.boundingBox!.getCenter(new Vector3());
    g.translate(-c.x, -c.y, -c.z);
    g.computeBoundingSphere();
    const k = 1 / g.boundingSphere!.radius;
    g.scale(k, k, k);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return weather(g, id);
  }
  const p: BufferGeometry[] = [];
  switch (id) {
    case 'can':
      p.push(body(distort(new CylinderGeometry(0.38, 0.38, 1.12, 10, 4), C.crush)));
      for (const y of [-0.56, 0.56])
        p.push(
          mark(
            new TorusGeometry(0.36, 0.035, 4, 10).rotateX(Math.PI / 2).translate(0.015, y, 0),
            4,
          ),
        );
      p.push(
        mark(
          new TorusGeometry(0.105, 0.026, 4, 8)
            .rotateX(Math.PI / 2)
            .scale(0.65, 1, 1)
            .translate(0.05, 0.59, 0),
          2,
        ),
      );
      for (const y of [-0.23, 0.02, 0.18]) p.push(scratch(0.04, y, 0.35, 0.29));
      break;
    case 'bottle':
      p.push(
        body(
          distort(
            lathe(
              [
                [0, -0.7],
                [0.29, -0.7],
                [0.35, -0.6],
                [0.3, -0.42],
                [0.34, -0.3],
                [0.31, -0.12],
                [0.33, 0.1],
                [0.3, 0.35],
                [0.14, 0.53],
                [0.12, 0.73],
                [0.08, 0.73],
                [0.08, 0.58],
              ],
              8,
            ),
            C.dent,
          ),
        ),
      );
      p.push(mark(new CylinderGeometry(0.33, 0.33, 0.23, 8, 1, true).translate(0, -0.06, 0), 4));
      p.push(
        mark(new TorusGeometry(0.12, 0.025, 4, 8).rotateX(Math.PI / 2).translate(0, 0.67, 0), 1),
      );
      break;
    case 'straw':
      p.push(
        body(
          tube(
            [
              [-0.22, -0.8, 0],
              [-0.22, 0.29, 0],
              [-0.11, 0.4, 0],
              [0.4, 0.58, 0.05],
            ],
            0.045,
            8,
          ),
        ),
      );
      for (let i = 0; i < 4; i++)
        p.push(
          mark(
            new TorusGeometry(0.048, 0.008, 3, 6)
              .rotateX(Math.PI / 2)
              .translate(-0.22, 0.22 + i * 0.035, 0),
            4,
          ),
        );
      break;
    case 'snack':
      p.push(
        body(
          sheet(
            [
              [-0.44, -0.58],
              [-0.26, -0.65],
              [-0.12, -0.56],
              [0.07, -0.64],
              [0.29, -0.57],
              [0.46, -0.63],
              [0.36, 0.35],
              [0.48, 0.54],
              [0.26, 0.45],
              [0.12, 0.62],
              [-0.05, 0.46],
              [-0.28, 0.61],
              [-0.46, 0.51],
            ],
            0.15,
            0.38,
          ),
        ),
      );
      p.push(
        mark(
          sheet(
            [
              [-0.28, -0.18],
              [0.25, -0.24],
              [0.3, 0.1],
              [-0.25, 0.17],
            ],
            0.014,
            0.38,
          ).translate(0, 0, 0.095),
          4,
        ),
      );
      for (const y of [-0.49, 0.38])
        p.push(mark(new BoxGeometry(0.75, 0.027, 0.03).rotateZ(0.1).translate(0, y, 0.09), 2));
      break;
    case 'noodle':
      p.push(
        body(
          distort(
            lathe(
              [
                [0, -0.5],
                [0.28, -0.5],
                [0.46, 0.43],
                [0.47, 0.47],
                [0.42, 0.47],
                [0.25, -0.42],
                [0, -0.42],
              ],
              10,
            ),
            0.06,
          ),
        ),
      );
      p.push(
        mark(new TorusGeometry(0.44, 0.03, 4, 10).rotateX(Math.PI / 2).translate(0, 0.46, 0), 4),
      );
      p.push(
        mark(
          sheet(
            [
              [-0.12, 0.12],
              [0.44, 0.11],
              [0.25, 0.5],
              [-0.13, 0.45],
            ],
            0.025,
            0.3,
          )
            .rotateX(-Math.PI / 2)
            .translate(0, 0.51, 0),
          4,
        ),
      );
      p.push(mark(new CylinderGeometry(0.38, 0.32, 0.19, 10, 1, true).translate(0, -0.06, 0), 1));
      break;
    case 'chopsticks':
      for (const sign of [-1, 1])
        p.push(
          mark(
            distort(new CylinderGeometry(0.026, 0.06, 1.5, 4, 2), 0.04)
              .rotateZ(sign * 0.08)
              .translate(sign * 0.09, 0, 0),
            1,
          ),
        );
      break;
    case 'receipt':
    case 'notebook':
    case 'cardboard': {
      const isBox = id === 'cardboard',
        w = isBox ? 0.64 : id === 'notebook' ? 0.58 : 0.31;
      p.push(
        mark(
          sheet(
            [
              [-w, -0.67],
              [-w * 0.6, -0.59],
              [-w * 0.42, -0.7],
              [0, -0.57],
              [w * 0.3, -0.66],
              [w, -0.53],
              [w, 0.66],
              [w * 0.6, 0.59],
              [w * 0.3, 0.7],
              [-w * 0.2, 0.62],
              [-w, 0.7],
            ],
            isBox ? 0.075 : 0.015,
            id === 'receipt' ? 0.55 : 0.2,
          ),
          isBox ? 1 : 4,
        ),
      );
      if (isBox) {
        for (let i = 0; i < 7; i++)
          p.push(
            mark(new BoxGeometry(0.022, 0.075, 0.075).translate(-0.5 + i * 0.16, -0.58, 0.01), 2),
          );
      } else
        for (let i = 0; i < 7; i++) {
          const y = -0.43 + i * 0.145;
          p.push(
            mark(
              new BoxGeometry(w * (id === 'receipt' ? 1.35 : 1.7), 0.011, 0.009).translate(
                -0.025,
                y,
                0.1 + Math.sin(y * 7) * 0.016,
              ),
              id === 'receipt' ? 2 : 0,
            ),
          );
        }
      if (id === 'notebook')
        for (let i = 0; i < 4; i++)
          p.push(
            mark(
              tube(
                [
                  [-0.55, -0.4 + i * 0.24, 0.04],
                  [-0.64, -0.36 + i * 0.24, 0.06],
                  [-0.55, -0.32 + i * 0.24, 0.04],
                ],
                0.014,
                3,
              ),
              2,
            ),
          );
      break;
    }
    case 'stub':
      p.push(
        body(new CylinderGeometry(0.13, 0.13, 0.57, 6)),
        mark(new CylinderGeometry(0, 0.13, 0.22, 6).translate(0, 0.39, 0), 1),
        mark(new CylinderGeometry(0, 0.04, 0.08, 6).translate(0, 0.52, 0), 2),
        mark(distort(new CylinderGeometry(0.13, 0.13, 0.1, 6), 0.12).translate(0, -0.34, 0), 4),
      );
      p.push(scratch(0.035, -0.04, 0.14, 0.12));
      break;
    case 'comb':
      p.push(
        body(
          sheet(
            [
              [-0.68, 0.17],
              [0.52, 0.17],
              [0.64, 0.1],
              [0.57, -0.02],
              [0.2, -0.03],
              [-0.68, -0.02],
            ],
            0.11,
            0.03,
          ),
        ),
      );
      for (let i = 0; i < 10; i++)
        if (![2, 5, 6].includes(i))
          p.push(
            body(
              new BoxGeometry(0.05, i === 8 ? 0.13 : 0.39, 0.07).translate(
                -0.57 + i * 0.12,
                -0.19,
                0,
              ),
            ),
          );
      break;
    case 'mug': {
      const g = lathe(
        [
          [0.3, -0.4],
          [0.45, 0.4],
          [0.39, 0.4],
          [0.26, -0.36],
        ],
        10,
        Math.PI * 1.3,
      );
      const a = g.getAttribute('position');
      for (let i = 0; i < a.count; i++)
        if (a.getY(i) > 0.3)
          a.setY(i, a.getY(i) - (0.15 + 0.12 * Math.sin(a.getX(i) * 22 + a.getZ(i) * 13)));
      g.computeVertexNormals();
      p.push(
        body(g),
        mark(
          tube(
            [
              [0.42, 0.16, 0.1],
              [0.65, 0.1, 0.12],
              [0.6, -0.13, 0.14],
            ],
            0.075,
            5,
          ),
          4,
        ),
      );
      break;
    }
    case 'sock':
      p.push(
        body(
          sheet(
            [
              [-0.19, 0.7],
              [0.2, 0.7],
              [0.19, -0.2],
              [0.53, -0.36],
              [0.57, -0.52],
              [0.35, -0.67],
              [-0.08, -0.49],
              [-0.25, -0.3],
            ],
            0.2,
            0.13,
          ),
        ),
      );
      p.push(mark(new BoxGeometry(0.4, 0.11, 0.2).translate(0, 0.6, 0), 4));
      p.push(
        mark(
          sheet(
            [
              [-0.11, -0.31],
              [0.02, -0.34],
              [0.08, -0.44],
              [-0.07, -0.46],
            ],
            0.01,
            0.01,
          ).translate(0, 0, 0.12),
          2,
        ),
      );
      break;
    case 'battery':
      p.push(
        body(new CylinderGeometry(0.23, 0.23, 1.05, 8)),
        mark(new CylinderGeometry(0.23, 0.23, 0.16, 8).translate(0, 0.43, 0), 4),
        mark(new CylinderGeometry(0.1, 0.1, 0.08, 6).translate(0, 0.56, 0), 2),
      );
      p.push(
        mark(new BoxGeometry(0.18, 0.03, 0.015).translate(0, 0.23, 0.233), 4),
        mark(new BoxGeometry(0.03, 0.18, 0.015).translate(0, 0.23, 0.233), 4),
      );
      p.push(scratch(0.03, -0.18, 0.23, 0.24), scratch(-0.03, -0.34, 0.18, 0.24));
      break;
    case 'earbuds':
      p.push(
        body(
          tube(
            [
              [-0.4, 0.6, 0],
              [-0.65, 0.08, 0.04],
              [-0.1, -0.44, 0.09],
              [0.48, -0.1, -0.07],
              [0.13, 0.25, 0.08],
              [-0.5, -0.2, 0],
              [0.04, -0.59, -0.07],
              [0.45, 0.05, 0.06],
              [0.34, 0.61, 0],
            ],
            0.027,
            26,
          ),
        ),
      );
      for (const x of [-0.4, 0.34])
        p.push(mark(new SphereGeometry(0.12, 6, 4).scale(1, 1, 0.7).translate(x, 0.64, 0), 4));
      break;
    case 'lighter':
      p.push(
        body(distort(new BoxGeometry(0.49, 0.91, 0.24, 2, 2, 1), 0.045)),
        mark(new BoxGeometry(0.49, 0.22, 0.26).translate(0, 0.52, 0), 4),
        mark(
          new CylinderGeometry(0.1, 0.1, 0.16, 6).rotateZ(Math.PI / 2).translate(-0.12, 0.67, 0),
          2,
        ),
        mark(new BoxGeometry(0.16, 0.08, 0.2).translate(0.13, 0.66, 0), 2),
      );
      p.push(scratch(0, -0.15, 0.3, 0.13), scratch(0.04, 0.04, 0.23, 0.13));
      break;
    case 'rubber':
      p.push(body(distort(new TorusGeometry(0.45, 0.025, 4, 16).scale(1, 0.63, 1), 0.16)));
      break;
    case 'tape':
      p.push(
        mark(
          sheet(
            [
              [-0.54, -0.15],
              [-0.41, -0.22],
              [-0.25, -0.13],
              [-0.08, -0.2],
              [0.23, -0.15],
              [0.54, -0.24],
              [0.49, 0.22],
              [0.27, 0.15],
              [0.15, 0.23],
              [-0.3, 0.17],
              [-0.51, 0.25],
            ],
            0.016,
            0.6,
          ),
          1,
        ),
      );
      break;
    default:
      throw new Error(`Unknown discarded object ${id}`);
  }
  const g = mergeGeometries(p)!;
  p.forEach((g) => g.dispose());
  g.rotateX(-Math.PI / 2);
  g.computeBoundingBox();
  const center = g.boundingBox!.getCenter(new Vector3());
  g.translate(-center.x, -center.y, -center.z);
  g.computeBoundingSphere();
  const scale = 1 / g.boundingSphere!.radius;
  g.scale(scale, scale, scale);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return weather(g, id);
}
