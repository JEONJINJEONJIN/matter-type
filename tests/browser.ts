/** 실제 Canvas·폰트·GLB·글자 캐시·기능 스위치를 검증하는 브라우저 회귀 검사. */
import '@fontsource/noto-sans-kr/900.css';
import {
  Scene,
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  Raycaster,
  Vector3,
} from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { config } from '../src/config';
import { state, random } from '../src/state';
import { features } from '../src/features';
import { createSamples, loadImage } from '../src/pieces/samples';
import { objectLibrary, applyLibraryOverrides } from '../src/objects/library';
import { createBuiltins, triangleCount } from '../src/objects/builtin';
import { inflate } from '../src/objects/inflate';
import { loadGLB } from '../src/objects/gltf';
import { TextLayout } from '../src/textLayout';
import { dense } from '../src/layout';
import { createPieces } from '../src/render/pieces';
import { distanceAt } from '../src/sdfPlacement';
import { createPlacementWorker } from '../src/placementClient';
import { createUI } from '../src/ui';
const out = document.querySelector('#results')!;
let checks = 0;
const check = (condition: boolean, name: string) => {
  if (!condition) throw new Error(name);
  checks++;
  out.textContent += `PASS ${name}\n`;
};
const release = (object: ReturnType<typeof inflate>) => {
  object.geometry.dispose();
  object.material.map?.dispose();
  object.material.dispose();
};
document.querySelector<HTMLButtonElement>('#run')!.onclick = async () => {
  checks = 0;
  out.textContent = '';
  try {
    const objects = createBuiltins();
    check(
      objects.length === 25 &&
        objects.every((o) => triangleCount(o.geometry) <= config.objects.maxTriangles),
      '25종 라이브러리 물체 삼각형 예산',
    );
    for (const asset of createSamples()) {
      const o = inflate(asset);
      check(
        triangleCount(o.geometry) <= config.objects.maxTriangles && o.halfHeight > 0.02,
        `${asset.name} 앞뒤 부풀림과 삼각형 예산`,
      );
      release(o);
    }
    const bytes = await (await fetch('./fixtures/photo.svg')).blob();
    const asset = await loadImage(new File([bytes], 'photo.svg', { type: 'image/svg+xml' }));
    const cushion = inflate(asset);
    check(
      cushion.halfHeight > 0.05 && triangleCount(cushion.geometry) <= config.objects.maxTriangles,
      '불투명 사진 쿠션',
    );
    release(cushion);
    async function glb(g: BoxGeometry | SphereGeometry) {
      const m = new Mesh(g, new MeshStandardMaterial({ color: '#ab9988' }));
      const buffer = await new GLTFExporter().parseAsync(m, { binary: true });
      m.material.dispose();
      g.dispose();
      return new File([buffer as ArrayBuffer], 'fixture.glb');
    }
    const loaded = await loadGLB(await glb(new BoxGeometry()));
    check(
      triangleCount(loaded.geometry) === 12 && loaded.halfHeight === 0.5,
      'GLB 정규화·색·삼각형',
    );
    release(loaded);
    let rejected = false;
    try {
      await loadGLB(await glb(new SphereGeometry(1, 32, 24)));
    } catch (e) {
      rejected = String(e).includes('삼각형');
    }
    check(rejected, '고밀도 GLB 경고 후 차단');
    const overrides = createBuiltins();
    const definition = objectLibrary[0],
      oldGeometry = overrides[0].geometry;
    const url = URL.createObjectURL(await glb(new BoxGeometry()));
    definition.glbPath = url;
    await applyLibraryOverrides(overrides);
    check(
      overrides[0].geometry !== oldGeometry &&
        triangleCount(overrides[0].geometry) === 12 &&
        overrides[0].id === definition.id &&
        overrides[0].massClass === definition.weight,
      'GLB path replaces geometry and retains library metadata',
    );
    URL.revokeObjectURL(url);
    definition.glbPath = '/missing-library-test.glb';
    let warned = false;
    const fallback = overrides[0].geometry;
    await applyLibraryOverrides(overrides, () => {
      warned = true;
    });
    check(warned && overrides[0].geometry === fallback, 'invalid GLB retains working fallback');
    delete definition.glbPath;
    overrides.forEach(release);
    await document.fonts.load(config.text.font, '오늘도잘버텼어가나다라마바사아자차카타파하');
    const text = new TextLayout(),
      a = text.build('오늘도\n잘 버텼어'),
      misses = text.cacheMisses;
    const b = text.build('오늘도\n잘 버텼어');
    check(text.cacheMisses === misses, '같은 문장 마스크 재생성 0');
    check(
      a.glyphs.every((g, i) => g.id === b.glyphs[i].id && g.sculpture === b.glyphs[i].sculpture),
      '글자 identity·마스크 참조 캐시',
    );
    const scene = new Scene(),
      pieces = createPieces(scene);
    state.set({ objects, glyphs: a.glyphs, bounds: a.bounds });
    const c = text.build('오늘도\n잘 버텼다');
    state.set({ glyphs: c.glyphs, bounds: c.bounds });
    check(
      !scene.children.some((o) => o instanceof Mesh && !('isInstancedMesh' in o)),
      '오브젝트 렌더러는 숨겨진 선택 몸체를 생성하지 않음',
    );
    check(text.cacheMisses === misses + 1, '한 글자 수정 시 새 마스크 1개');
    for (const n of [20, 40, 60]) {
      const s = text.build('가나다라마바사아자차'.repeat(6).slice(0, n));
      check(
        s.glyphs.length === n && s.perGlyph * n <= config.sentence.budget,
        `${n}자 예산과 줄바꿈`,
      );
      check(
        s.glyphs.every((g) => g.y >= 0),
        `${n}자 바닥 위 문장`,
      );
    }
    const worker = createPlacementWorker();
    await document.fonts.load(config.text.font, 'oaeB8ㅇ');
    for (const char of 'oaeB8ㅇ') {
      const mask = text.glyph(char),
        options = {
          sdf: mask.sdf,
          size: 1,
          spacing: 0.3,
          height: 8,
          depth: 2.2,
          budget: 450,
          outlineWidth: config.pop.outlineWidth,
          coverageScale: 1,
        };
      const packed = await worker.place(
        objects.map((o) => ({
          weight: o.weight,
          halfHeight: o.halfHeight,
          palette: o.palette,
          source: o.source,
          flat: o.flat,
          category: o.category,
          libraryCategory: o.libraryCategory,
          sizeRange: o.sizeRange,
          radius: o.radius,
        })),
        options,
        42,
        'dense',
      );
      check(packed.length > 0, `${char} SDF packing nonempty`);
      const filled=dense([],objects,{...options,coverageScale:2},random(42));
      check(filled.length===packed.length && filled.some((p,i)=>p.scale>packed[i].scale*1.5) && filled.every(p=>distanceAt(mask.sdf!,p.x,p.y)>=p.scale*objects[p.asset].radius!*(1+config.pop.outlineWidth)), `${char} double-size fill preserves glyph boundaries`);

      check(
        JSON.stringify(packed) === JSON.stringify(dense([], objects, options, random(42))),
        `${char} Worker seed parity`,
      );
      check(
        packed.every(
          (p) =>
            distanceAt(mask.sdf!, p.x, p.y) >=
            p.scale * objects[p.asset].radius! * (1 + config.pop.outlineWidth),
        ),
        `${char} bounding spheres inside SDF`,
      );
      check(
        packed.every((p) =>
          Array.from({ length: 32 }, (_, i) => (i * Math.PI) / 16).every(
            (a) =>
              distanceAt(
                mask.sdf!,
                p.x +
                  Math.cos(a) * p.scale * objects[p.asset].radius! * (1 + config.pop.outlineWidth),
                p.y +
                  Math.sin(a) * p.scale * objects[p.asset].radius! * (1 + config.pop.outlineWidth),
              ) > 0,
          ),
        ),
        `${char} no boundary or counter intrusion`,
      );
      check(
        packed.every((p, i) =>
          packed
            .slice(i + 1)
            .every(
              (q) =>
                Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) + 1e-6 >=
                (p.scale * objects[p.asset].radius! + q.scale * objects[q.asset].radius!) *
                  (1 + config.pop.outlineWidth),
            ),
        ),
        `${char} spatial hash no sphere overlaps`,
      );
    }
    worker.dispose();
    check(
      !scene.children.some((o) => 'isMesh' in o && !('isInstancedMesh' in o)),
      'no letter skeleton meshes',
    );
    const sampled = text.glyph('가'),
      targets = dense(
        sampled.points,
        objects,
        { sdf: sampled.sdf, size: 1, spacing: sampled.spacing, height: 8, depth: 2.2, budget: 300 },
        random(42),
      );
    targets.forEach((t, i) => {
      t.glyph = c.glyphs[0].id;
      t.key = `test-${i}`;
    });
    state.set({ targets });
    pieces.motion.finish();
    pieces.update(0);
    check(
      scene.children.filter((o) => 'isInstancedMesh' in o).length === objects.length * 2,
      '종류별 본체와 외곽선 InstancedMesh',
    );
    const selected = pieces.motion.pieces[0].current;
    const ray = {
      origin: { x: selected.x, y: selected.y, z: selected.z + 20 },
      direction: { x: 0, y: 0, z: -1 },
    };
    state.set({ focusRay: ray });
    check(
      state.get().focusGlyph?.id === c.glyphs[0].id,
      '물체 삼각형 raycast로 문자 확대 대상 선택',
    );
    state.set({ peelRay: ray });
    check(
      pieces.motion.pieces.some((p) => p.detached),
      '몸체 없이 실제 물체 떼어내기',
    );
    state.set({
      focusRay: { origin: { x: 9999, y: 9999, z: 20 }, direction: { x: 0, y: 0, z: -1 } },
    });
    check(state.get().focusGlyph === null, '빈 곳 더블클릭은 전체 보기');
    pieces.dispose();
    const saved = { ...features };
    for (const k of Object.keys(features) as (keyof typeof features)[]) features[k] = false;
    const root = document.createElement('div');
    document.body.append(root);
    const ui = createUI(root);
    state.set({ objects: ui.initialObjects });
    check(
      !root.querySelector('#upload-glb') &&
        !root.querySelector('#upload') &&
        !root.querySelector('#sweep') &&
        !root.querySelector('#auto-rotate'),
      '기능 전체 OFF 시 UI 안전 제거',
    );
    check(!root.querySelector('#core') && !root.querySelector('#dotSize'), 'no skeleton controls');
    const category = (name: string) =>
      root.querySelector<HTMLButtonElement>(`[data-category="${name}"]`)!;
    (root.querySelector('#mix-categories') as HTMLInputElement).checked = false;
    category('paper').click();
    check(
      state
        .get()
        .objects.filter((o) => o.weight > 0)
        .every((o) => o.libraryCategory === 'paper'),
      'exclusive paper palette',
    );
    (root.querySelector('#mix-categories') as HTMLInputElement).checked = true;
    category('packaging').click();
    check(
      state.get().objects.some((o) => o.libraryCategory === 'paper' && o.weight > 0) &&
        state.get().objects.some((o) => o.libraryCategory === 'packaging' && o.weight > 0),
      'mix category palettes',
    );
    category('paper').click();
    check(
      state
        .get()
        .objects.filter((o) => o.weight > 0)
        .every((o) => o.libraryCategory === 'packaging'),
      'category deselection',
    );
    root.remove();
    Object.assign(features, saved);
    objects.forEach(release);
    ui.initialObjects.forEach(release);
    out.textContent += `\n완료: ${checks}개 통과`;
  } catch (e) {
    out.textContent += '\nFAIL ' + String(e);
    console.error(e);
  }
};
