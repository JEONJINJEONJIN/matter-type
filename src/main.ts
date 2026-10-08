/** 진입점과 렌더 루프. 순수 샘플링·배열 결과를 state에 공개하는 조정 지점. */
import './style.css';
import { applyLibraryOverrides } from './objects/library';
import { config } from './config';
import { state } from './state';
import type { StateKey } from './state';
import { TextLayout } from './textLayout';
import type { Transform } from './state';
import { createPlacementWorker } from './placementClient';
import { features } from './features';
import { createUI } from './ui';
import { createScene } from './render/scene';
import { createPieces } from './render/pieces';
import { createPost } from './render/post';
import { attachSweep } from './sweep';
import { exportPNG } from './export';

async function start() {
  const ui = createUI(document.querySelector('#app')!);
  // 실제 입력의 unicode-range 폰트를 기다려 대체 폰트로 샘플링하지 않는다.
  await document.fonts.load(config.text.font, state.get().text);
  const view = createScene(ui.canvas),
    pieces = createPieces(view.scene),
    post = createPost(view.renderer, view.scene, view.camera);
  const placement = createPlacementWorker();
  const profile = import.meta.env.DEV && new URLSearchParams(location.search).has('profile');
  let renderCount = 0;
  let needsRender = true;
  const textLayout = new TextLayout();
  const arrangementCache = new Map<string, Transform[]>();
  let generation = 0,
    alive = true,
    pending: Promise<void> = Promise.resolve();
  async function rebuild() {
    const token = ++generation,
      s = state.get();
    try {
      await document.fonts.load(config.text.font, s.text || ' ');
      if (token !== generation || !alive) return;
      const sentence = textLayout.build(s.text, s.letterGap);
      const styleKey = JSON.stringify([
        s.seed,
        s.minR,
        s.maxR,
        s.density,
        s.palette,
        s.popOutline,
        s.outlineWidth,
        s.layout,
        s.pieceSize,
        sentence.perGlyph,
        s.objects.map((o) => [o.id, o.weight]),
      ]);
      const targets: Transform[] = [];
      for (const glyph of sentence.glyphs) {
        const cacheKey = `${glyph.id}:${glyph.variation}:${styleKey}`;
        let local = arrangementCache.get(cacheKey);
        if (!local) {
          const sampled = textLayout.glyph(glyph.char);
          local = await placement.place(
            s.objects.map((o) => {
              if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
              return {
                weight: o.weight,
                halfHeight: o.halfHeight,
                palette: o.palette,
                source: o.source,
                category: o.category,
                libraryCategory: o.libraryCategory,
                sizeRange: o.sizeRange,
                flat: o.flat,
                radius:
                  o.radius ??
                  o.geometry.boundingSphere!.radius + o.geometry.boundingSphere!.center.length(),
              };
            }),
            {
              sdf: sampled.sdf,
              minR: s.minR,
              maxR: s.maxR,
              density: s.density,
              palette: s.palette,
              outlineWidth: features.popOutline && s.popOutline ? s.outlineWidth : 0,
              size: s.pieceSize,
              spacing: sampled.spacing,
              height: sampled.height,
              depth: sampled.depth,
              budget: sentence.perGlyph,
            },
            s.seed + glyph.variation,
            s.layout,
          );
          if (token !== generation || !alive) return;
          arrangementCache.set(cacheKey, local);
        }
        local.forEach((t, i) =>
          targets.push({
            ...t,
            x: t.x * glyph.scale + glyph.x,
            y: t.grounded ? t.y * glyph.scale : t.y * glyph.scale + glyph.y,
            z: t.z * glyph.scale,
            scale: t.scale * glyph.scale,
            key: `${cacheKey}:${i}`,
            glyph: glyph.id,
            order: glyph.order,
          }),
        );
      }
      const live = new Set(sentence.glyphs.map((g) => `${g.id}:${g.variation}:${styleKey}`));
      for (const key of arrangementCache.keys()) if (!live.has(key)) arrangementCache.delete(key);
      state.set({
        targets,
        glyphs: sentence.glyphs,
        bounds: sentence.bounds,
        ready: true,
        textRevision: s.textRevision + 1,
      });
    } catch (error) {
      state.set({ error: `글자를 준비하지 못했습니다: ${String(error)}` });
    }
  }
  const unsubscribe = state.subscribe((_s, keys) => {
    needsRender = true;
    if (
      [
        'text',
        'layout',
        'seed',
        'pieceSize',
        'objects',
        'minR',
        'maxR',
        'density',
        'letterGap',
        'palette',
        'popOutline',
        'outlineWidth',
      ].some((k) => keys.has(k as StateKey))
    )
      pending = rebuild();
    if (keys.has('exportRequest')) void save();
  });
  async function save() {
    // 디바운스 직후 저장도 최신 폰트와 배열이 반영될 때까지 기다린다.
    await pending;
    await exportPNG(view.renderer, post, () => {
      pieces.motion.finish();
      pieces.markDirty();
      pieces.update(0);
    });
  }
  const detachSweep = attachSweep(ui.canvas, view.camera);
  const resize = () => {
    if (state.get().busy) return;
    const { width, height } = ui.canvas.getBoundingClientRect();
    view.resize(width, height);
    post.resize(width, height, view.renderer.getPixelRatio());
    needsRender = true;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(ui.canvas);
  resize();
  state.set({
    objects: await applyLibraryOverrides(ui.initialObjects, (error) => state.set({ error })),
  });
  let previous = performance.now(),
    frame = 0;
  function loop(now: number) {
    if (!alive) return;
    frame = requestAnimationFrame(loop);
    const delta = (now - previous) / 1000;
    previous = now;
    if (document.hidden || state.get().busy) return;
    const moving = pieces.update(delta);
    needsRender = view.updateObjectShadows(moving, delta) || needsRender;
    const cameraChanged = view.update(delta);
    if (needsRender || moving || cameraChanged) {
      post.render();
      if (profile) ui.canvas.dataset.renderCount = String(++renderCount);
      needsRender = false;
    }
  }
  frame = requestAnimationFrame(loop);
  ui.canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    state.set({ error: '그래픽 연결이 끊겼습니다. 페이지를 새로고침해 주세요.' });
  });
  window.addEventListener(
    'pagehide',
    () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      unsubscribe();
      detachSweep();
      placement.dispose();
      pieces.dispose();
      post.dispose();
      view.dispose();
      for (const o of state.get().objects) {
        o.geometry.dispose();
        o.material.map?.dispose();
        o.material.dispose();
      }
    },
    { once: true },
  );
}
void start().catch((error) => {
  console.error(error);
  state.set({
    ready: true,
    error: `시작할 수 없습니다. WebGL을 지원하는 브라우저에서 다시 시도해 주세요. ${String(error)}`,
  });
});
