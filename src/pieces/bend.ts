/** 로컬 XY 조각을 완만하게 휘고, 바닥 XZ 좌표계로 회전한다. */
import { BufferAttribute, BufferGeometry } from 'three';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { config } from '../config';
import { features } from '../features';
export function bend(source: BufferGeometry): BufferGeometry {
  let geometry = source;
  if (features.bend) {
    const modifier = new TessellateModifier(
      config.piece.tessellation,
      config.piece.tessellationPasses,
    );
    // TessellateModifier는 material group을 버리므로 앞면·옆면을 따로 처리한 뒤 복원한다.
    if (source.groups.length) {
      const groups = source.groups.map((g) => ({ ...g }));
      const parts = groups.map((group) => {
        const part = new BufferGeometry();
        for (const [name, attribute] of Object.entries(source.attributes)) {
          part.setAttribute(
            name,
            new BufferAttribute(
              attribute.array.slice(
                group.start * attribute.itemSize,
                (group.start + group.count) * attribute.itemSize,
              ),
              attribute.itemSize,
            ),
          );
        }
        const result = modifier.modify(part);
        part.dispose();
        return result;
      });
      geometry = mergeGeometries(parts, true)!;
      geometry.groups.forEach((group, i) => {
        group.materialIndex = groups[i].materialIndex;
      });
      parts.forEach((part) => part.dispose());
    } else geometry = modifier.modify(source);
    source.dispose();
    const pos = geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++)
      pos.setZ(i, pos.getZ(i) + config.piece.bend * (pos.getX(i) ** 2 + pos.getY(i) ** 2));
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingSphere();
  return geometry;
}
