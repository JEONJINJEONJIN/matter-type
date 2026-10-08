/** 흰 테두리와 넓은 하단 여백을 가진 둥근 사진 카드. */
import { MeshStandardMaterial, Shape } from 'three';
import { config } from '../config';
import type { Asset } from '../state';
import { bend } from './bend';
import { extruded, textureFor } from './outline';
import type { PieceResource } from './outline';
export function card(asset: Asset): PieceResource {
  const aspect = asset.canvas.width / asset.canvas.height;
  const w = Math.min(1, aspect),
    h = Math.min(1, 1 / aspect),
    r = Math.min(config.card.radius, w / 4, h / 4);
  const s = new Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const c = document.createElement('canvas');
  c.width = asset.canvas.width;
  c.height = asset.canvas.height;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = config.card.paperColor;
  ctx.fillRect(0, 0, c.width, c.height);
  const b = Math.min(c.width, c.height) * config.card.border;
  ctx.drawImage(
    asset.canvas,
    b,
    b,
    c.width - b * 2,
    c.height - b - c.height * config.card.bottomBorder,
  );
  const texture = textureFor(c),
    g = extruded([s], w, h);
  g.translate(0, 0, -config.piece.thickness / 2);
  return {
    geometry: bend(g),
    texture,
    materials: [
      new MeshStandardMaterial({ map: texture, roughness: config.card.roughness }),
      new MeshStandardMaterial({
        color: config.piece.sideColor,
        roughness: config.piece.sideRoughness,
      }),
    ],
  };
}
