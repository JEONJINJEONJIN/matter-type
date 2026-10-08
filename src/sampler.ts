/** Glyph-local TinySDF generation. Positive values are inside; holes stay negative. */
import TinySDF from '@mapbox/tiny-sdf';
import { config } from './config';
import type { Sculpture, SurfacePoint } from './state';
export interface SampleResult extends Sculpture {
  points: SurfacePoint[];
  spacing: number;
}
let rasterizer: TinySDF | undefined;
export function sampleText(
  text: string,
  _size: number,
  _rng: () => number,
  _budget?: number,
): SampleResult {
  rasterizer ??= new TinySDF({
    fontSize: config.pop.fontSize,
    buffer: config.pop.buffer,
    radius: config.pop.sdfRadius,
    cutoff: config.pop.cutoff,
    fontFamily: 'Noto Sans KR',
    fontWeight: '900',
  });
  const glyph = rasterizer.draw(text);
  const unit = config.sculpture.height / Math.max(1, glyph.glyphHeight);
  const width = glyph.glyphWidth * unit,
    height = config.sculpture.height;
  const data = Float32Array.from(
    glyph.data,
    (v) => (v / 255 - (1 - config.pop.cutoff)) * config.pop.sdfRadius * unit,
  );
  const sdf = {
    data,
    width: glyph.width,
    height: glyph.height,
    unit,
    originX: -width / 2 - config.pop.buffer * unit,
    originY: height + config.pop.buffer * unit,
    maxDistance: Math.max(...data),
  };
  return {
    width,
    height,
    depth: config.sculpture.depth,
    contours: [], // Computational mask only: never construct a renderable letter mesh.
    sdf,
    points: [],
    spacing: config.pop.minR * 2,
  };
}
