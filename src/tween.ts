/** 조각의 공중 부착·퇴장·떼어낸 뒤 포물선 낙하를 관리한다. */
import { Euler, Quaternion, Vector3 } from 'three';
import { config } from './config';
import type { Transform, Vec3 } from './state';
import { random } from './state';
export interface MovingPiece {
  from: Transform;
  attachment: Transform;
  to: Transform;
  current: Transform;
  delay: number;
  departing: boolean;
  detached: boolean;
  fall: number;
  fallDuration: number;
  fallSpin: number;
  fromRotation: Quaternion;
  toRotation: Quaternion;
  settled: boolean;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rotation = (t: Transform) => new Quaternion().setFromEuler(new Euler(t.rx, t.ry, t.rz));
export class Motion {
  pieces: MovingPiece[] = [];
  private readonly quaternion = new Quaternion();
  private readonly euler = new Euler();
  elapsed = 0;
  active = false;
  attaching = false;
  retarget(targets: Transform[], seed: number) {
    const rng = random(seed),
      old = this.pieces.filter((p) => !p.departing);
    const keyed = new Map(old.map((p, i) => [p.to.key ?? String(i), p]));
    const used = new Set<MovingPiece>();
    const top = Math.max(1, ...targets.map((t) => t.y));
    this.pieces = targets.map((to, i) => {
      const previous = keyed.get(to.key ?? String(i));
      if (previous && to.key) {
        used.add(previous);
        const dx = to.x - previous.attachment.x,
          dy = to.y - previous.attachment.y,
          dz = to.z - previous.attachment.z;
        previous.current.x += dx;
        if (!previous.detached) previous.current.y += dy;
        previous.current.z += dz;
        if (!previous.detached) {
          Object.assign(previous.current, to);
          previous.to = { ...to };
        } else {
          previous.to.x += dx;
          previous.to.z += dz;
        }
        previous.attachment = { ...to };
        previous.settled = true;
        return previous;
      }
      if (previous) used.add(previous);
      const angle = rng() * Math.PI * 2;
      const from = previous
        ? { ...previous.current, asset: to.asset }
        : {
            ...to,
            x: to.x + Math.cos(angle) * config.animation.entryDistance,
            z: to.z + Math.sin(angle) * config.animation.entryDistance,
            y: top + config.animation.arc,
            scale: 0,
          };
      return {
        from,
        attachment: { ...to },
        to: { ...to },
        current: { ...from },
        delay: (to.order ?? 0) * config.sentence.glyphDelay + rng() * config.animation.stagger,
        departing: false,
        detached: false,
        fall: 0,
        fallDuration: 0,
        fallSpin: 0,
        fromRotation: rotation(from),
        toRotation: rotation(to),
        settled: false,
      };
    });
    for (const p of old)
      if (!used.has(p)) {
        const from = { ...p.current },
          to = { ...from, scale: 0, y: Math.max(0, from.halfHeight ?? 0), rx: 0, rz: 0 };
        this.pieces.push({
          from,
          attachment: { ...to },
          to,
          current: { ...from },
          delay: 0,
          departing: true,
          detached: false,
          fall: 0,
          fallDuration: 0,
          fallSpin: 0,
          fromRotation: rotation(from),
          toRotation: rotation(to),
          settled: false,
        });
      }
    this.elapsed = 0;
    this.active = this.attaching = this.pieces.some((p) => !p.settled);
  }
  peel(position: Vec3, direction: Vec3, radius: number, seed: number) {
    const rng = random(seed);
    for (const p of this.pieces) {
      const rand = rng(),
        spin = rng();
      if (p.detached || p.departing || this.attaching) continue;
      const t = p.current;
      if (Math.hypot(t.x - position.x, t.y - position.y, t.z - position.z) > radius) continue;
      const normal = new Vector3(0, 1, 0).applyQuaternion(rotation(t));
      if (
        normal.dot(new Vector3(direction.x, direction.y, direction.z)) >
        -config.sweep.facingThreshold
      )
        continue;
      p.from = { ...t };
      p.to = {
        ...t,
        x: t.x + normal.x * config.sweep.outward + (rand - 0.5) * config.sweep.spread,
        y:
          config.floor.y +
          t.scale * (t.halfHeight ?? config.piece.thickness / 2 + config.piece.bend) +
          Math.floor(rand * config.objects.floorLayers) * t.scale * config.objects.layerStep +
          config.layout.groundLift,
        z: t.z + normal.z * config.sweep.outward + (spin - 0.5) * config.sweep.spread,
        rx: 0,
        ry: spin * Math.PI * 2,
        rz: 0,
      };
      p.fromRotation.copy(rotation(p.from));
      p.toRotation.copy(rotation(p.to));
      p.settled = false;
      p.detached = true;
      p.fall = 0;
      p.fallDuration = config.sweep.duration * (1 + rand / 2);
      p.fallSpin = (spin - 0.5) * config.sweep.spin;
      this.active = true;
    }
  }
  update(dt: number) {
    if (!this.active) return false;
    this.elapsed += Math.max(0, dt);
    let active = false,
      attaching = false;
    for (const p of this.pieces) {
      if (p.settled) continue;
      if (p.detached) {
        p.fall += Math.max(0, dt);
        const t = Math.min(1, p.fall / p.fallDuration);
        active ||= t < 1;
        p.current.x = lerp(p.from.x, p.to.x, t);
        p.current.z = lerp(p.from.z, p.to.z, t);
        // 바깥 방향 이동과 아래로 가속하는 포물선. 종점은 바닥 높이에 고정.
        p.current.y = lerp(p.from.y, p.to.y, t * t) + config.sweep.arc * 4 * t * (1 - t);
        this.orient(p, t);
        p.current.ry += Math.sin(t * Math.PI) * p.fallSpin;
        if (t === 1) {
          Object.assign(p.current, p.to);
          p.settled = true;
        }
        continue;
      }
      const duration = p.departing ? config.animation.exitDuration : config.animation.duration;
      const t = Math.max(0, Math.min(1, (this.elapsed - p.delay) / duration));
      active ||= t < 1;
      attaching ||= t < 1;
      const ease = t * t * (3 - 2 * t);
      for (const key of ['x', 'y', 'z', 'scale'] as const)
        p.current[key] = lerp(p.from[key], p.to[key], ease);
      p.current.y += Math.sin(t * Math.PI) * config.animation.arc;
      p.current.x +=
        Math.sin(t * Math.PI * 2) * config.animation.arc * config.animation.lateralCurve;
      this.orient(p, ease);
      if (t === 1) {
        Object.assign(p.current, p.to);
        p.settled = true;
      }
    }
    this.active = active;
    this.attaching = attaching;
    return true;
  }
  private orient(p: MovingPiece, t: number) {
    const e = this.euler.setFromQuaternion(
      this.quaternion.copy(p.fromRotation).slerp(p.toRotation, t),
    );
    p.current.rx = e.x;
    p.current.ry = e.y;
    p.current.rz = e.z;
  }
  finish() {
    for (const p of this.pieces) {
      Object.assign(p.current, p.to);
      p.settled = true;
      if (p.detached) p.fall = p.fallDuration;
    }
    this.elapsed = config.animation.duration + config.animation.stagger;
    this.active = this.attaching = false;
  }
}
