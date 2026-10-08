/** Rate-limit moving-object shadows, always flushing the final settled pose. */
export class ShadowSchedule {
  private clock = 0;
  private last = -Infinity;
  private pending = false;
  constructor(private readonly hz: number) {}
  update(changed: boolean, dt: number) {
    this.clock += Math.max(0, dt);
    this.pending ||= changed;
    if (!this.pending || (changed && this.clock - this.last < 1 / this.hz)) return false;
    this.pending = false;
    this.last = this.clock;
    return true;
  }
}
