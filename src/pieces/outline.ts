/** 알파 마스크의 닫힌 경계·구멍을 추출해 단순화하고 얇게 돌출한다. 실패 시 겹친 평면으로 대체. */
import { extractContours, shapesFromContours } from '../geometry/contours';
import {
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  SRGBColorSpace,
  Vector2,
} from 'three';
import type { BufferGeometry, Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bend } from './bend';
import { config } from '../config';
import type { Asset } from '../state';
export interface PieceResource {
  geometry: BufferGeometry;
  materials: Material[];
  texture: CanvasTexture;
  fallback?: boolean;
}
export function textureFor(canvas: HTMLCanvasElement) {
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = config.piece.anisotropy;
  return t;
}
export function extruded(shapes: Shape[], w: number, h: number) {
  return new ExtrudeGeometry(shapes, {
    depth: config.piece.thickness,
    bevelEnabled: true,
    bevelThickness: config.piece.bevel,
    bevelSize: config.piece.bevel,
    bevelSegments: config.piece.bevelSegments,
    steps: 1,
    curveSegments: config.outline.curveSegments,
    UVGenerator: {
      generateTopUV: (_g, v, a, b, c) =>
        [a, b, c].map((i) => new Vector2(v[i * 3] / w + 0.5, v[i * 3 + 1] / h + 0.5)),
      generateSideWallUV: () => [
        new Vector2(0, 0),
        new Vector2(1, 0),
        new Vector2(1, 1),
        new Vector2(0, 1),
      ],
    },
  });
}
export function outline(asset: Asset): PieceResource {
  try {
    const shapes = shapesFromContours(extractContours(asset.canvas));
    const aspect = asset.canvas.width / asset.canvas.height;
    const g = extruded(shapes, Math.min(1, aspect), Math.min(1, 1 / aspect));
    g.translate(0, 0, -config.piece.thickness / 2);
    const texture = textureFor(asset.canvas);
    return {
      geometry: bend(g),
      texture,
      materials: [
        new MeshStandardMaterial({
          map: texture,
          roughness: config.piece.roughness,
          metalness: config.piece.metalness,
        }),
        new MeshStandardMaterial({
          color: config.piece.sideColor,
          roughness: config.piece.sideRoughness,
        }),
      ],
    };
  } catch {
    return { ...layers(asset), fallback: true };
  }
}
export function layers(asset: Asset): PieceResource {
  const aspect = asset.canvas.width / asset.canvas.height,
    parts: BufferGeometry[] = [];
  for (let i = 0; i < config.outline.layers; i++) {
    const p = new PlaneGeometry(Math.min(1, aspect), Math.min(1, 1 / aspect), 4, 4).toNonIndexed();
    p.translate(
      0,
      0,
      -config.piece.thickness / 2 + (i * config.piece.thickness) / (config.outline.layers - 1),
    );
    parts.push(p);
  }
  const geometry = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  const texture = textureFor(asset.canvas);
  return {
    geometry: bend(geometry),
    texture,
    materials: [
      new MeshStandardMaterial({
        map: texture,
        alphaTest: config.piece.alphaThreshold / 255,
        side: DoubleSide,
        roughness: config.piece.roughness,
      }),
    ],
  };
}
