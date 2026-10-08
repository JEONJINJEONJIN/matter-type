/** 공백 우선 줄바꿈, 문자 identity 유지, 글자 마스크 LRU 캐시와 문장 배치. */
import { config } from './config';
import { sampleText } from './sampler';
import type { SampleResult } from './sampler';
import { random } from './state';
import type { GlyphInstance } from './state';
export function wrapText(text: string, max: number = config.sentence.lineLength): string[] {
  const lines: string[] = [];
  for (const paragraph of Array.from(text).slice(0, config.text.maxLength).join('').split('\n')) {
    let rest = Array.from(paragraph);
    if (!rest.length) {
      lines.push('');
      continue;
    }
    while (rest.length > max) {
      const candidate = rest.slice(0, max + 1);
      let cut = candidate.lastIndexOf(' ');
      if (cut <= 0) cut = max;
      lines.push(rest.slice(0, cut).join(''));
      rest = rest.slice(cut);
      while (rest[0] === ' ') rest.shift();
    }
    if (rest.length) lines.push(rest.join(''));
  }
  return lines.length ? lines : [''];
}
export class TextLayout {
  private cache = new Map<string, SampleResult>();
  private previous: { char: string; id: string }[] = [];
  private nextId = 0;
  cacheMisses = 0;
  glyph(char: string) {
    let result = this.cache.get(char);
    if (result) {
      this.cache.delete(char);
      this.cache.set(char, result);
      return result;
    }
    result = sampleText(char, 1, random(char.codePointAt(0)!), config.sentence.samplePoints);
    this.cache.set(char, result);
    this.cacheMisses++;
    if (this.cache.size > config.sentence.cacheSize)
      this.cache.delete(this.cache.keys().next().value!);
    return result;
  }
  build(text: string, letterGap: number = config.sentence.letterGap) {
    const lines = wrapText(text),
      chars = Array.from(lines.join('')).filter((c) => c.trim());
    // LCS는 삽입·삭제 전후 같은 글자를 찾아 안정된 id를 부여한다 (최대 60²).
    const old = this.previous,
      dp = Array.from({ length: old.length + 1 }, () => new Uint16Array(chars.length + 1));
    for (let i = old.length - 1; i >= 0; i--)
      for (let j = chars.length - 1; j >= 0; j--)
        dp[i][j] =
          old[i].char === chars[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const ids = new Map<number, string>();
    let i = 0,
      j = 0;
    while (i < old.length && j < chars.length) {
      if (old[i].char === chars[j]) {
        ids.set(j, old[i].id);
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    this.previous = chars.map((char, k) => ({ char, id: ids.get(k) ?? `glyph-${this.nextId++}` }));
    const perGlyph = Math.min(
      config.sentence.glyphObjects,
      Math.floor(config.sentence.budget / Math.max(1, chars.length)),
    );
    // 예산이 최소 밀도에 못 미치면 조형물과 물체를 함께 줄여 획 대비 크기를 보존한다.
    const scale = Math.min(1, Math.sqrt(perGlyph / config.sentence.minGlyphObjects));
    const h = config.sculpture.height,
      gap = h * letterGap;
    const widths = lines.map(
      (line) =>
        Array.from(line).reduce(
          (w, c) => w + (c.trim() ? this.glyph(c).width : h * config.sentence.spaceWidth) + gap,
          0,
        ) - gap,
    );
    const width = Math.max(h, ...widths),
      height = h * (lines.length + (lines.length - 1) * config.sentence.lineGap);
    const glyphs: GlyphInstance[] = [];
    let order = 0;
    const occurrences = new Map<string, number>();
    lines.forEach((line, row) => {
      let x = config.sentence.align === 'left' ? -width / 2 : -widths[row] / 2;
      for (const char of Array.from(line)) {
        if (!char.trim()) {
          x += h * config.sentence.spaceWidth + gap;
          continue;
        }
        const s = this.glyph(char);
        const occurrence = occurrences.get(char) ?? 0;
        occurrences.set(char, occurrence + 1);
        glyphs.push({
          variation: char.codePointAt(0)! * 65537 + occurrence,
          id: this.previous[order].id,
          char,
          order: order++,
          x: (x + s.width / 2) * scale,
          y: (lines.length - 1 - row) * h * (1 + config.sentence.lineGap) * scale,
          scale,
          sculpture: s,
        });
        x += s.width + gap;
      }
    });
    return {
      glyphs,
      perGlyph,
      bounds: {
        width: width * scale,
        height: height * scale,
        depth: config.sculpture.depth * scale,
      },
    };
  }
}
