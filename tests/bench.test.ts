/**
 * Node baselines for the Godot spike; godot/tests/bench.gd times the same work the same way.
 * Skipped by `npm test`. Run with `BENCH=1 npx vitest run tests/bench.test.ts`.
 */
import { describe, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { findPathTo } from '../src/nav/astar';
import { FluidSystem } from '../src/world/fluids';
import { generateWorld } from '../src/world/generator';
import { type Pos } from '../src/world/types';
import { breachWorld, cloneWorld, embarkWorld, LARGE, MEDIUM, randomWalkable } from './golden-scenarios';

/** One warm-up call, then `runs` timed calls. Returns [mean ms, min ms]. */
function time(runs: number, fn: () => void): [number, number] {
  fn();
  let total = 0;
  let min = Infinity;
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    fn();
    const dt = performance.now() - t;
    total += dt;
    min = Math.min(min, dt);
  }
  return [total / runs, min];
}

describe.skipIf(!import.meta.env.BENCH)('bench', () => {
  it('prints node timings', { timeout: 600_000 }, () => {
    const medium = embarkWorld(MEDIUM);
    const rng = new Rng(7);
    const pairs: [Pos, Pos][] = [];
    for (let n = 0; n < 50; n++) pairs.push([randomWalkable(medium.world, rng, 0), randomWalkable(medium.world, rng, 0)]);
    const reachable = pairs.filter(([a, b]) => findPathTo(medium.world, a, b, { maxNodes: 12000 }) !== null);
    const large = embarkWorld(LARGE);
    const start = { x: large.site.x, y: large.site.y, z: 0 };
    const solid = { x: large.site.x, y: large.site.y, z: 2 };
    const water = breachWorld('water');
    const magma = breachWorld('magma');
    const fluidRun = (src: typeof water, steps: number) => () => {
      const f = new FluidSystem(cloneWorld(src.world));
      f.rebuild();
      for (let i = 0; i < steps; i++) f.update();
    };

    const rows: [string, [number, number]][] = [
      ['generate medium 100x100x10', time(10, () => void generateWorld(MEDIUM))],
      ['generate large 140x140x12', time(10, () => void generateWorld(LARGE))],
      ['50 random surface paths, medium, 12k cap (per path)', time(10, () => pairs.forEach(([a, b]) => findPathTo(medium.world, a, b, { maxNodes: 12000 })))],
      ['reachable pairs only (per path)', time(10, () => reachable.forEach(([a, b]) => findPathTo(medium.world, a, b, { maxNodes: 12000 })))],
      ['unreachable target, large, 12k cap', time(20, () => void findPathTo(large.world, start, solid, { maxNodes: 12000 }))],
      ['unreachable target, large, 25k cap', time(20, () => void findPathTo(large.world, start, solid))],
      ['fluids: clone + rebuild (baseline)', time(20, fluidRun(water, 0))],
      ['fluids: water breach, 100 steps', time(10, fluidRun(water, 100))],
      ['fluids: magma breach, 100 steps', time(10, fluidRun(magma, 100))],
    ];
    rows[2][1] = [rows[2][1][0] / pairs.length, rows[2][1][1] / pairs.length];
    rows[3][1] = [rows[3][1][0] / reachable.length, rows[3][1][1] / reachable.length];
    rows.push([`(unreachable pairs among the 50: ${pairs.length - reachable.length})`, [0, 0]]);
    console.log(rows.map(([name, [mean, min]]) => `${name.padEnd(52)} mean ${mean.toFixed(2).padStart(9)} ms   min ${min.toFixed(2).padStart(9)} ms`).join('\n'));
  });
});
