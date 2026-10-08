/** 글자 몸체 없이 실제 물체의 경량 경계구→삼각형 raycast로 가장 가까운 물체를 찾는다. */
import { Mesh, Object3D, Raycaster, Sphere, Vector3 } from 'three';
import type { Intersection } from 'three';
import type { ObjectAsset, Transform, Vec3 } from '../state';
interface Pickable {
  current: Transform;
  detached: boolean;
  departing: boolean;
}
export function createObjectPicker() {
  const raycaster = new Raycaster(),
    sphere = new Sphere(),
    pose = new Object3D();
  let proxy: Mesh | null = null;
  return (origin: Vec3, direction: Vec3, objects: ObjectAsset[], pieces: Pickable[]) => {
    raycaster.set(
      new Vector3(origin.x, origin.y, origin.z),
      new Vector3(direction.x, direction.y, direction.z).normalize(),
    );
    raycaster.far = Infinity;
    let result: { point: Vector3; transform: Transform } | null = null;
    const hits: Intersection[] = [];
    for (const piece of pieces) {
      const t = piece.current,
        object = objects[t.asset];
      if (!object || t.scale <= 0 || piece.detached || piece.departing || t.grounded) continue;
      if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
      const bound = object.geometry.boundingSphere!;
      sphere.center.set(t.x, t.y, t.z);
      sphere.radius = (bound.radius + bound.center.length()) * t.scale;
      if (!raycaster.ray.intersectsSphere(sphere)) continue;
      pose.position.set(t.x, t.y, t.z);
      pose.rotation.set(t.rx, t.ry, t.rz);
      pose.scale.setScalar(t.scale);
      pose.updateMatrix();
      if (!proxy) proxy = new Mesh(object.geometry, object.material);
      proxy.geometry = object.geometry;
      proxy.material = object.material;
      proxy.matrixWorld.copy(pose.matrix);
      hits.length = 0;
      proxy.raycast(raycaster, hits);
      for (const hit of hits)
        if (hit.distance < raycaster.far) {
          raycaster.far = hit.distance;
          result = { point: hit.point.clone(), transform: t };
        }
    }
    return result;
  };
}
