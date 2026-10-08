/** Toon material factory: three bands, instance body tint, fixed vertex accents, optional gloss. */
import {
  Color,
  DataTexture,
  RedFormat,
  NearestFilter,
  MeshToonMaterial,
  MeshStandardMaterial,
} from 'three';
import { config } from '../config';
import { state } from '../state';
import { features } from '../features';
import type { ObjectAsset } from '../state';
export function createToon(object: ObjectAsset) {
  const gradient = new DataTexture(
    new Uint8Array(config.pop.gradient),
    config.pop.gradient.length,
    1,
    RedFormat,
  );
  gradient.minFilter = gradient.magFilter = NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  const source = object.material;
  const physical =
    (config.library.standardShading && object.source === 'builtin') ||
    object.materialPreset === 'chrome' ||
    object.materialPreset === 'glass';
  const material = physical
    ? (source as MeshStandardMaterial).clone()
    : new MeshToonMaterial({
        map: source.map,
        alphaTest: source.alphaTest,
        side: source.side,
        vertexColors: source.vertexColors,
        gradientMap: gradient,
        color: source.color,
      });
  if (
    physical &&
    config.library.glossyIds.includes(object.id) &&
    (!features.gloss || !state.get().gloss)
  )
    (material as MeshStandardMaterial).roughness =
      config.library.materials[object.materialPreset!].roughness;
  const gloss = {
    value:
      features.gloss && state.get().gloss && config.library.glossyIds.includes(object.id)
        ? config.pop.glossStrength
        : 0,
  };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.popGloss = gloss;
    if (object.geometry.hasAttribute('tintMask')) {
      shader.vertexShader = 'attribute float tintMask;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <color_vertex>',
        '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\nvColor.rgb = mix(color.rgb, vColor.rgb, tintMask);\n#endif',
      );
    }
    if (object.geometry.hasAttribute('wear')) {
      shader.uniforms.rustColor = { value: new Color(config.library.rustColor) };
      shader.vertexShader =
        'attribute float wear; attribute float rustMask; uniform vec3 rustColor;\n' +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvColor.rgb = mix(vColor.rgb * wear, rustColor, rustMask);',
      );
    }
    shader.fragmentShader = 'uniform float popGloss;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `outgoingLight += vec3(popGloss * pow(max(dot(normal, normalize(vec3(-0.35,0.65,1.0))),0.0),${config.pop.glossPower.toFixed(1)}));\n#include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () =>
    `surface-${object.geometry.hasAttribute('tintMask')}-${object.geometry.hasAttribute('wear')}`;
  return {
    material,
    gloss,
    dispose() {
      material.dispose();
      gradient.dispose();
    },
  };
}
