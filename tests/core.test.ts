/** 표면 방향, 시드 재현, 부착 연속성, 낙하·재부착, 몸체 구멍을 검증한다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Euler,
  Quaternion,
  Vector3,
  Raycaster,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
  Shape,
} from 'three';
import { random } from '../src/state';
import type { SurfacePoint, Transform } from '../src/state';
import { dense, sparse, drip } from '../src/layout';
import { Motion } from '../src/tween';
import { bend } from '../src/pieces/bend';
import { extruded } from '../src/pieces/outline';
import { config } from '../src/config';
import { distanceAt } from '../src/sdfPlacement';
test('SDF packing is seeded, budgeted, preserves holes and rejects overlaps', () => {
  const width = 120,
    height = 120,
    unit = 0.1;
  const sdf = {
    width,
    height,
    unit,
    originX: -6,
    originY: 12,
    maxDistance: 1,
    data: Float32Array.from({ length: width * height }, (_, i) => {
      const radius = Math.hypot(
        ((i % width) + 0.5) * unit - 6,
        6 - (Math.floor(i / width) + 0.5) * unit,
      );
      return Math.min(5 - radius, radius - 3);
    }),
  };
  const objects = [
    { weight: 70, halfHeight: 1, palette: ['#ffffff'], radius: 1, source: 'builtin' as const },
    { weight: 30, halfHeight: 1, palette: ['#ffffff'], radius: 1, source: 'builtin' as const },
  ];
  const opts = {
    sdf,
    size: 1,
    spacing: 0.2,
    height: 12,
    depth: 2.2,
    budget: 300,
    outlineWidth: config.pop.outlineWidth,
    coverageScale: 1,
  };
  for (const engine of [dense, sparse, drip]) {
    const a = engine([], objects, opts, random(42));
    assert.ok(a.length > 0 && a.length <= 300);
    assert.deepEqual(a, engine([], objects, opts, random(42)));
    assert.notDeepEqual(a, engine([], objects, opts, random(43)));
    const filled = engine([], objects, {...opts, coverageScale: 2}, random(42));
    assert.equal(filled.length, a.length);
    assert.ok(filled.some((p, i) => p.scale > a[i].scale * 1.5));
    filled.forEach((p, i) => {
      assert.deepEqual([p.x,p.y,p.z,p.asset,p.color],[a[i].x,a[i].y,a[i].z,a[i].asset,a[i].color]);
      assert.ok(p.scale >= a[i].scale && p.scale <= a[i].scale * 2 + 1e-6);
      const radius=p.scale*(1+config.pop.outlineWidth);
      assert.ok(distanceAt(sdf,p.x,p.y)>=radius);
      assert.ok(Math.abs(p.z)+radius<=opts.depth/2+1e-6);
    });

    for (const [i, p] of a.entries()) {
      const radius = p.scale * (1 + config.pop.outlineWidth);
      assert.ok(distanceAt(sdf, p.x, p.y) >= radius);
      assert.ok(Math.abs(p.z) + radius <= opts.depth / 2);
      for (const q of a.slice(i + 1))
        assert.ok(
          Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) + 1e-6 >=
            radius + q.scale * (1 + config.pop.outlineWidth),
        );
    }
  }
  assert.equal(
    dense(
      [],
      objects.map((o) => ({ ...o, weight: 0 })),
      opts,
      random(42),
    ).length,
    0,
  );
});
const target = (x: number): Transform => ({
  x,
  y: 4,
  z: 1.2,
  rx: Math.PI / 2,
  ry: 0,
  rz: 0,
  scale: 0.5,
  asset: 0,
});
test('peeling affects only facing pieces and lands flat without sinking, then resets on retarget', () => {
  const m = new Motion();
  const back = { ...target(0), z: -1.2, rx: -Math.PI / 2 };
  m.retarget([target(0), back, target(5)], 42);
  m.finish();
  m.peel({ x: 0, y: 4, z: 1.2 }, { x: 0, y: 0, z: -1 }, 3, 42);
  assert.ok(m.pieces[0].detached);
  assert.ok(!m.pieces[1].detached);
  assert.ok(!m.pieces[2].detached);
  m.update(0.8);
  assert.ok(m.pieces[0].current.y < 4);
  m.finish();
  const landed = { ...m.pieces[0].current };
  assert.ok(landed.y > 0);
  assert.equal(landed.rx, 0);
  assert.equal(landed.rz, 0);
  m.retarget([target(2)], 42);
  assert.deepEqual(m.pieces[0].from, landed);
  assert.ok(!m.pieces[0].detached);
  assert.ok(m.pieces[1].departing);
  m.finish();
  assert.equal(m.pieces[0].current.x, 2);
  assert.equal(m.pieces[1].current.scale, 0);
});
test('bending preserves front and side material groups', () => {
  const s = new Shape();
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(0.5, 0.5);
  s.lineTo(-0.5, 0.5);
  s.closePath();
  const g = bend(extruded([s], 1, 1));
  assert.deepEqual(new Set(g.groups.map((g) => g.materialIndex)), new Set([0, 1]));
  assert.equal(
    g.groups.reduce((n, g) => n + g.count, 0),
    g.getAttribute('position').count,
  );
  g.dispose();
});

import { createBuiltins, triangleCount } from '../src/objects/builtin';
import { wrapText } from '../src/textLayout';
import { distanceField } from '../src/objects/inflate';
test('every builtin has volume and within configured triangle budget', () => {
  const builtins = createBuiltins();
  assert.equal(builtins.length, 25);
  for (const o of builtins) {
    assert.ok(triangleCount(o.geometry) <= config.objects.maxTriangles);
    assert.ok(o.halfHeight > 0);
    assert.ok(o.geometry.boundingBox!.max.y > 0);
    o.geometry.dispose();
    o.material.dispose();
  }
});
test('wrap respects explicit lines, word boundaries, long tokens and configured character cap', () => {
  assert.deepEqual(wrapText('오늘도\n잘 버텼어'), ['오늘도', '잘 버텼어']);
  assert.deepEqual(wrapText('hello world again', 10), ['hello', 'world', 'again']);
  assert.ok(wrapText('가'.repeat(100)).every((line) => Array.from(line).length <= 10));
  assert.equal(wrapText('가'.repeat(300)).join('').length, config.text.maxLength);
});
test('distance field has a thin boundary and a raised interior', () => {
  const field = distanceField(new Uint8Array(49).fill(1), 7, 7);
  assert.equal(field[0], 1);
  assert.equal(field[24], 4);
  const hole = new Uint8Array(49).fill(1);
  hole[24] = 0;
  assert.equal(distanceField(hole, 7, 7)[24], 0);
});
test('stable glyph keys keep untouched objects and changed glyphs enter and depart', () => {
  const m = new Motion();
  m.retarget(
    [
      { ...target(0), key: 'a:0' },
      { ...target(1), key: 'b:0' },
    ],
    42,
  );
  m.finish();
  const kept = m.pieces[0];
  m.retarget(
    [
      { ...target(0), key: 'a:0' },
      { ...target(2), key: 'c:0' },
    ],
    42,
  );
  assert.equal(m.pieces[0], kept);
  assert.ok(m.pieces[0].settled);
  assert.equal(m.pieces[1].current.scale, 0);
  assert.ok(m.pieces.some((p) => p.departing && p.to.key === 'b:0'));
  m.finish();
  assert.equal(m.update(0.1), false);
});

test('unmodified peeled glyph keeps its landing position on a text edit', () => {
  const m = new Motion(),
    t = { ...target(0), key: 'a:0', halfHeight: 0.5 };
  m.retarget([t], 42);
  m.finish();
  m.peel({ x: 0, y: 4, z: 1.2 }, { x: 0, y: 0, z: -1 }, 2, 42);
  m.finish();
  const landed = { ...m.pieces[0].current };
  m.retarget([t, { ...target(4), key: 'b:0' }], 42);
  assert.deepEqual(m.pieces[0].current, landed);
});

import { createObjectPicker } from '../src/render/picking';
test('picking hits actual object surfaces and empty space stays empty without a letter core', () => {
  const objects = createBuiltins(),
    pick = createObjectPicker();
  const t = { ...target(0), y: 0, z: 0, rx: 0, scale: 1, asset: 3, glyph: 'test' };
  const pieces = [{ current: t, detached: false, departing: false }];
  const hit = pick({ x: 0, y: 0, z: 4 }, { x: 0, y: 0, z: -1 }, objects, pieces);
  assert.ok(hit);
  assert.equal(hit.transform.glyph, 'test');
  assert.equal(pick({ x: 2, y: 0, z: 4 }, { x: 0, y: 0, z: -1 }, objects, pieces), null);
  pieces[0].detached = true;
  assert.equal(pick({ x: 0, y: 0, z: 4 }, { x: 0, y: 0, z: -1 }, objects, pieces), null);
  objects.forEach((o) => {
    o.geometry.dispose();
    o.material.dispose();
  });
});

import { ShadowSchedule } from '../src/render/shadows';
test('shadow refresh is capped during motion and flushes the final pose', () => {
  const schedule = new ShadowSchedule(20);
  assert.equal(schedule.update(true, 1 / 120), true);
  assert.equal(schedule.update(true, 1 / 120), false);
  assert.equal(schedule.update(false, 1 / 120), true);
  assert.equal(schedule.update(false, 1), false);
  let refreshes = 0;
  for (let i = 0; i < 120; i++) if (schedule.update(true, 1 / 120)) refreshes++;
  assert.ok(refreshes >= 17 && refreshes <= 20);
});

import { objectLibrary } from '../src/objects/library';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
test('library definitions are unique, complete, normalized and carry physical metadata', () => {
  const objects = createBuiltins();
  assert.equal(new Set(objectLibrary.map((o) => o.id)).size, 25);
  for (const definition of objectLibrary) {
    assert.ok(['light', 'medium', 'heavy'].includes(definition.weight));
    assert.ok(definition.sizeRange[0] > 0 && definition.sizeRange[1] >= definition.sizeRange[0]);
    const object = objects.find((o) => o.id === definition.id)!;
    assert.equal(object.massClass, definition.weight);
    assert.ok(Math.abs(object.geometry.boundingSphere!.radius - 1) < 1e-5);
    assert.ok(Array.from(object.geometry.getAttribute('position').array).every(Number.isFinite));
    assert.ok(triangleCount(object.geometry) <= config.objects.maxTriangles);
    object.geometry.dispose();
    object.material.dispose();
  }
});
test('button has four through-holes, with solid material between them', () => {
  const assets = createBuiltins(),
    button = assets.find((o) => o.id === 'button')!;
  const material = new MeshBasicMaterial({ side: DoubleSide }),
    mesh = new Mesh(button.geometry, material);
  mesh.updateMatrixWorld();
  const scale = button.geometry.boundingBox!.max.x / 0.55;
  for (const x of [-0.18, 0.18])
    for (const z of [-0.18, 0.18]) {
      const ray = new Raycaster(new Vector3(x * scale, 3, z * scale), new Vector3(0, -1, 0));
      assert.equal(ray.intersectObject(mesh).length, 0);
    }
  assert.ok(
    new Raycaster(new Vector3(0, 3, 0), new Vector3(0, -1, 0)).intersectObject(mesh).length > 0,
  );
  assets.forEach((o) => {
    o.geometry.dispose();
    o.material.dispose();
  });
  material.dispose();
});
test('production has no glyph skeleton renderer or core setting', () => {
  assert.equal(existsSync('src/render/core.ts'), false);
  const walk = (path: string): string[] =>
    readdirSync(path, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(path, e.name)) : [join(path, e.name)],
    );
  for (const path of walk('src').filter((p) => p.endsWith('.ts'))) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(
      source,
      /TextGeometry|createCore|pop-halftone-core|features\.core|wireframe\s*:\s*true/,
    );
  }
  assert.doesNotMatch(readFileSync('src/sampler.ts', 'utf8'), /ExtrudeGeometry|extractContours/);
});

test('discarded library has all requested categories and baked wear without per-frame geometry', () => {
  const assets = createBuiltins();
  const expected = [
    'can',
    'bottle',
    'cap',
    'straw',
    'snack',
    'noodle',
    'chopsticks',
    'paper',
    'receipt',
    'cardboard',
    'notebook',
    'stub',
    'comb',
    'mug',
    'sock',
    'battery',
    'earbuds',
    'lighter',
    'rubber',
    'tape',
    'button',
    'key',
    'ring',
    'pebble',
    'coin',
  ];
  assert.deepEqual(
    assets.map((o) => o.id),
    expected,
  );
  for (const object of assets) {
    const wear = object.geometry.getAttribute('wear'),
      rust = object.geometry.getAttribute('rustMask');
    assert.equal(wear.count, object.geometry.getAttribute('position').count);
    assert.ok(Array.from(wear.array).every((n) => Number.isFinite(n) && n >= 0 && n <= 1));
    const rusted = Array.from(rust.array).some((n) => n > 0);
    assert.equal(rusted, config.library.rustIds.includes(object.id));
    object.geometry.dispose();
    object.material.dispose();
  }
  assert.equal(config.library.outlinesByDefault, false);
});
