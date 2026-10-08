/** Pure conservative SDF lookup and seeded 3D sphere packing; safe in a Worker. */
import { config } from './config';
import type { SDFField, Transform } from './state';
import type { LayoutObject, LayoutOptions } from './layout';
export function distanceAt(s: SDFField, x: number, y: number): number {
  const px = (x - s.originX) / s.unit - 0.5,
    py = (s.originY - y) / s.unit - 0.5;
  const ix = Math.floor(px),
    iy = Math.floor(py);
  if (ix < 0 || iy < 0 || ix + 1 >= s.width || iy + 1 >= s.height) return -Infinity;
  const fx = px - ix,
    fy = py - iy;
  const a = s.data[iy * s.width + ix],
    b = s.data[iy * s.width + ix + 1];
  const c = s.data[(iy + 1) * s.width + ix],
    d = s.data[(iy + 1) * s.width + ix + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}
export function packSDF(
  objects: LayoutObject[],
  opts: LayoutOptions,
  rng: () => number,
  sparse = false,
  deep = false,
): Transform[] {
  const sdf = opts.sdf!;
  const out: Transform[] = [],
    radii: number[] = [],
    hash = new Map<string, number[]>();
  const minR = opts.minR ?? config.pop.minR;
  const maxR = Math.min(
    (opts.maxR ?? config.pop.maxR) * opts.size,
    sdf.maxDistance * config.pop.strokeFraction,
    opts.depth / 2,
  );
  if (maxR < minR || !objects.some((o) => o.weight > 0)) return out;
  const cell = maxR * 2,
    hull = 1 + (opts.outlineWidth ?? 0);
  const budget = Math.floor(
    opts.budget * Math.min(1, opts.density ?? 1) * (sparse ? config.layout.sparseRetention : 1),
  );
  const attempts = Math.ceil(budget * config.pop.attempts * (opts.density ?? config.pop.density));
  const width = (sdf.width - config.pop.buffer * 2) * sdf.unit;
  const palette = config.pop.palettes[opts.palette ?? 'primary'];
  // One pixel plus quantization slack protects the raster boundary between samples.
  const safety = sdf.unit * (Math.SQRT2 + config.pop.sdfRadius / 255);
  for (let attempt = 0; attempt < attempts && out.length < budget; attempt++) {
    const x = (rng() - 0.5) * width,
      y = rng() * opts.height;
    const d = distanceAt(sdf, x, y) - safety;
    if (d <= minR) continue;
    const r = Math.min(
      d,
      Math.max(minR, Math.min(maxR, d * config.pop.radiusRatio * opts.size)) *
        (config.pop.radiusJitter + rng() * (1 - config.pop.radiusJitter)),
    );
    if (r < minR) continue;
    const z =
      (rng() - 0.5) *
      Math.max(0, opts.depth - r * 2) *
      (sparse ? config.pop.sparseDepth : deep ? 1 : config.pop.denseDepth);
    const gx = Math.floor(x / cell),
      gy = Math.floor(y / cell),
      gz = Math.floor(z / cell);
    let collision = false;
    for (let a = -1; a <= 1 && !collision; a++)
      for (let b = -1; b <= 1 && !collision; b++)
        for (let c = -1; c <= 1 && !collision; c++) {
          for (const index of hash.get(`${gx + a},${gy + b},${gz + c}`) ?? []) {
            const p = out[index];
            if ((x - p.x) ** 2 + (y - p.y) ** 2 + (z - p.z) ** 2 < (r + radii[index]) ** 2) {
              collision = true;
              break;
            }
          }
        }
    if (collision) continue;
    const round = r > (minR + maxR) / 2;
    const weights = objects.map(
      (o) =>
        Math.max(0, o.weight) *
        (!o.sizeRange || (r >= o.sizeRange[0] && r <= o.sizeRange[1])
          ? 1
          : config.pop.categoryBias) *
        (!o.category || (o.category === 'round') === round ? 1 : config.pop.categoryBias),
    );
    let choice = rng() * weights.reduce((a, b) => a + b, 0),
      asset = 0;
    while (asset < weights.length - 1 && choice >= weights[asset]) choice -= weights[asset++];
    const object = objects[asset],
      tilt = config.pop.flatTilt;
    const colors = object.libraryCategory && opts.palette !== 'candy' ? object.palette : palette;
    let color =
      object.source && object.source !== 'builtin'
        ? '#ffffff'
        : colors[Math.floor(rng() * colors.length)];
    if (d < maxR && object.source === 'builtin') {
      const rgb = parseInt(color.slice(1), 16),
        lift = config.pop.edgeLightness;
      color =
        '#' +
        [rgb >> 16, (rgb >> 8) & 255, rgb & 255]
          .map((v) =>
            Math.round(v + (255 - v) * lift)
              .toString(16)
              .padStart(2, '0'),
          )
          .join('');
    }
    out.push({
      x,
      y,
      z,
      rx: object.flat ? Math.PI / 2 + (rng() - 0.5) * 2 * tilt : rng() * Math.PI * 2,
      ry: object.flat ? (rng() - 0.5) * 2 * tilt : rng() * Math.PI * 2,
      rz: object.flat ? (rng() - 0.5) * 2 * tilt : rng() * Math.PI * 2,
      // Packing uses the original exclusion radius; larger visible objects overlap to fill gaps.
      // Limit the full sphere by both the glyph SDF and the front/back depth boundaries.
      scale:
        Math.min(
          r * (opts.coverageScale ?? (sparse ? 1 : config.pop.coverageScale)),
          d,
          opts.depth / 2 - Math.abs(z),
        ) / ((object.radius ?? 0.5) * hull),
      asset,
      color,
      halfHeight: object.halfHeight,
    });
    radii.push(r);
    const key = `${gx},${gy},${gz}`,
      bucket = hash.get(key) ?? [];
    bucket.push(out.length - 1);
    hash.set(key, bucket);
  }
  return out;
}
