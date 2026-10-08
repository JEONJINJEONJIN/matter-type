/** 떼어내기 포인터를 카메라 광선으로 변환해 state에 전달한다. 실제 물체가 hit를 계산한다. */
import { Raycaster, Vector2 } from 'three';
import type { Camera } from 'three';
import { state } from './state';
import { features } from './features';
export function attachSweep(canvas: HTMLCanvasElement, camera: Camera) {
  if (!features.sweep && !features.orbit) return () => {};
  const ray = new Raycaster(),
    mouse = new Vector2();
  let pointer: number | null = null;
  function cast(e: PointerEvent) {
    if (!state.get().sweep || state.get().busy || state.get().animating) return;
    const r = canvas.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld();
    ray.setFromCamera(mouse, camera);
    const { origin, direction } = ray.ray;
    state.set({
      peelRay: {
        origin: { x: origin.x, y: origin.y, z: origin.z },
        direction: { x: direction.x, y: direction.y, z: direction.z },
      },
    });
  }
  function down(e: PointerEvent) {
    if (!state.get().sweep || e.button !== 0) return;
    pointer = e.pointerId;
    canvas.setPointerCapture(pointer);
    cast(e);
  }
  function move(e: PointerEvent) {
    if (pointer === e.pointerId) cast(e);
  }
  function up() {
    pointer = null;
  }
  function focus(e: MouseEvent) {
    if (!features.orbit || state.get().sweep || state.get().busy) return;
    const r = canvas.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld();
    ray.setFromCamera(mouse, camera);
    const { origin, direction } = ray.ray;
    state.set({
      focusRay: {
        origin: { x: origin.x, y: origin.y, z: origin.z },
        direction: { x: direction.x, y: direction.y, z: direction.z },
      },
    });
  }
  canvas.addEventListener('dblclick', focus);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', up);
  return () => {
    canvas.removeEventListener('dblclick', focus);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('lostpointercapture', up);
  };
}
