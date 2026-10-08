/** Array registry. Every arrangement obeys the same SDF containment and sphere budget. */
import { config } from './config';
import { features } from './features';
import { packSDF } from './sdfPlacement';
import type { LayoutMode, ObjectAsset, SDFField, SurfacePoint, Transform } from './state';
export interface LayoutOptions {
  sdf?: SDFField;
  minR?: number;
  maxR?: number;
  density?: number;
  coverageScale?: number;
  outlineWidth?: number;
  palette?: keyof typeof config.pop.palettes;
  size: number;
  spacing: number;
  height: number;
  depth: number;
  budget: number;
}
export type LayoutObject = Pick<
  ObjectAsset,
  | 'weight'
  | 'halfHeight'
  | 'palette'
  | 'radius'
  | 'category'
  | 'flat'
  | 'source'
  | 'libraryCategory'
  | 'sizeRange'
>;
export type LayoutEngine = (
  points: SurfacePoint[],
  objects: LayoutObject[],
  opts: LayoutOptions,
  rng: () => number,
) => Transform[];
export const dense: LayoutEngine = (_p, o, opts, rng) => (opts.sdf ? packSDF(o, opts, rng) : []);
export const sparse: LayoutEngine = (_p, o, opts, rng) =>
  opts.sdf ? packSDF(o, opts, rng, true) : [];
export const drip: LayoutEngine = (_p, o, opts, rng) =>
  opts.sdf ? packSDF(o, opts, rng, false, true) : [];
export const layouts: Record<LayoutMode, LayoutEngine> = {
  dense,
  sparse: features.sparse ? sparse : dense,
  drip: features.drip ? drip : dense,
};
