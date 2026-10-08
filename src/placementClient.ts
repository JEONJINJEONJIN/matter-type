/** Async Worker client; cached SDF buffers are cloned, never detached. */
import type { LayoutObject, LayoutOptions } from './layout';
import type { Transform } from './state';
export function createPlacementWorker() {
  const worker = new Worker(new URL('./placement.worker.ts', import.meta.url), { type: 'module' });
  let id = 0;
  const waiting = new Map<
    number,
    { resolve: (t: Transform[]) => void; reject: (e: Error) => void }
  >();
  worker.onmessage = (e) => {
    const pending = waiting.get(e.data.id);
    waiting.delete(e.data.id);
    if (e.data.error) pending?.reject(new Error(e.data.error));
    else pending?.resolve(e.data.targets);
  };
  worker.onerror = (e) => {
    waiting.forEach((p) => p.reject(new Error(e.message)));
    waiting.clear();
  };
  return {
    place(objects: LayoutObject[], opts: LayoutOptions, seed: number, mode: string) {
      return new Promise<Transform[]>((resolve, reject) => {
        const request = ++id;
        waiting.set(request, { resolve, reject });
        worker.postMessage({ id: request, objects, opts, seed, mode });
      });
    },
    dispose() {
      worker.terminate();
      waiting.forEach((p) => p.reject(new Error('Worker closed')));
      waiting.clear();
    },
  };
}
