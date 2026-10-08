/** 같은 구도를 화면 렌더 해상도의 2배로 렌더링하고 PNG 다운로드 후 모든 설정을 복구한다. */
import { Vector2 } from 'three';
import type { WebGLRenderer } from 'three';
import { state } from './state';
import { config } from './config';
import type { createPost } from './render/post';
export async function exportPNG(
  renderer: WebGLRenderer,
  post: ReturnType<typeof createPost>,
  settle: () => void,
) {
  if (state.get().busy) return;
  state.set({ busy: true, error: '' });
  const original = renderer.getSize(new Vector2()),
    dpr = renderer.getPixelRatio();
  const max = Math.min(
    config.performance.maxExportDimension,
    renderer.capabilities.maxTextureSize,
    renderer.getContext().getParameter(renderer.getContext().MAX_RENDERBUFFER_SIZE),
  );
  const ratio = Math.min(
    Math.min(window.devicePixelRatio, config.performance.maxDpr) * config.performance.exportScale,
    max / Math.max(original.x, original.y),
  );
  try {
    settle();
    renderer.setPixelRatio(ratio);
    renderer.setSize(original.x, original.y, false);
    post.resize(original.x, original.y, ratio);
    renderer.shadowMap.needsUpdate = true;
    post.exportQuality(true);
    post.render();
    const blob = await new Promise<Blob>((resolve, reject) =>
      renderer.domElement.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG 생성에 실패했습니다.'))),
        'image/png',
      ),
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `사물로쓴-${state.get().text || '작품'}-${state.get().seed}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    state.set({
      notice: `PNG 저장 완료 · ${renderer.domElement.width} × ${renderer.domElement.height}`,
    });
  } catch (error) {
    state.set({ error: error instanceof Error ? error.message : '저장에 실패했습니다.' });
  } finally {
    post.exportQuality(false);
    renderer.setPixelRatio(dpr);
    renderer.setSize(original.x, original.y, false);
    post.resize(original.x, original.y, dpr);
    renderer.shadowMap.needsUpdate = true;
    state.set({ busy: false });
  }
}
