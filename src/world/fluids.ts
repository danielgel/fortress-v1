import { Flag, MAX_FLUID } from './types';
import { type World } from './world';

/**
 * Cellular fluid simulation using an active set. Levels run 0..7.
 * Fluids only fall through stairwells (every other tile has a floor). Surface (z=0)
 * tiles never spread sideways; lake tiles are infinite sources.
 */
export class FluidSystem {
  private active = new Set<number>();
  private step = 0;

  constructor(private world: World) {
    world.onOpened = (i) => this.wake(i);
  }

  /** Register every fluid-bearing tile (used after generation / load). */
  rebuild(): void {
    this.active.clear();
    const w = this.world;
    for (let i = 0; i < w.size; i++) if (w.water[i] > 0 || w.magma[i] > 0) this.active.add(i);
  }

  wake(i: number): void {
    const w = this.world;
    this.active.add(i);
    const p = w.pos(i);
    for (const [nx, ny] of w.neighbours4(p.x, p.y)) if (w.inBounds(nx, ny, p.z)) this.active.add(w.idx(nx, ny, p.z));
    if (p.z > 0) this.active.add(w.idx(p.x, p.y, p.z - 1));
  }

  get activeCount(): number {
    return this.active.size;
  }

  /** Advance one fluid step. Water every step, magma every 4th. */
  update(): void {
    this.step++;
    const cells = [...this.active];
    this.active.clear();
    const magmaTurn = this.step % 4 === 0;
    for (const i of cells) {
      this.flow(i, this.world.water, true);
      if (magmaTurn) this.flow(i, this.world.magma, false);
      else if (this.world.magma[i] > 0) this.active.add(i);
    }
  }

  private canHold(i: number, level: Uint8Array, isWater: boolean): boolean {
    const w = this.world;
    if (!(w.flags[i] & Flag.OPEN)) return false;
    return (isWater ? w.magma[i] : w.water[i]) === 0 && level[i] < MAX_FLUID;
  }

  private flow(i: number, level: Uint8Array, isWater: boolean): void {
    const w = this.world;
    const l = level[i];
    if (l === 0) return;
    const p = w.pos(i);
    const isSource = isWater && (w.flags[i] & Flag.SOURCE) !== 0;

    // 1. fall down - only through an open stairwell, otherwise the tile has a solid floor
    if (p.z + 1 < w.depth && w.flags[i] & Flag.STAIRS_DOWN) {
      const below = w.idx(p.x, p.y, p.z + 1);
      if (this.canHold(below, level, isWater)) {
        const amount = Math.min(l, MAX_FLUID - level[below]);
        level[below] += amount;
        if (!isSource) level[i] -= amount;
        this.wake(below);
        this.active.add(i);
        return;
      }
    }
    if (p.z === 0 || isSource) return;

    // 2. spread sideways to lower neighbours
    let moved = false;
    for (const [nx, ny] of w.neighbours4(p.x, p.y)) {
      if (!w.inBounds(nx, ny, p.z)) continue;
      const n = w.idx(nx, ny, p.z);
      if (this.canHold(n, level, isWater) && level[i] - level[n] >= 2) {
        level[i]--;
        level[n]++;
        this.active.add(n);
        moved = true;
        if (level[i] <= 1) break;
      }
    }
    if (moved) this.active.add(i);
  }
}
