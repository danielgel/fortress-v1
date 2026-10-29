import { Flag, type Pos } from '../world/types';
import { type World } from '../world/world';

export interface PathfindingConstraints {
  canSwim: boolean;
  canUseStairs: boolean;
}

export const DEFAULT_CONSTRAINTS: PathfindingConstraints = { canSwim: false, canUseStairs: true };

export interface PathOptions {
  /** Cap on expanded nodes so unreachable targets fail fast. */
  maxNodes?: number;
  constraints?: PathfindingConstraints;
}

class MinHeap {
  private items: number[] = [];
  private keys: number[] = [];
  get size(): number {
    return this.items.length;
  }
  push(item: number, key: number): void {
    const a = this.items;
    const k = this.keys;
    let i = a.length;
    a.push(item);
    k.push(key);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (k[parent] <= key) break;
      a[i] = a[parent];
      k[i] = k[parent];
      i = parent;
    }
    a[i] = item;
    k[i] = key;
  }
  pop(): number {
    const a = this.items;
    const k = this.keys;
    const top = a[0];
    const lastItem = a.pop()!;
    const lastKey = k.pop()!;
    if (a.length > 0) {
      let i = 0;
      for (;;) {
        let c = i * 2 + 1;
        if (c >= a.length) break;
        if (c + 1 < a.length && k[c + 1] < k[c]) c++;
        if (k[c] >= lastKey) break;
        a[i] = a[c];
        k[i] = k[c];
        i = c;
      }
      a[i] = lastItem;
      k[i] = lastKey;
    }
    return top;
  }
}

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * A* over the 3D tile grid. `isGoal` decides where to stop; `hint` is used for the
 * heuristic only (so "stand next to X" queries still search efficiently).
 * Returns the steps after `start`, or null when no path exists.
 */
export function findPath(
  world: World,
  start: Pos,
  isGoal: (x: number, y: number, z: number) => boolean,
  hint: Pos | null,
  opts: PathOptions = {},
): Pos[] | null {
  const maxNodes = opts.maxNodes ?? 25000;
  const c = opts.constraints ?? DEFAULT_CONSTRAINTS;
  const passable = (x: number, y: number, z: number): boolean => {
    if (!world.inBounds(x, y, z)) return false;
    if (world.walkable(x, y, z)) return true;
    // swimmers can cross deeper water
    if (c.canSwim) {
      const i = world.idx(x, y, z);
      return (world.flags[i] & Flag.OPEN) !== 0 && world.magma[i] === 0 && world.water[i] > 0;
    }
    return false;
  };

  const startIdx = world.idx(start.x, start.y, start.z);
  const g = new Map<number, number>([[startIdx, 0]]);
  const from = new Map<number, number>();
  const closed = new Set<number>();
  const open = new MinHeap();
  const h = (x: number, y: number, z: number) =>
    hint ? Math.abs(x - hint.x) + Math.abs(y - hint.y) + Math.abs(z - hint.z) * 2 : 0;
  open.push(startIdx, h(start.x, start.y, start.z));

  let expanded = 0;
  while (open.size > 0 && expanded < maxNodes) {
    const cur = open.pop();
    if (closed.has(cur)) continue;
    closed.add(cur);
    expanded++;
    const p = world.pos(cur);
    if (isGoal(p.x, p.y, p.z)) return rebuild(world, from, cur, startIdx);

    const gc = g.get(cur)!;
    const consider = (nx: number, ny: number, nz: number, step: number) => {
      const ni = world.idx(nx, ny, nz);
      if (closed.has(ni)) return;
      const ng = gc + step * world.moveCost(nx, ny, nz);
      if (ng < (g.get(ni) ?? Infinity)) {
        g.set(ni, ng);
        from.set(ni, cur);
        open.push(ni, ng + h(nx, ny, nz));
      }
    };

    for (const [dx, dy] of DIRS) {
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (!passable(nx, ny, p.z)) continue;
      const diag = dx !== 0 && dy !== 0;
      // no cutting corners through walls
      if (diag && !(passable(p.x + dx, p.y, p.z) && passable(p.x, p.y + dy, p.z))) continue;
      consider(nx, ny, p.z, diag ? 1.414 : 1);
    }
    if (c.canUseStairs) {
      const f = world.flags[cur];
      if (f & Flag.STAIRS_DOWN && passable(p.x, p.y, p.z + 1)) consider(p.x, p.y, p.z + 1, 1);
      if (f & Flag.STAIRS_UP && passable(p.x, p.y, p.z - 1)) consider(p.x, p.y, p.z - 1, 1);
    }
  }
  return null;
}

function rebuild(world: World, from: Map<number, number>, end: number, start: number): Pos[] {
  const path: Pos[] = [];
  let cur = end;
  while (cur !== start) {
    path.push(world.pos(cur));
    cur = from.get(cur)!;
  }
  return path.reverse();
}

/** Path to any tile orthogonally adjacent to (or equal to) the target. */
export function findPathAdjacent(world: World, start: Pos, target: Pos, opts?: PathOptions, allowOnTarget = true): Pos[] | null {
  return findPath(
    world,
    start,
    (x, y, z) => {
      if (z !== target.z || !world.walkable(x, y, z)) return false;
      const d = Math.abs(x - target.x) + Math.abs(y - target.y);
      return d === 1 || (d === 0 && allowOnTarget);
    },
    target,
    opts,
  );
}

export function findPathTo(world: World, start: Pos, target: Pos, opts?: PathOptions): Pos[] | null {
  return findPath(world, start, (x, y, z) => x === target.x && y === target.y && z === target.z, target, opts);
}
