/** 외부 파일 없는 여섯 가지 수제 샘플과 업로드 이미지의 축소·알파 검사. */
import { config } from '../config';
import type { Asset } from '../state';
export const sampleNames: Record<string, string> = {
  candy: '복숭아 사탕',
  ticket: '오래된 티켓',
  leaf: '초록 잎사귀',
  button: '자개 단추',
  star: '황동 별',
  orange: '오렌지 조각',
};
function canvas() {
  const c = document.createElement('canvas');
  c.width = c.height = config.piece.textureSize;
  return c;
}
export function makeAsset(c: HTMLCanvasElement, id: string, name: string): Asset {
  const data = c
    .getContext('2d', { willReadFrequently: true })!
    .getImageData(0, 0, c.width, c.height).data;
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < config.piece.alphaThreshold) clear++;
  return {
    id,
    name,
    canvas: c,
    transparent: clear / (data.length / 4) > config.piece.transparencyRatio,
    preview: c.toDataURL(),
  };
}
export function createSamples(): Asset[] {
  return Object.entries(sampleNames).map(([id, name]) => {
    const c = canvas(),
      x = c.getContext('2d')!;
    x.scale(c.width / 256, c.height / 256);
    // 아래 좌표는 256px 원화의 도형 정의이며 연출 조절값이 아니다.
    if (id === 'candy') {
      for (const flip of [false, true]) {
        x.save();
        if (flip) {
          x.translate(256, 0);
          x.scale(-1, 1);
        }
        x.fillStyle = '#df9c8f';
        x.beginPath();
        x.moveTo(91, 110);
        x.lineTo(27, 77);
        x.lineTo(36, 127);
        x.lineTo(25, 171);
        x.lineTo(94, 143);
        x.closePath();
        x.fill();
        x.strokeStyle = '#f8d3be';
        x.lineWidth = 4;
        for (let j = 0; j < 4; j++) {
          x.beginPath();
          x.moveTo(84, 126);
          x.lineTo(35, 93 + j * 21);
          x.stroke();
        }
        x.restore();
      }
      const g = x.createRadialGradient(105, 102, 8, 130, 134, 64);
      g.addColorStop(0, '#ffe7c9');
      g.addColorStop(0.48, '#eeb59c');
      g.addColorStop(1, '#b86b65');
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(128, 128, 59, 53, -0.15, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = '#fae4ca';
      x.lineWidth = 3;
      x.beginPath();
      x.ellipse(128, 128, 48, 44, -0.15, 0.5, 4.4);
      x.stroke();
      x.fillStyle = '#fff0d9aa';
      x.beginPath();
      x.ellipse(111, 109, 20, 8, -0.5, 0, Math.PI * 2);
      x.fill();
    } else if (id === 'ticket') {
      x.fillStyle = '#d8b77f';
      x.beginPath();
      x.roundRect(24, 65, 208, 126, 9);
      x.fill();
      x.strokeStyle = '#866349';
      x.lineWidth = 2;
      x.strokeRect(35, 76, 186, 104);
      x.setLineDash([3, 4]);
      x.beginPath();
      x.moveTo(181, 70);
      x.lineTo(181, 185);
      x.stroke();
      x.setLineDash([]);
      x.fillStyle = '#654d3c';
      x.textAlign = 'center';
      x.font = 'bold 22px serif';
      x.fillText('ADMIT ONE', 110, 112);
      x.font = '13px monospace';
      x.fillText('No. 072914', 111, 145);
      for (let j = 0; j < 12; j++) x.fillRect(191 + j * 2, 91, 1, 62);
    } else if (id === 'leaf') {
      const g = x.createLinearGradient(60, 50, 193, 210);
      g.addColorStop(0, '#9da96a');
      g.addColorStop(0.5, '#607850');
      g.addColorStop(1, '#354f3a');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(191, 30);
      x.bezierCurveTo(215, 168, 113, 219, 58, 200);
      x.bezierCurveTo(28, 97, 113, 47, 191, 30);
      x.fill();
      x.strokeStyle = '#b3b78a';
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(44, 221);
      x.quadraticCurveTo(128, 146, 191, 30);
      x.stroke();
      x.lineWidth = 1.3;
      for (let j = 0; j < 6; j++) {
        const y = 80 + j * 20;
        x.beginPath();
        x.moveTo(174 - j * 14, y);
        x.lineTo(115 - j * 11, y - 7);
        x.moveTo(174 - j * 14, y);
        x.lineTo(199 - j * 11, y + 10);
        x.stroke();
      }
    } else if (id === 'button') {
      const g = x.createLinearGradient(57, 53, 188, 207);
      g.addColorStop(0, '#e8e5dc');
      g.addColorStop(0.4, '#a6bcb7');
      g.addColorStop(0.7, '#d8c7c2');
      g.addColorStop(1, '#7f9c98');
      x.fillStyle = g;
      x.beginPath();
      x.arc(128, 128, 86, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = '#f1eee2';
      x.lineWidth = 5;
      x.beginPath();
      x.arc(128, 128, 74, 0, Math.PI * 2);
      x.stroke();
      x.globalCompositeOperation = 'destination-out';
      for (const xx of [110, 146])
        for (const yy of [110, 146]) {
          x.beginPath();
          x.arc(xx, yy, 9, 0, Math.PI * 2);
          x.fill();
        }
    } else if (id === 'star') {
      const g = x.createLinearGradient(50, 35, 180, 220);
      g.addColorStop(0, '#efe0a1');
      g.addColorStop(0.5, '#bc9857');
      g.addColorStop(1, '#88673d');
      x.fillStyle = g;
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2,
          r = i % 2 ? 44 : 101;
        x.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
      }
      x.closePath();
      x.fill();
      x.strokeStyle = '#ead29b';
      x.lineWidth = 4;
      x.stroke();
    } else {
      x.fillStyle = '#b8783f';
      x.beginPath();
      x.arc(128, 128, 96, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#f4d6a0';
      x.beginPath();
      x.arc(128, 128, 87, 0, Math.PI * 2);
      x.fill();
      for (let i = 0; i < 9; i++) {
        const a = (i * Math.PI * 2) / 9;
        x.fillStyle = i % 2 ? '#dba05a' : '#e9ae64';
        x.beginPath();
        x.moveTo(128, 128);
        x.arc(128, 128, 79, a + 0.04, a + (Math.PI * 2) / 9 - 0.04);
        x.closePath();
        x.fill();
      }
      x.fillStyle = '#f7dfb5';
      x.beginPath();
      x.arc(128, 128, 10, 0, Math.PI * 2);
      x.fill();
    }
    return makeAsset(c, id, name);
  });
}
export async function loadImage(file: File): Promise<Asset> {
  if (!file.type.startsWith('image/'))
    throw new Error(`${file.name}: 이미지 파일을 선택해 주세요.`);
  if (file.size > config.assets.maxFileBytes)
    throw new Error(`${file.name}: 이미지 한 장은 25MB 이하여야 합니다.`);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = canvas(),
      ratio = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight);
    c.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    c.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return makeAsset(c, crypto.randomUUID(), file.name);
  } finally {
    URL.revokeObjectURL(url);
  }
}
