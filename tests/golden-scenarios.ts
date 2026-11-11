/**
 * Deterministic scenarios shared by the golden fixtures (golden.test.ts) and the node
 * benchmarks (core.bench.ts). The Godot port in godot/ rebuilds the same scenarios in
 * godot/tests/scenarios.gd, so any change here must be mirrored there.
 */
import { Rng } from '../src/core/rng';
import { Building } from '../src/game/content';
import { type PathfindingConstraints } from '../src/nav/astar';
import { FluidSystem } from '../src/world/fluids';
import { clearEmbark, findEmbarkSite, generateWorld, type WorldGenerationParameters } from '../src/world/generator';
import { Flag, MAX_FLUID, type Pos } from '../src/world/types';
import { World } from '../src/world/world';

export const SMALL: WorldGenerationParameters = { width: 60, height: 60, depth: 8, seed: 12345 };
export const MEDIUM: WorldGenerationParameters = { width: 100, height: 100, depth: 10, seed: 12345 };
export const LARGE: WorldGenerationParameters = { width: 140, height: 140, depth: 12, seed: 12345 };
/** Non-square, odd depth, big seed: catches width/height mix-ups and int32 wrap-around. */
export const ODD: WorldGenerationParameters = { width: 73, height: 41, depth: 9, seed: 2147483000 };

export const LAYERS = ['material', 'flags', 'feature', 'water', 'magma', 'building', 'crop', 'biome'] as const;

export async function sha256(data: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>));
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function layerHashes(w: World): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const name of LAYERS) out[name] = await sha256(w[name]);
  return out;
}

/** Exact bits of a double, big-endian hex, so float parity can be checked without JSON rounding. */
export function f64hex(x: number): string {
  const v = new DataView(new ArrayBuffer(8));
  v.setFloat64(0, x);
  let s = '';
  for (let i = 0; i < 8; i++) s += v.getUint8(i).toString(16).padStart(2, '0');
  return s;
}

/** The world as GameEngine.create leaves it, minus creatures: generated, embark meadow cleared. */
export function embarkWorld(p: WorldGenerationParameters): { world: World; site: { x: number; y: number } } {
  const world = generateWorld(p);
  const site = findEmbarkSite(world);
  clearEmbark(world, site.x, site.y);
  return { world, site };
}

/** SMALL embark world plus a stairwell east of the site and a corridor at z=1 with a door. */
export function pathWorld(): { world: World; site: { x: number; y: number } } {
  const { world, site } = embarkWorld(SMALL);
  const sx = site.x + 2;
  world.setStairsDown(sx, site.y, 0);
  for (let x = sx + 1; x <= sx + 6; x++) world.excavate(x, site.y, 1);
  world.setBuilding(sx + 3, site.y, 1, Building.DOOR);
  return { world, site };
}

export function randomWalkable(w: World, rng: Rng, z: number): Pos {
  for (let tries = 0; tries < 200; tries++) {
    const x = rng.int(w.width);
    const y = rng.int(w.height);
    if (w.walkable(x, y, z)) return { x, y, z };
  }
  throw new Error('no walkable tile found');
}

export interface PathQuery {
  kind: 'to' | 'adj' | 'below';
  start: [number, number, number];
  target: [number, number, number];
  maxNodes?: number;
  /** [canSwim, canUseStairs, canOpenDoors] */
  constraints?: [boolean, boolean, boolean];
  allowOnTarget?: boolean;
}

export function constraintsOf(q: PathQuery): PathfindingConstraints | undefined {
  if (!q.constraints) return undefined;
  const [canSwim, canUseStairs, canOpenDoors] = q.constraints;
  return { canSwim, canUseStairs, canOpenDoors };
}

/** Queries on pathWorld(): random surface pairs, adjacency, swimming, stairs, doors, caps. */
export function pathQueries(world: World, site: { x: number; y: number }): PathQuery[] {
  const rng = new Rng(42);
  const xyz = (p: Pos): [number, number, number] => [p.x, p.y, p.z];
  const qs: PathQuery[] = [];
  for (let n = 0; n < 30; n++) qs.push({ kind: 'to', start: xyz(randomWalkable(world, rng, 0)), target: xyz(randomWalkable(world, rng, 0)) });
  for (let n = 0; n < 6; n++) {
    qs.push({ kind: 'adj', start: xyz(randomWalkable(world, rng, 0)), target: [rng.int(world.width), rng.int(world.height), 0], allowOnTarget: n % 2 === 0 });
  }
  for (let n = 0; n < 4; n++) {
    qs.push({ kind: 'to', start: xyz(randomWalkable(world, rng, 0)), target: xyz(randomWalkable(world, rng, 0)), constraints: [true, true, true] });
  }
  const s: [number, number, number] = [site.x, site.y, 0];
  const sx = site.x + 2;
  qs.push(
    { kind: 'to', start: s, target: [sx + 6, site.y, 1] },
    { kind: 'to', start: s, target: [sx + 6, site.y, 1], constraints: [false, true, false] },
    { kind: 'to', start: s, target: [sx + 6, site.y, 1], constraints: [false, false, true] },
    { kind: 'to', start: [sx + 6, site.y, 1], target: s },
    { kind: 'adj', start: s, target: [sx + 7, site.y, 1], allowOnTarget: false },
    { kind: 'to', start: s, target: [site.x, site.y, 2] },
    { kind: 'to', start: s, target: [site.x, site.y, 2], maxNodes: 50 },
    { kind: 'to', start: s, target: [sx + 6, site.y, 1], maxNodes: 5 },
    { kind: 'below', start: s, target: [sx, site.y, 0] },
    { kind: 'below', start: s, target: [sx, site.y, 0], constraints: [false, false, true] },
  );
  return qs;
}

/** First full-strength pocket of `fluid` with solid rock to its east: dig 12 tiles into it, stairs down at the end. */
export function breach(w: World, fluid: 'water' | 'magma'): [number, number, number] | null {
  const level = w[fluid];
  for (let z = 1; z < w.depth; z++) {
    for (let y = 0; y < w.height; y++) {
      for (let x = 0; x + 12 < w.width; x++) {
        const i = w.idx(x, y, z);
        if (level[i] !== MAX_FLUID || w.flags[i] & Flag.SOURCE || w.flags[i + 1] & Flag.OPEN) continue;
        for (let dx = 1; dx <= 12; dx++) w.excavate(x + dx, y, z);
        w.setStairsDown(x + 12, y, z);
        return [x, y, z];
      }
    }
  }
  return null;
}

/** MEDIUM embark world with fluids attached and a breached pocket. */
export function breachWorld(fluid: 'water' | 'magma'): { world: World; fluids: FluidSystem; at: [number, number, number] } {
  const { world } = embarkWorld(MEDIUM);
  const fluids = new FluidSystem(world);
  fluids.rebuild();
  const at = breach(world, fluid);
  if (!at) throw new Error(`no ${fluid} pocket to breach`);
  return { world, fluids, at };
}

/** The shaft from tests/sim.test.ts: a blob of water above a 3-deep stairwell. */
export function shaftWorld(): { world: World; fluids: FluidSystem } {
  const { world } = embarkWorld(SMALL);
  const fluids = new FluidSystem(world);
  const x = 5;
  const y = 5;
  for (let z = 1; z <= 3; z++) {
    world.flags[world.idx(x, y, z)] |= Flag.OPEN | (z < 3 ? Flag.STAIRS_DOWN : 0);
    world.flags[world.idx(x + 1, y, z)] |= Flag.OPEN;
  }
  world.water[world.idx(x, y, 1)] = 7;
  fluids.rebuild();
  return { world, fluids };
}

export function cloneWorld(w: World): World {
  const c = new World(w.width, w.height, w.depth);
  for (const name of LAYERS) c[name].set(w[name]);
  c.indexBuildings();
  return c;
}
