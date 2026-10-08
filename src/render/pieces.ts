/** 종류별 단일 InstancedMesh, 인스턴스 색과 행렬, 작은 물체 그림자 생략. */
import {
  Color,
  BackSide,
  MeshBasicMaterial,
  DynamicDrawUsage,
  InstancedMesh,
  MeshDepthMaterial,
  Object3D,
  RGBADepthPacking,
} from 'three';
import type { Scene } from 'three';
import { state } from '../state';
import { features } from '../features';
import { config } from '../config';
import { createToon } from './toon';
import { recolorGeometry } from '../objects/builtin';
import { Motion } from '../tween';
import { createObjectPicker } from './picking';
export function createPieces(scene: Scene) {
  const pick = createObjectPicker();
  const motion = new Motion(),
    meshes: InstancedMesh[] = [],
    dummy = new Object3D(),
    colors = new Map<string, Color>();
  const hulls: InstancedMesh[] = [],
    toons: ReturnType<typeof createToon>[] = [];
  const ink = new MeshBasicMaterial({ color: config.pop.ink, side: BackSide });
  let dirty = true,
    ids = '';
  const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
  depth.onBeforeCompile = (shader) => {
    shader.uniforms.minShadowSize = {
      value: config.performance.smallObjectShadows ? 0 : config.performance.shadowObjectSize,
    };
    shader.vertexShader =
      'uniform float minShadowSize;\nvarying float shadowVisible;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\nshadowVisible = step(minShadowSize, length(instanceMatrix[0].xyz));`,
    );
    shader.fragmentShader = 'varying float shadowVisible;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      '#include <clipping_planes_fragment>\nif(shadowVisible < .5) discard;',
    );
  };
  function release() {
    meshes.forEach((m) => {
      scene.remove(m);
      m.dispose();
    });
    meshes.length = 0;
    colors.clear();
    hulls.forEach((m) => {
      scene.remove(m);
      m.dispose();
    });
    hulls.length = 0;
    toons.forEach((t) => t.dispose());
    toons.length = 0;
  }
  function rebuild() {
    const objects = state.get().objects,
      next = objects.map((o) => o.id).join('|');
    if (next === ids) return;
    ids = next;
    release();
    for (const object of objects) {
      const toon = createToon(object);
      toons.push(toon);
      recolorGeometry(object.geometry, config.pop.palettes[state.get().palette]);
      const mesh = new InstancedMesh(object.geometry, toon.material, config.library.instanceBatch);
      const hull = new InstancedMesh(object.geometry, ink, config.library.instanceBatch);
      hull.name = `outline-${object.id}`;
      hull.frustumCulled = false;
      hull.count = 0;
      hull.instanceMatrix.setUsage(DynamicDrawUsage);
      hull.visible = features.popOutline && state.get().popOutline;
      hulls.push(hull);
      scene.add(hull);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.customDepthMaterial = depth;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      scene.add(mesh);
      meshes.push(mesh);
    }
    dirty = true;
  }
  function grow(mesh: InstancedMesh, capacity: number) {
    const next = new InstancedMesh(mesh.geometry, mesh.material, capacity);
    next.name = mesh.name;
    next.visible = mesh.visible;
    next.frustumCulled = false;
    next.castShadow = mesh.castShadow;
    next.receiveShadow = mesh.receiveShadow;
    next.customDepthMaterial = mesh.customDepthMaterial;
    next.instanceMatrix.setUsage(DynamicDrawUsage);
    next.count = 0;
    scene.remove(mesh);
    mesh.dispose();
    scene.add(next);
    return next;
  }
  const unsubscribe = state.subscribe((s, keys) => {
    if (keys.has('objects')) rebuild();
    if (keys.has('palette'))
      s.objects.forEach((o) => recolorGeometry(o.geometry, config.pop.palettes[s.palette]));
    if (keys.has('gloss'))
      toons.forEach((t, i) => {
        const object = s.objects[i];
        if (
          'roughness' in t.material &&
          object.materialPreset &&
          config.library.glossyIds.includes(object.id)
        )
          t.material.roughness =
            features.gloss && s.gloss
              ? config.library.glossRoughness
              : config.library.materials[object.materialPreset].roughness;

        t.gloss.value =
          features.gloss && s.gloss && config.library.glossyIds.includes(s.objects[i].id)
            ? config.pop.glossStrength
            : 0;
      });
    if (keys.has('popOutline') || keys.has('outlineWidth')) {
      hulls.forEach((m) => (m.visible = features.popOutline && s.popOutline));
      dirty = true;
    }
    const peeling = keys.has('peelRay') && features.sweep,
      focusing = keys.has('focusRay') && features.orbit;
    const request = peeling ? s.peelRay : focusing ? s.focusRay : null;
    if (request) {
      const hit = pick(request.origin, request.direction, s.objects, motion.pieces);
      if (peeling && hit)
        state.set({
          sweepStroke: {
            position: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
            viewDirection: request.direction,
          },
        });
      if (focusing)
        state.set({
          focusRequest: s.focusRequest + 1,
          focusGlyph: hit ? (s.glyphs.find((g) => g.id === hit.transform.glyph) ?? null) : null,
        });
    }
    if (keys.has('targets')) {
      motion.retarget(s.targets, s.seed);
      dirty = true;
    }
    if (keys.has('sweepStroke') && features.sweep && s.sweepStroke) {
      motion.peel(s.sweepStroke.position, s.sweepStroke.viewDirection, s.sweepRadius, s.seed);
      dirty = true;
    }
  });
  return {
    motion,
    markDirty() {
      dirty = true;
    },
    update(dt: number) {
      const changed = motion.update(dt) || dirty;
      if (!changed) return false;
      if (state.get().animating !== motion.attaching) state.set({ animating: motion.attaching });
      const required = meshes.map(() => 0);
      for (const p of motion.pieces)
        if (p.current.scale > 0 && required[p.current.asset] !== undefined)
          required[p.current.asset]++;
      required.forEach((count, i) => {
        if (count <= meshes[i].instanceMatrix.count) return;
        const capacity = Math.max(config.library.instanceBatch, 2 ** Math.ceil(Math.log2(count)));
        meshes[i] = grow(meshes[i], capacity);
        hulls[i] = grow(hulls[i], capacity);
      });
      const counts = meshes.map(() => 0);
      for (const p of motion.pieces) {
        const t = p.current,
          mesh = meshes[t.asset];
        if (!mesh || t.scale <= 0) continue;
        dummy.position.set(t.x, t.y, t.z);
        dummy.rotation.set(t.rx, t.ry, t.rz);
        dummy.scale.setScalar(t.scale);
        dummy.updateMatrix();
        const i = counts[t.asset]++;
        mesh.setMatrixAt(i, dummy.matrix);
        const hex = t.color ?? '#ffffff';
        let tint = colors.get(hex);
        if (!tint) {
          tint = new Color(hex);
          colors.set(hex, tint);
        }
        mesh.setColorAt(i, tint);
        if (hulls[t.asset].visible) {
          const elements = dummy.matrix.elements,
            factor = 1 + state.get().outlineWidth;
          // Scale only the basis, preserving translation and avoiding a second Euler composition.
          for (let column = 0; column < 3; column++)
            for (let row = 0; row < 3; row++) elements[column * 4 + row] *= factor;
          hulls[t.asset].setMatrixAt(i, dummy.matrix);
        }
      }
      meshes.forEach((m, i) => {
        m.count = counts[i];
        const hull = hulls[i];
        hull.count = m.count;
        hull.instanceMatrix.clearUpdateRanges();
        if (hull.count) hull.instanceMatrix.addUpdateRange(0, hull.count * 16);
        hull.instanceMatrix.needsUpdate = true;
        m.instanceMatrix.clearUpdateRanges();
        if (m.count) m.instanceMatrix.addUpdateRange(0, m.count * 16);
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) {
          m.instanceColor.clearUpdateRanges();
          if (m.count) m.instanceColor.addUpdateRange(0, m.count * 3);
          m.instanceColor.needsUpdate = true;
        }
      });
      dirty = false;
      return true;
    },
    dispose() {
      unsubscribe();
      release();
      depth.dispose();
      ink.dispose();
    },
  };
}
