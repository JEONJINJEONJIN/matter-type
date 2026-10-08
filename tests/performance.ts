/** 실제 WebGL·그림자·후처리로 30/60/120자 자동 회전 및 이동 프레임을 측정한다. */
import '@fontsource/noto-sans-kr/900.css';
import { config } from '../src/config';
import { createBuiltins, triangleCount } from '../src/objects/builtin';
import { TextLayout } from '../src/textLayout';
import { layouts } from '../src/layout';
import { state, random } from '../src/state';
import { createScene } from '../src/render/scene';
import { createPieces } from '../src/render/pieces';
import { createPost } from '../src/render/post';
const out = document.querySelector('#results')!,
  canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
const frame = () => new Promise<number>((r) => requestAnimationFrame(r));
document.querySelector<HTMLButtonElement>('#run')!.onclick = async () => {
  const button = document.querySelector<HTMLButtonElement>('#run')!;
  button.disabled = true;
  out.textContent = '측정 중 (이 탭을 보이는 상태로 유지)…';
  const view = createScene(canvas),
    pieces = createPieces(view.scene),
    post = createPost(view.renderer, view.scene, view.camera),
    text = new TextLayout(),
    objects = createBuiltins().map((o) => ({ ...o, weight: 50 }));
  view.resize(canvas.clientWidth, canvas.clientHeight);
  post.resize(canvas.clientWidth, canvas.clientHeight, view.renderer.getPixelRatio());
  state.set({ objects });
  const rows: object[] = [];
  const gl = view.renderer.getContext(),
    debug = gl.getExtension('WEBGL_debug_renderer_info');
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const gpu = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  let baselineStart = await frame();
  for (let i = 0; i < 30; i++) await frame();
  const baselineFps = 30000 / (performance.now() - baselineStart);

  try {
    for (const count of [30, 60, 120]) {
      const sentence = Array.from({ length: count }, (_, i) =>
        String.fromCharCode(0xac00 + i * 17),
      ).join('');
      await document.fonts.load(config.text.font, sentence);
      const started = performance.now(),
        built = text.build(sentence);
      const targets = built.glyphs.flatMap((g) =>
        layouts
          .dense(
            text.glyph(g.char).points,
            objects,
            {
              sdf: text.glyph(g.char).sdf,
              outlineWidth: state.get().popOutline ? config.pop.outlineWidth : 0,
              density: state.get().density,
              size: 1,
              spacing: 0.4,
              height: 8,
              depth: 2.2,
              budget: built.perGlyph,
            },
            random(config.seed + g.order),
          )
          .map((t, i) => ({
            ...t,
            x: t.x * g.scale + g.x,
            y: t.y * g.scale + g.y,
            z: t.z * g.scale,
            scale: t.scale * g.scale,
            key: `${g.id}:${i}`,
            glyph: g.id,
            order: g.order,
          })),
      );
      state.set({ targets, glyphs: built.glyphs, bounds: built.bounds, autoRotate: false });
      const prepareMs = performance.now() - started;
      pieces.motion.finish();
      pieces.markDirty();
      pieces.update(0);
      // 셰이더 컴파일·텍스처 업로드 워밍업은 측정에서 제외한다.
      for (let i = 0; i < config.performance.benchmarkWarmupFrames; i++) {
        await frame();
        view.update(1 / 60);
        post.render();
      }
      async function measure(moving: boolean) {
        state.set({ autoRotate: !moving });
        if (moving) {
          pieces.motion.retarget(
            targets.map((t, i) => ({ ...t, key: `move-${count}-${i}` })),
            config.seed,
          );
        }
        const intervals: number[] = [],
          cpu: number[] = [],
          gpuTimes: number[] = [];
        const queries: WebGLQuery[] = [];
        let prev = await frame();
        for (let i = 0; i < config.performance.benchmarkFrames; i++) {
          const now = await frame(),
            dt = (now - prev) / 1000;
          prev = now;
          if (document.hidden) throw new Error('측정 탭이 숨겨졌습니다. 다시 실행해주세요.');
          const start = performance.now();
          view.updateObjectShadows(pieces.update(dt), dt);
          view.update(dt);
          const query = timer ? gl.createQuery() : null;
          if (query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
          post.render();
          if (query) {
            gl.endQuery(timer.TIME_ELAPSED_EXT);
            queries.push(query);
          }
          while (queries.length && gl.getQueryParameter(queries[0], gl.QUERY_RESULT_AVAILABLE)) {
            const ready = queries.shift()!;
            if (!gl.getParameter(timer.GPU_DISJOINT_EXT))
              gpuTimes.push(gl.getQueryParameter(ready, gl.QUERY_RESULT) / 1e6);
            gl.deleteQuery(ready);
          }
          cpu.push(performance.now() - start);
          intervals.push(dt * 1000);
          if (intervals.reduce((a, b) => a + b, 0) >= config.performance.benchmarkSeconds * 1000)
            break;
        }
        queries.forEach((q) => gl.deleteQuery(q));
        return {
          gpuRenderMs: gpuTimes.length
            ? Math.round((gpuTimes.reduce((a, b) => a + b, 0) / gpuTimes.length) * 100) / 100
            : null,
          longFrameGaps: intervals.filter((dt) => dt > 250).length,
          frames: intervals.length,
          sampleSeconds: Math.round(intervals.reduce((a, b) => a + b, 0)) / 1000,
          cpuSubmitMs: Math.round((cpu.reduce((a, b) => a + b, 0) / cpu.length) * 10) / 10,
          fps:
            Math.round((1000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length)) * 10) /
            10,
          p95Ms:
            Math.round(
              [...intervals].sort((a, b) => a - b)[Math.floor(intervals.length * 0.95)] * 10,
            ) / 10,
        };
      }
      const rotate = await measure(false),
        animation = await measure(true);
      rows.push({
        characters: count,
        objects: targets.length,
        prepareMs: Math.round(prepareMs),
        rotation: rotate,
        attachmentWindow: animation,
      });
      out.textContent = JSON.stringify(
        {
          gpu,
          emptyRafFps: Math.round(baselineFps * 10) / 10,
          viewport: [canvas.width, canvas.height],
          dpr: view.renderer.getPixelRatio(),
          trianglesPerObject: objects.map((o) => [o.id, triangleCount(o.geometry)]),
          rows,
        },
        null,
        2,
      );
    }
  } catch (e) {
    out.textContent += '\nERROR ' + String(e);
  } finally {
    post.dispose();
    pieces.dispose();
    view.dispose();
    objects.forEach((o) => {
      o.geometry.dispose();
      o.material.dispose();
    });
    button.disabled = false;
  }
};
