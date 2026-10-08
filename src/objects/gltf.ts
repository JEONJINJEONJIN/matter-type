/** GLB의 정적 메시를 월드 변환·색으로 병합, 200삼각형 검증 후 단위 크기로 정규화한다. */
import {
  Box3,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LoadingManager,
  Mesh,
  MeshStandardMaterial,
  Texture,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { config } from '../config';
import { triangleCount } from './builtin';
import type { ObjectAsset } from '../state';
export async function loadGLB(file: File): Promise<ObjectAsset> {
  if (file.size > config.assets.maxFileBytes) throw new Error('GLB 파일은 25MB 이하로 올려주세요.');
  const manager = new LoadingManager();
  manager.setURLModifier((url) => {
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    throw new Error('외부 파일 참조 없는 단일 GLB가 필요합니다.');
  });
  const gltf = await new GLTFLoader(manager).parseAsync(await file.arrayBuffer(), '');
  const parts: BufferGeometry[] = [];
  try {
    gltf.scene.updateMatrixWorld(true);
    let count = 0;
    gltf.scene.traverse((o) => {
      if (o instanceof Mesh) count += triangleCount(o.geometry);
    });
    if (count > config.objects.maxTriangles)
      throw new Error(
        `GLB ${count.toLocaleString()}삼각형: 성능 보호를 위해 ${config.objects.maxTriangles}개 이하로 줄여 다시 올려주세요.`,
      );
    gltf.scene.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      if ('isSkinnedMesh' in o || Object.keys(o.geometry.morphAttributes).length)
        throw new Error('스킨·모프 없는 정적 GLB가 필요합니다.');
      const g: BufferGeometry = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      const pos = g.getAttribute('position'),
        colors: number[] = [];
      for (let i = 0; i < pos.count; i++) {
        const group = g.groups.find((v) => i >= v.start && i < v.start + v.count);
        const m = (
          Array.isArray(o.material) ? o.material[group?.materialIndex ?? 0] : o.material
        ) as MeshStandardMaterial;
        const color = (m.color ?? new Color('white')).clone();
        const vc = g.getAttribute('color');
        if (vc) color.multiply(new Color(vc.getX(i), vc.getY(i), vc.getZ(i)));
        colors.push(color.r, color.g, color.b);
      }
      for (const attr of Object.keys(g.attributes))
        if (attr !== 'position' && attr !== 'normal') g.deleteAttribute(attr);
      if (!g.getAttribute('normal')) g.computeVertexNormals();
      g.setAttribute('color', new Float32BufferAttribute(colors, 3));
      g.clearGroups();
      parts.push(g);
    });
    if (!parts.length) throw new Error('GLB에 정적 메시가 없습니다.');
    const geometry = mergeGeometries(parts)!;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox as Box3,
      center = box.getCenter(new Vector3()),
      size = box.getSize(new Vector3());
    const extent = Math.max(size.x, size.y, size.z);
    if (!extent) {
      geometry.dispose();
      throw new Error('크기가 없는 GLB입니다.');
    }
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(1 / extent, 1 / extent, 1 / extent);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return {
      id: crypto.randomUUID(),
      name: file.name,
      geometry,
      material: new MeshStandardMaterial({
        vertexColors: true,
        roughness: config.objects.gltfRoughness,
      }),
      palette: ['#ffffff'],
      weight: 50,
      halfHeight: -geometry.boundingBox!.min.y,
      source: 'glb',
    };
  } finally {
    parts.forEach((g) => g.dispose());
    gltf.scene.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          Object.values(m).forEach((v) => {
            if (v instanceof Texture) v.dispose();
          });
          m.dispose();
        }
      }
    });
  }
}
