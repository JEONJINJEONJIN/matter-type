/** 이미지 조각과 글자 배치가 공유하는 알파 경계 연결·단순화·구멍 분류. */
import { Shape, Path, Vector2 } from 'three';
import { config } from '../config';
export type P = [number, number];
function area(points: P[]) {
  return (
    points.reduce((a, p, i) => {
      const q = points[(i + 1) % points.length];
      return a + p[0] * q[1] - q[0] * p[1];
    }, 0) / 2
  );
}
function simplify(points: P[], tolerance: number): P[] {
  if (points.length <= 3) return points;
  const a = points[0],
    b = points[points.length - 1];
  let max = 0,
    index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i],
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0;
    const distance = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    if (distance > max) {
      max = distance;
      index = i;
    }
  }
  return max > tolerance
    ? [
        ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
        ...simplify(points.slice(index), tolerance),
      ]
    : [a, b];
}
function inside(p: P, polygon: P[]) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      hit = !hit;
  }
  return hit;
}
export function extractContours(
  canvas: HTMLCanvasElement,
  options?: { width: number; height: number; raster: number; simplify: number; minArea: number },
): P[][] {
  const c = document.createElement('canvas');
  c.width = options?.raster ?? config.outline.raster;
  c.height = options ? Math.max(1, Math.round((c.width * canvas.height) / canvas.width)) : c.width;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0, c.width, c.height);
  const alpha = ctx.getImageData(0, 0, c.width, c.height).data;
  const filled = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < c.width &&
    y < c.height &&
    alpha[(y * c.width + x) * 4 + 3] > config.piece.alphaThreshold;
  const edges = new Map<string, P[]>();
  const edge = (a: P, b: P) => {
    const k = a.join(',');
    const es = edges.get(k) || [];
    es.push(b);
    edges.set(k, es);
  };
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (filled(x, y)) {
        if (!filled(x, y - 1)) edge([x, y], [x + 1, y]);
        if (!filled(x + 1, y)) edge([x + 1, y], [x + 1, y + 1]);
        if (!filled(x, y + 1)) edge([x + 1, y + 1], [x, y + 1]);
        if (!filled(x - 1, y)) edge([x, y + 1], [x, y]);
      }
  const loops: P[][] = [],
    aspect = canvas.width / canvas.height;
  const w = options?.width ?? Math.min(1, aspect),
    h = options?.height ?? Math.min(1, 1 / aspect);
  while (edges.size) {
    const start = edges.keys().next().value!;
    let key = start;
    const loop: P[] = [];
    let closed = false;
    for (let guard = 0; guard < c.width * c.height * 4; guard++) {
      const [x, y] = key.split(',').map(Number);
      loop.push([(x / c.width - 0.5) * w, (0.5 - y / c.height) * h]);
      const next = edges.get(key);
      if (!next?.length) break;
      const p = next.pop()!;
      if (!next.length) edges.delete(key);
      key = p.join(',');
      if (key === start) {
        closed = true;
        break;
      }
    }
    if (closed && Math.abs(area(loop)) > (options?.minArea ?? config.outline.minArea)) {
      const mid = Math.floor(loop.length / 2);
      const simple = [
        ...simplify(loop.slice(0, mid + 1), options?.simplify ?? config.outline.simplify).slice(
          0,
          -1,
        ),
        ...simplify(
          [...loop.slice(mid), loop[0]],
          options?.simplify ?? config.outline.simplify,
        ).slice(0, -1),
      ];
      if (simple.length >= 3) loops.push(simple);
    }
  }
  return loops;
}

export function shapesFromContours(loops: P[][]): Shape[] {
  const outer = loops.filter((p) => area(p) < 0),
    holes = loops.filter((p) => area(p) > 0);
  if (!outer.length) throw new Error('Empty outline');
  return outer.map((p) => {
    const s = new Shape(p.map(([x, y]) => new Vector2(x, y)));
    for (const hole of holes)
      if (inside(hole[0], p)) s.holes.push(new Path(hole.map(([x, y]) => new Vector2(x, y))));
    return s;
  });
}
