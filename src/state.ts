/** 유일한 앱 상태와 변경 알림. 모듈 간 런타임 통신은 이 store를 통한다. */
import type { BufferGeometry, MeshStandardMaterial, MeshToonMaterial } from 'three';
import { config } from './config';
import { features } from './features';
export type LayoutMode = 'dense' | 'sparse' | 'drip';
export type PieceMode = 'auto' | 'outline' | 'card' | 'layers';
export type FloorMode = 'paper' | 'wood' | 'concrete';
export interface Asset {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  transparent: boolean;
  preview: string;
}
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface SurfacePoint {
  position: Vec3;
  normal: Vec3;
  kind: 'front' | 'back' | 'side' | 'rim';
  edge?: boolean;
}
export interface SDFField {
  data: Float32Array;
  width: number;
  height: number;
  unit: number;
  originX: number;
  originY: number;
  maxDistance: number;
}
export interface Sculpture {
  sdf?: SDFField;
  width: number;
  height: number;
  depth: number;
  contours: [number, number][][];
}

import type { LibraryCategory, MaterialPreset, MassClass } from './objects/library';
export interface ObjectAsset {
  libraryCategory?: LibraryCategory;
  materialPreset?: MaterialPreset;
  massClass?: MassClass;
  sizeRange?: readonly [number, number];
  id: string;
  name: string;
  geometry: BufferGeometry;
  material: MeshStandardMaterial | MeshToonMaterial;
  radius?: number;
  category?: 'round' | 'angular';
  flat?: boolean;
  palette: readonly string[];
  weight: number;
  halfHeight: number;
  source: 'builtin' | 'image' | 'glb';
}
export interface GlyphInstance {
  id: string;
  char: string;
  x: number;
  y: number;
  scale: number;
  order: number;
  variation: number;
  sculpture: Sculpture;
}
export interface Transform {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
  asset: number;
  key?: string;
  glyph?: string;
  order?: number;
  color?: string;
  halfHeight?: number;
  grounded?: boolean;
}
export interface SceneState {
  minR: number;
  maxR: number;
  density: number;
  letterGap: number;
  palette: keyof typeof config.pop.palettes;
  popOutline: boolean;
  outlineWidth: number;
  background: string;
  gloss: boolean;
  text: string;
  objects: ObjectAsset[];
  glyphs: GlyphInstance[];
  focusRay: { origin: Vec3; direction: Vec3 } | null;
  focusGlyph: GlyphInstance | null;
  focusRequest: number;
  textRevision: number;
  layout: LayoutMode;
  mode: PieceMode;
  seed: number;
  pieceSize: number;
  assets: Asset[];
  targets: Transform[];
  bounds: { width: number; height: number; depth: number };
  sculpture: Sculpture | null;
  autoRotate: boolean;
  sweep: boolean;
  sweepRadius: number;
  lightAngle: number;
  lightHeight: number;
  floor: FloorMode;
  tiltShift: boolean;
  grain: boolean;
  vignette: boolean;
  exportAO: boolean;
  busy: boolean;
  ready: boolean;
  error: string;
  notice: string;
  exportRequest: number;
  selectedSample: string;
  animating: boolean;
  sweepStroke: { position: Vec3; viewDirection: Vec3 } | null;
  peelRay: { origin: Vec3; direction: Vec3 } | null;
}
export type StateKey = keyof SceneState;
let value: SceneState = {
  minR: config.pop.minR,
  maxR: config.pop.maxR,
  density: config.pop.density,
  letterGap: config.sentence.letterGap,
  palette: 'primary',
  popOutline: features.popOutline && config.library.outlinesByDefault,
  outlineWidth: config.pop.outlineWidth,
  background: config.pop.background,
  gloss: features.gloss,
  text: config.text.initial,
  objects: [],
  glyphs: [],
  focusRay: null,
  focusGlyph: null,
  focusRequest: 0,
  textRevision: 0,
  layout: 'dense',
  mode: 'auto',
  seed: config.seed,
  pieceSize: config.piece.size,
  assets: [],
  targets: [],
  bounds: {
    width: config.sample.width,
    height: config.sculpture.height,
    depth: config.sculpture.depth,
  },
  sculpture: null,
  autoRotate: false,
  sweep: false,
  sweepRadius: config.sweep.radius,
  lightAngle: config.light.angle,
  lightHeight: config.light.height,
  floor: 'paper',
  tiltShift: features.tiltShift,
  grain: false,
  vignette: false,
  exportAO: false,
  busy: false,
  ready: false,
  error: '',
  notice: '',
  exportRequest: 0,
  selectedSample: 'candy',
  animating: false,
  sweepStroke: null,
  peelRay: null,
};
const listeners = new Set<(state: SceneState, keys: Set<StateKey>) => void>();
export const state = {
  get: () => value,
  set(patch: Partial<SceneState>) {
    const keys = new Set(
      Object.keys(patch).filter((k) => value[k as StateKey] !== patch[k as StateKey]) as StateKey[],
    );
    if (!keys.size) return;
    value = { ...value, ...patch };
    listeners.forEach((listener) => listener(value, keys));
  },
  subscribe(listener: (state: SceneState, keys: Set<StateKey>) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
/** 재현 가능한 mulberry32 PRNG. 정수 상수는 알고리즘 정의. */
export function random(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
