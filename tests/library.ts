/** Visual contact sheet using the production materials and procedural library. */
import {
  AmbientLight,
  Color,
  DirectionalLight,
  InstancedMesh,
  Matrix4,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
  PMREMGenerator,
  SRGBColorSpace,
  NoToneMapping,
  Euler,
  Quaternion,
  Vector3,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createBuiltins, triangleCount } from '../src/objects/builtin';
import { createToon } from '../src/render/toon';
const canvas = document.querySelector('canvas')!;
const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(1260, 780);
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = NoToneMapping;
const scene = new Scene(),
  camera = new OrthographicCamera(-10.5, 10.5, 6.5, -6.5, 0.1, 100);
camera.position.z = 30;
const pmrem = new PMREMGenerator(renderer),
  room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room).texture;
room.dispose();
scene.add(new AmbientLight('white', 0.65));
const light = new DirectionalLight('white', 1.8);
light.position.set(-4, 6, 8);
scene.add(light);
const models = createBuiltins(),
  gallery = document.querySelector('#gallery')!;
models.forEach((o, i) => {
  const material = createToon(o).material;
  const mesh = new InstancedMesh(o.geometry, material, 1);
  const pose = new Matrix4().compose(
    new Vector3(((i % 7) - 3) * 3, (1.5 - Math.floor(i / 7)) * 3.25 + 0.3, 0),
    new Quaternion().setFromEuler(new Euler(Math.PI / 2 + 0.28, -0.25, -0.16)),
    new Vector3(0.95, 0.95, 0.95),
  );
  mesh.setMatrixAt(0, pose);
  mesh.setColorAt(0, new Color(o.palette[i % o.palette.length]));
  scene.add(mesh);
  const row = document.createElement('article');
  row.innerHTML = `<b>${o.name}</b><small>${triangleCount(o.geometry)} tris · ${o.materialPreset} · ${o.massClass}</small>`;
  gallery.append(row);
});
renderer.render(scene, camera);
document.querySelector('#status')!.textContent = '완료: 25종, 생산용 지오메트리·재질 사용';
