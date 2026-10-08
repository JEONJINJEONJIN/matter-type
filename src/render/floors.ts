/** 반복 가능한 종이·나무·콘크리트 색상 및 요철 텍스처를 절차 생성한다. */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { config } from '../config';
import { random } from '../state';
import type { FloorMode } from '../state';
export function createFloor(mode: FloorMode) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = config.floor.textureSize;
  const ctx = canvas.getContext('2d')!,
    data = ctx.createImageData(canvas.width, canvas.height),
    rng = random(config.seed);
  const base = { paper: [218, 211, 197], wood: [176, 151, 120], concrete: [177, 178, 171] }[mode];
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++) {
      const noise = (rng() - 0.5) * (mode === 'concrete' ? 19 : 9);
      const grain =
        mode === 'wood'
          ? Math.sin(y * 0.48 + Math.sin(x * 0.018) * 2 + Math.sin(y * 0.035) * 4) * 7
          : mode === 'concrete'
            ? Math.sin(x * 0.035) * Math.cos(y * 0.023) * 5
            : 0;
      const i = (y * canvas.width + x) * 4;
      for (let c = 0; c < 3; c++) data.data[i + c] = base[c] + noise + grain;
      data.data[i + 3] = 255;
    }
  ctx.putImageData(data, 0, 0);
  const color = new CanvasTexture(canvas);
  color.colorSpace = SRGBColorSpace;
  const bump = new CanvasTexture(canvas);
  for (const texture of [color, bump]) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(config.floor.repeat, config.floor.repeat);
    texture.anisotropy = 4;
  }
  return { color, bump };
}
