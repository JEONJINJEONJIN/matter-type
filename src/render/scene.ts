/** 3/4 스튜디오 시점·제한된 OrbitControls·주광/보조광/테두리광·바닥. */
import {
  NoToneMapping,
  DirectionalLight,
  Color,
  Fog,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  Vector3,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { features } from '../features';
import { config } from '../config';
import { state } from '../state';
import { ShadowSchedule } from './shadows';
import { createFloor } from './floors';
export function createScene(canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.performance.previewDpr));
  renderer.toneMapping = NoToneMapping;
  renderer.toneMappingExposure = config.post.exposure;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const scene = new Scene();
  scene.background = new Color(state.get().background);
  scene.fog = new Fog(state.get().background, config.floor.fogNear, config.floor.fogFar);
  const camera = new PerspectiveCamera(config.camera.fov, 1, config.camera.near, config.camera.far);
  const controls = new OrbitControls(camera, canvas);
  let cameraChanged = true;
  controls.addEventListener('change', () => {
    cameraChanged = true;
  });
  controls.enableDamping = true;
  controls.dampingFactor = config.camera.damping;
  controls.enablePan = false;
  controls.minPolarAngle = config.camera.minPolar;
  controls.maxPolarAngle = config.camera.maxPolar;
  controls.autoRotateSpeed = config.camera.autoRotateSpeed;
  controls.enabled = features.orbit;
  const pmrem = new PMREMGenerator(renderer),
    room = new RoomEnvironment();
  const environment = pmrem.fromScene(room);
  scene.environment = environment.texture;
  scene.environmentIntensity = config.light.environment;
  room.dispose();
  pmrem.dispose();
  const sun = new DirectionalLight('#fff3df', config.light.intensity);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(config.light.shadowSize);
  sun.shadow.bias = config.light.shadowBias;
  sun.shadow.normalBias = config.light.normalBias;
  sun.shadow.radius = config.light.shadowRadius;
  const extent = config.light.shadowExtent;
  Object.assign(sun.shadow.camera, {
    left: -extent,
    right: extent,
    top: extent,
    bottom: -extent,
    near: 0.1,
    far: config.camera.far,
  });
  const fill = new DirectionalLight('#e7efff', config.light.fillIntensity);
  const rim = new DirectionalLight('#ffe4c9', config.light.rimIntensity);
  scene.add(fill, fill.target, rim, rim.target);
  scene.add(sun, sun.target, new HemisphereLight('#f2f5f6', '#b4a38e', config.light.hemisphere));
  let maps = createFloor(state.get().floor);
  const floorMaterial = new MeshStandardMaterial({
    color: state.get().background,
    map: null,
    bumpMap: null,
    bumpScale: config.floor.bump,
    roughness: config.floor.roughness,
  });
  const floor = new Mesh(new PlaneGeometry(config.floor.size, config.floor.size), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = config.floor.y;
  floor.receiveShadow = true;
  scene.add(floor);
  let flight: {
    from: Vector3;
    to: Vector3;
    fromTarget: Vector3;
    toTarget: Vector3;
    time: number;
  } | null = null;
  controls.addEventListener('start', () => {
    flight = null;
  });
  let fitted = false;
  let lastBounds = '';
  const fit = (reset = false) => {
    const { width, height, depth } = state.get().bounds;
    const target = new Vector3(0, height / 2, 0);
    const direction =
      fitted && !reset
        ? camera.position.clone().sub(controls.target).normalize()
        : new Vector3(
            Math.sin(config.camera.azimuth) * Math.cos(config.camera.elevation),
            Math.sin(config.camera.elevation),
            Math.cos(config.camera.azimuth) * Math.cos(config.camera.elevation),
          );
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), direction).normalize();
    const up = new Vector3().crossVectors(direction, right).normalize();
    const tanV = Math.tan((camera.fov * Math.PI) / 360),
      tanH = tanV * Math.max(config.camera.minAspect, camera.aspect);
    let distance = 0;
    for (const x of [-1, 1])
      for (const y of [-1, 1])
        for (const z of [-1, 1]) {
          const corner = new Vector3(
            x * (width / 2 + config.sculpture.spacing),
            y * (height / 2 + config.sculpture.spacing),
            z * (depth / 2 + config.layout.groundSpread),
          );
          distance = Math.max(
            distance,
            Math.abs(corner.dot(up)) / tanV + corner.dot(direction),
            Math.abs(corner.dot(right)) / tanH + corner.dot(direction),
          );
        }
    distance *= config.camera.margin;
    controls.target.copy(target);
    camera.position.copy(target).addScaledVector(direction, distance);
    controls.minDistance = distance * config.camera.minZoom;
    controls.maxDistance = distance * config.camera.maxZoom;
    camera.far = Math.max(config.camera.far, controls.maxDistance * 2);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    controls.update();
    fitted = true;
  };
  const light = () => {
    const s = state.get(),
      elevation = (s.lightHeight * Math.PI) / 180,
      radius = Math.max(config.light.distance, s.bounds.width, s.bounds.height);
    const centerY = s.bounds.height / 2;
    sun.target.position.set(0, centerY, 0);
    sun.position.set(
      Math.cos(s.lightAngle) * Math.cos(elevation) * radius,
      centerY + Math.sin(elevation) * radius,
      Math.sin(s.lightAngle) * Math.cos(elevation) * radius,
    );
    fill.position.set(-radius, centerY + radius / 2, radius);
    fill.target.position.set(0, centerY, 0);
    rim.position.set(radius / 2, centerY + radius / 2, -radius);
    rim.target.position.set(0, centerY, 0);
    const shadowExtent = Math.max(
      config.light.shadowExtent,
      s.bounds.width / 2 + s.bounds.depth,
      s.bounds.height,
    );
    sun.shadow.camera.far = radius * 4;
    (scene.fog as Fog).near = camera.position.length() * 1.4;
    (scene.fog as Fog).far = camera.position.length() * 3;
    floor.scale.setScalar(
      Math.max(
        1,
        (s.bounds.width / config.floor.size) * 3,
        (s.bounds.height / config.floor.size) * 3,
      ),
    );
    Object.assign(sun.shadow.camera, {
      left: -shadowExtent,
      right: shadowExtent,
      top: shadowExtent,
      bottom: -shadowExtent,
    });
    sun.shadow.camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  };
  const unsubscribe = state.subscribe((s, keys) => {
    if (keys.has('background')) {
      (scene.background as Color).set(s.background);
      (scene.fog as Fog).color.set(s.background);
      floorMaterial.color.set(s.background);
    }
    if (keys.has('bounds')) {
      flight = null;
      const dimensions = JSON.stringify(s.bounds);
      if (dimensions !== lastBounds) {
        fit(true);
        lastBounds = dimensions;
        light();
      }
    }
    if (keys.has('focusRequest')) {
      const from = camera.position.clone(),
        fromTarget = controls.target.clone(),
        glyph = s.focusGlyph;
      if (glyph) {
        const target = new Vector3(
          glyph.x,
          glyph.y + (glyph.sculpture.height * glyph.scale) / 2,
          0,
        );
        const distance =
          ((Math.max(glyph.sculpture.height, glyph.sculpture.width / camera.aspect) * glyph.scale) /
            2 /
            Math.tan((camera.fov * Math.PI) / 360)) *
          config.camera.focusMargin;
        const direction = camera.position.clone().sub(controls.target).normalize();
        controls.minDistance = Math.min(controls.minDistance, distance / 2);
        flight = {
          from,
          to: target.clone().addScaledVector(direction, distance),
          fromTarget,
          toTarget: target,
          time: 0,
        };
      } else {
        fit();
        const to = camera.position.clone(),
          toTarget = controls.target.clone();
        camera.position.copy(from);
        controls.target.copy(fromTarget);
        flight = { from, to, fromTarget, toTarget, time: 0 };
      }
    }
    if (keys.has('sweep') || keys.has('busy'))
      controls.enabled = features.orbit && !s.sweep && !s.busy;
    if (keys.has('lightAngle') || keys.has('lightHeight')) light();
    if (keys.has('floor')) {
      maps.color.dispose();
      maps.bump.dispose();
      maps = createFloor(s.floor);
      floorMaterial.color.set('#ffffff');
      floorMaterial.map = maps.color;
      floorMaterial.bumpMap = maps.bump;
      floorMaterial.needsUpdate = true;
    }
    if (keys.has('targets')) {
      const size =
        s.targets.length > config.light.qualityThreshold
          ? config.light.reducedShadowSize
          : config.light.shadowSize;
      if (sun.shadow.mapSize.x !== size) {
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
        sun.shadow.mapSize.setScalar(size);
      }
      renderer.shadowMap.needsUpdate = true;
    }
  });
  light();
  fit();
  const shadows = new ShadowSchedule(config.performance.movingShadowHz);
  return {
    renderer,
    scene,
    camera,
    sun,
    updateObjectShadows(changed: boolean, dt: number) {
      const refresh = shadows.update(changed, dt);
      if (refresh) renderer.shadowMap.needsUpdate = true;
      return refresh;
    },
    update(dt: number) {
      if (flight) {
        flight.time += dt;
        const t = Math.min(1, flight.time / config.camera.focusDuration),
          ease = t * t * (3 - 2 * t);
        camera.position.lerpVectors(flight.from, flight.to, ease);
        controls.target.lerpVectors(flight.fromTarget, flight.toTarget, ease);
        cameraChanged = true;
        if (t === 1) flight = null;
      }
      controls.autoRotate =
        features.orbit &&
        features.autoRotate &&
        state.get().autoRotate &&
        !state.get().sweep &&
        !flight;
      controls.update(dt);
      const changed = cameraChanged;
      cameraChanged = false;
      return changed;
    },
    resize(w: number, h: number) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      fit();
    },
    dispose() {
      unsubscribe();
      controls.dispose();
      maps.color.dispose();
      maps.bump.dispose();
      floorMaterial.dispose();
      floor.geometry.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
