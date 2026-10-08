/** 알파 거리 변환을 앞뒤 높이로 바꾸는 저폴리 쿠션. 격자 예산을 자동 축소한다. */
import { BufferGeometry, Float32BufferAttribute, MeshStandardMaterial } from 'three';
import { config } from '../config';
import { textureFor } from '../pieces/outline';
import type { Asset, ObjectAsset } from '../state';
export function distanceField(mask: Uint8Array, w: number, h: number) {
  const d = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      d[y * w + x] = mask[y * w + x] ? Math.min(x + 1, y + 1, w - x, h - y) : 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x) d[i] = Math.min(d[i], d[i - 1] + 1);
      if (y) d[i] = Math.min(d[i], d[i - w] + 1);
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (x < w - 1) d[i] = Math.min(d[i], d[i + 1] + 1);
      if (y < h - 1) d[i] = Math.min(d[i], d[i + w] + 1);
    }
  return d;
}
export function inflate(asset: Asset): ObjectAsset {
  const c = document.createElement('canvas');
  c.width = asset.canvas.width;
  c.height = asset.canvas.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  if (!asset.transparent) {
    ctx.beginPath();
    ctx.roundRect(
      0,
      0,
      c.width,
      c.height,
      Math.min(c.width, c.height) * config.objects.cushionRadius,
    );
    ctx.clip();
  }
  ctx.drawImage(asset.canvas, 0, 0);
  const pixels = ctx.getImageData(0, 0, c.width, c.height).data,
    mask = new Uint8Array(c.width * c.height);
  pixels.forEach((v, i) => {
    if (i % 4 === 3) mask[(i - 3) / 4] = +(v > config.piece.alphaThreshold);
  });
  if (!mask.some(Boolean)) throw new Error('투명 영역만 있는 이미지는 부풀릴 수 없습니다.');
  const d = distanceField(mask, c.width, c.height),
    max = d.reduce((a, b) => Math.max(a, b), 1);
  const aspect = c.width / c.height,
    w = Math.min(1, aspect),
    h = Math.min(1, 1 / aspect);
  function build(n: number) {
    const vertices: number[] = [],
      uv: number[] = [];
    const cell = (x: number, y: number) =>
      x >= 0 &&
      y >= 0 &&
      x < n &&
      y < n &&
      mask[
        Math.min(c.height - 1, Math.floor(((y + 0.5) / n) * c.height)) * c.width +
          Math.min(c.width - 1, Math.floor(((x + 0.5) / n) * c.width))
      ];
    const vertex = (x: number, y: number, sign: number) => {
      const px = Math.min(c.width - 1, Math.floor((x / n) * c.width)),
        py = Math.min(c.height - 1, Math.floor((y / n) * c.height));
      const height =
        config.objects.inflateEdge +
        Math.sqrt(d[py * c.width + px] / max) * config.objects.inflateHeight;
      vertices.push((x / n - 0.5) * w, sign * height, (y / n - 0.5) * h);
      uv.push(x / n, 1 - y / n);
    };
    const tri = (a: number[], b: number[], c: number[]) => {
      vertex(a[0], a[1], a[2]);
      vertex(b[0], b[1], b[2]);
      vertex(c[0], c[1], c[2]);
    };
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (cell(x, y)) {
          for (const sign of [1, -1]) {
            const a = [x, y, sign],
              b = [x + 1, y, sign],
              c = [x + 1, y + 1, sign],
              e = [x, y + 1, sign];
            if (sign === 1) {
              tri(a, c, b);
              tri(a, e, c);
            } else {
              tri(a, b, c);
              tri(a, c, e);
            }
          }
          const edges = [
            { dx: 0, dy: -1, a: [x, y], b: [x + 1, y] },
            { dx: 1, dy: 0, a: [x + 1, y], b: [x + 1, y + 1] },
            { dx: 0, dy: 1, a: [x + 1, y + 1], b: [x, y + 1] },
            { dx: -1, dy: 0, a: [x, y + 1], b: [x, y] },
          ];
          for (const e of edges)
            if (!cell(x + e.dx, y + e.dy)) {
              tri([...e.a, 1], [...e.b, 1], [...e.b, -1]);
              tri([...e.a, 1], [...e.b, -1], [...e.a, -1]);
            }
        }
    return { vertices, uv };
  }
  let n = config.objects.inflateGrid as number,
    data = build(n);
  while (data.vertices.length / 9 > config.objects.maxTriangles && n > 1) data = build(--n);
  if (!data.vertices.length)
    throw new Error('이미지가 너무 가늘어 200삼각형으로 표현할 수 없습니다.');
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(data.vertices, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(data.uv, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = new MeshStandardMaterial({
    map: textureFor(c),
    roughness: config.objects.inflateRoughness,
    alphaTest: config.piece.alphaThreshold / 255,
  });
  return {
    id: asset.id,
    name: asset.name,
    geometry,
    material,
    palette: ['#ffffff'],
    weight: 50,
    halfHeight: -geometry.boundingBox!.min.y,
    source: 'image',
  };
}
