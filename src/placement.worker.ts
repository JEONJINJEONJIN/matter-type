/** Placement Worker: no canvas, DOM, renderer or per-frame work. */
import { packSDF } from './sdfPlacement';
import { random } from './state';
import type { LayoutObject, LayoutOptions } from './layout';
self.onmessage = (
  event: MessageEvent<{
    id: number;
    objects: LayoutObject[];
    opts: LayoutOptions;
    seed: number;
    mode: string;
  }>,
) => {
  const { id, objects, opts, seed, mode } = event.data;
  try {
    self.postMessage({
      id,
      targets: packSDF(objects, opts, random(seed), mode === 'sparse', mode === 'drip'),
    });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
