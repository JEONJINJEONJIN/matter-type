/** 가벼운 사진 후처리와 저장 시에만 생성하는 SSAO 패스. */
import { Vector2 } from 'three';
import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { config } from '../config';
import { features } from '../features';
import { random, state } from '../state';
export function createPost(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) {
  const composer = new EffectComposer(renderer),
    render = new RenderPass(scene, camera),
    output = new OutputPass();
  const photo = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new Vector2(1, 1) },
      tilt: { value: 1 },
      grain: { value: 1 },
      vignette: { value: 1 },
      seed: { value: config.seed },
      blurStrength: { value: config.post.blur },
      focusStart: { value: config.post.focusStart },
      focusEnd: { value: config.post.focusEnd },
      grainStrength: { value: config.post.grain },
      vignetteStrength: { value: config.post.vignette },
    },
    vertexShader:
      'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float tilt,grain,vignette,seed,blurStrength,focusStart,focusEnd,grainStrength,vignetteStrength; varying vec2 vUv;
    void main(){ vec2 p=vUv-.5; float edge=smoothstep(focusStart,focusEnd,abs(p.y)); vec2 d=vec2(blurStrength)*edge*tilt/resolution;
      vec3 c=texture2D(tDiffuse,vUv).rgb;
      if(tilt > 0.0){ c*=.28;
      c+=(texture2D(tDiffuse,vUv+vec2(d.x,0.)).rgb+texture2D(tDiffuse,vUv-vec2(d.x,0.)).rgb+texture2D(tDiffuse,vUv+vec2(0.,d.y)).rgb+texture2D(tDiffuse,vUv-vec2(0.,d.y)).rgb)*.12;
      c+=(texture2D(tDiffuse,vUv+d).rgb+texture2D(tDiffuse,vUv-d).rgb+texture2D(tDiffuse,vUv+vec2(d.x,-d.y)).rgb+texture2D(tDiffuse,vUv+vec2(-d.x,d.y)).rgb)*.06; }
      vec3 hash=fract(vec3(floor(vUv*resolution).xyx+mod(seed,997.))*0.1031);
      hash+=dot(hash,hash.yzx+33.33);
      float n=fract((hash.x+hash.y)*hash.z)-.5;
      c*=1.-vignette*vignetteStrength*smoothstep(.08,.5,dot(p,p)); c+=n*grain*grainStrength;gl_FragColor=vec4(c,1.); }`,
  });
  composer.addPass(render);
  composer.addPass(output);
  composer.addPass(photo);
  function sync() {
    const s = state.get();
    photo.uniforms.tilt.value = +(features.tiltShift && s.tiltShift);
    photo.uniforms.grain.value = +(features.grain && s.grain);
    photo.uniforms.vignette.value = +(features.vignette && s.vignette);
    photo.uniforms.seed.value = s.seed;
  }
  const unsubscribe = state.subscribe(sync);
  sync();
  let ao: SSAOPass | null = null;
  return {
    composer,
    resize(w: number, h: number, dpr: number) {
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
      photo.uniforms.resolution.value.set(w * dpr, h * dpr);
    },
    render() {
      const s = state.get();
      // Default pop look needs no screen passes; direct rendering preserves output color space.
      if (
        !ao &&
        !(features.tiltShift && s.tiltShift) &&
        !(features.grain && s.grain) &&
        !(features.vignette && s.vignette)
      )
        renderer.render(scene, camera);
      else composer.render();
    },
    exportQuality(enabled: boolean) {
      if (enabled && features.exportAO && state.get().exportAO && !ao) {
        ao = new SSAOPass(scene, camera, renderer.domElement.width, renderer.domElement.height);
        // 라이브러리 기본 난수도 덮어써 저장용 AO를 시드에 고정한다.
        const rng = random(state.get().seed);
        ao.kernel.forEach((sample, i) => {
          sample.set(rng() * 2 - 1, rng() * 2 - 1, rng()).normalize();
          sample.multiplyScalar(0.1 + 0.9 * (i / ao!.kernel.length) ** 2);
        });
        const noise = ao.noiseTexture.image.data as unknown as Float32Array;
        for (let i = 0; i < noise.length; i++) noise[i] = rng() * 2 - 1;
        ao.noiseTexture.needsUpdate = true;
        ao.kernelRadius = config.post.aoRadius;
        ao.minDistance = config.post.aoMin;
        ao.maxDistance = config.post.aoMax;
        composer.insertPass(ao, 1);
      }
      if (!enabled && ao) {
        composer.removePass(ao);
        ao.dispose();
        ao = null;
        render.enabled = true;
      }
    },
    dispose() {
      unsubscribe();
      ao?.dispose();
      render.dispose();
      output.dispose();
      photo.dispose();
      composer.dispose();
    },
  };
}
