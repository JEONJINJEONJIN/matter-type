/** Thicken narrow dimensions inside the existing unit bounding sphere; placement stays unchanged. */
import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { config } from '../config';

export function addVolume(geometry: BufferGeometry) {
  if (!config.library.bulk) return geometry;
  geometry.computeBoundingBox();
  const size = geometry.boundingBox!.getSize(new Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  if (!longest) return geometry;
  const expand = (extent: number) => 1 + config.library.bulk * (1 - extent / longest);
  geometry.scale(expand(size.x), expand(size.y), expand(size.z));
  geometry.computeBoundingSphere();
  // Include center offset so every vertex remains inside the sampler's sphere.
  const sphere = geometry.boundingSphere!;
  const normalize = 1 / (sphere.radius + sphere.center.length());
  geometry.scale(normalize, normalize, normalize);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
