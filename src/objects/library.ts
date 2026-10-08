/** Editable object definitions. A local glbPath overrides its procedural fallback. */
import { MeshStandardMaterial } from 'three';
import type { BufferGeometry } from 'three';
import { config } from '../config';
import type { ObjectAsset } from '../state';
import { triangleCount } from './popForms';
import { wasteGeometry } from './wasteForms';
import { addVolume } from './volume';
export type LibraryCategory = 'packaging' | 'paper' | 'broken' | 'junk';
export type MaterialPreset = 'plastic' | 'glass' | 'chrome' | 'clay' | 'paper';
export type MassClass = 'light' | 'medium' | 'heavy';
export interface ObjectDefinition {
  id: string;
  name: string;
  category: LibraryCategory;
  geometry: () => BufferGeometry;
  glbPath?: string;
  material: MaterialPreset;
  sizeRange: readonly [number, number];
  weight: MassClass;
  shape?: 'round' | 'angular';
  flat?: boolean;
}
export const categories: Record<LibraryCategory, string> = {
  packaging: '음료·음식 쓰레기',
  paper: '종이류',
  broken: '망가진 물건',
  junk: '잡동사니',
};
const size = config.library.radiusRange;
export const objectLibrary: ObjectDefinition[] = [
  {
    id: 'can',
    name: '찌그러진 캔',
    category: 'packaging',
    geometry: () => wasteGeometry('can'),
    material: 'chrome',
    sizeRange: size,
    weight: 'light',
    flat: false,
    shape: 'round',
  },
  {
    id: 'bottle',
    name: '페트병',
    category: 'packaging',
    geometry: () => wasteGeometry('bottle'),
    material: 'plastic',
    sizeRange: size,
    weight: 'light',
    flat: false,
    shape: 'round',
  },
  {
    id: 'cap',
    name: '병뚜껑',
    category: 'packaging',
    geometry: () => wasteGeometry('cap'),
    material: 'chrome',
    sizeRange: size,
    weight: 'light',
    flat: false,
    shape: 'round',
  },
  {
    id: 'straw',
    name: '빨대',
    category: 'packaging',
    geometry: () => wasteGeometry('straw'),
    material: 'plastic',
    sizeRange: size,
    weight: 'light',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'snack',
    name: '과자 봉지',
    category: 'packaging',
    geometry: () => wasteGeometry('snack'),
    material: 'plastic',
    sizeRange: size,
    weight: 'light',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'noodle',
    name: '컵라면 용기',
    category: 'packaging',
    geometry: () => wasteGeometry('noodle'),
    material: 'paper',
    sizeRange: size,
    weight: 'light',
    flat: false,
    shape: 'round',
  },
  {
    id: 'chopsticks',
    name: '나무젓가락',
    category: 'packaging',
    geometry: () => wasteGeometry('chopsticks'),
    material: 'paper',
    sizeRange: size,
    weight: 'light',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'paper',
    name: '구겨진 종이',
    category: 'paper',
    geometry: () => wasteGeometry('paper'),
    material: 'paper',
    sizeRange: size,
    weight: 'light',
    flat: false,
    shape: 'round',
  },
  {
    id: 'receipt',
    name: '영수증',
    category: 'paper',
    geometry: () => wasteGeometry('receipt'),
    material: 'paper',
    sizeRange: size,
    weight: 'light',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'cardboard',
    name: '찢어진 박스 조각',
    category: 'paper',
    geometry: () => wasteGeometry('cardboard'),
    material: 'paper',
    sizeRange: size,
    weight: 'light',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'notebook',
    name: '쓰다 만 공책 조각',
    category: 'paper',
    geometry: () => wasteGeometry('notebook'),
    material: 'paper',
    sizeRange: size,
    weight: 'light',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'stub',
    name: '몽당연필',
    category: 'broken',
    geometry: () => wasteGeometry('stub'),
    material: 'clay',
    sizeRange: size,
    weight: 'light',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'comb',
    name: '부러진 빗',
    category: 'broken',
    geometry: () => wasteGeometry('comb'),
    material: 'plastic',
    sizeRange: size,
    weight: 'light',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'mug',
    name: '깨진 머그컵 조각',
    category: 'broken',
    geometry: () => wasteGeometry('mug'),
    material: 'clay',
    sizeRange: size,
    weight: 'medium',
    flat: false,
    shape: 'round',
  },
  {
    id: 'sock',
    name: '한 짝 양말',
    category: 'broken',
    geometry: () => wasteGeometry('sock'),
    material: 'paper',
    sizeRange: size,
    weight: 'light',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'battery',
    name: '다 쓴 건전지',
    category: 'broken',
    geometry: () => wasteGeometry('battery'),
    material: 'chrome',
    sizeRange: size,
    weight: 'heavy',
    flat: false,
    shape: 'round',
  },
  {
    id: 'earbuds',
    name: '엉킨 이어폰 줄',
    category: 'broken',
    geometry: () => wasteGeometry('earbuds'),
    material: 'plastic',
    sizeRange: size,
    weight: 'light',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'lighter',
    name: '빈 라이터',
    category: 'broken',
    geometry: () => wasteGeometry('lighter'),
    material: 'plastic',
    sizeRange: size,
    weight: 'light',
    flat: false,
    shape: 'round',
  },
  {
    id: 'rubber',
    name: '고무줄',
    category: 'junk',
    geometry: () => wasteGeometry('rubber'),
    material: 'clay',
    sizeRange: size,
    weight: 'light',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'tape',
    name: '테이프 조각',
    category: 'junk',
    geometry: () => wasteGeometry('tape'),
    material: 'paper',
    sizeRange: size,
    weight: 'light',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'button',
    name: '단추',
    category: 'junk',
    geometry: () => wasteGeometry('button'),
    material: 'plastic',
    sizeRange: size,
    weight: 'light',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'key',
    name: '녹슨 열쇠',
    category: 'junk',
    geometry: () => wasteGeometry('key'),
    material: 'chrome',
    sizeRange: size,
    weight: 'medium',
    flat: true,
    shape: 'angular',
  },
  {
    id: 'ring',
    name: '반지',
    category: 'junk',
    geometry: () => wasteGeometry('ring'),
    material: 'chrome',
    sizeRange: size,
    weight: 'medium',
    flat: false,
    shape: 'round',
  },
  {
    id: 'pebble',
    name: '돌멩이',
    category: 'junk',
    geometry: () => wasteGeometry('pebble'),
    material: 'clay',
    sizeRange: size,
    weight: 'heavy',
    flat: false,
    shape: 'round',
  },
  {
    id: 'coin',
    name: '동전',
    category: 'junk',
    geometry: () => wasteGeometry('coin'),
    material: 'chrome',
    sizeRange: size,
    weight: 'heavy',
    flat: true,
    shape: 'angular',
  },
];
export function materialFor(preset: MaterialPreset, id = '') {
  const p = config.library.materials[preset];
  return new MeshStandardMaterial({
    vertexColors: true,
    roughness: config.library.glossyIds.includes(id) ? config.library.glossRoughness : p.roughness,
    metalness: p.metalness,
    transparent: p.opacity < 1,
    opacity: p.opacity,
    depthWrite: p.opacity === 1,
  });
}
function metadata(d: ObjectDefinition) {
  return {
    id: d.id,
    name: d.name,
    libraryCategory: d.category,
    materialPreset: d.material,
    sizeRange: d.sizeRange,
    massClass: d.weight,
    category: d.shape ?? ('round' as const),
    flat: d.flat,
    palette: config.library.categoryPalettes[d.category],
    weight: config.pop.defaultWeights[d.id as keyof typeof config.pop.defaultWeights] ?? 0,
    source: 'builtin' as const,
  };
}
export function createBuiltins(): ObjectAsset[] {
  return objectLibrary.map((d) => {
    const geometry = addVolume(d.geometry());
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    if (triangleCount(geometry) > config.objects.maxTriangles)
      throw new Error(`${d.name}: ${triangleCount(geometry)} triangles exceeds budget`);
    return {
      ...metadata(d),
      geometry,
      material: materialFor(d.material, d.id),
      radius: geometry.boundingSphere!.radius,
      halfHeight: -geometry.boundingBox!.min.y,
    };
  });
}
/** Local, self-contained GLBs only; a failed override keeps the procedural fallback. */
export async function applyLibraryOverrides(
  objects: ObjectAsset[],
  onError: (message: string) => void = console.warn,
) {
  const { loadGLB } = await import('./gltf');
  for (const d of objectLibrary)
    if (d.glbPath) {
      try {
        const url = new URL(d.glbPath, location.href);
        if (url.origin !== location.origin)
          throw new Error('라이브러리 GLB는 같은 사이트의 로컬 경로를 사용하세요.');
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${d.name}: GLB ${response.status}`);
        const asset = await loadGLB(new File([await response.blob()], `${d.id}.glb`));
        const index = objects.findIndex((o) => o.id === d.id);
        const previous = objects[index];
        asset.material.dispose();
        objects[index] = { ...asset, ...metadata(d), material: materialFor(d.material, d.id) };
        previous.geometry.dispose();
        previous.material.dispose();
      } catch (error) {
        onError(`${d.name}: ${String(error)} — 기본 형태를 사용합니다.`);
      }
    }
  return objects;
}
