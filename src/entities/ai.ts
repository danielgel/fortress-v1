import { findPathAdjacent } from '../nav/astar';
import { JobStatus, JobType } from '../jobs/job';
import type { GameEngine } from '../game/engine';
import { Entity, EntityType } from './entity';
import { Feature, type Pos } from '../world/types';
import { Building } from '../game/content';

const dist = (a: Pos, b: Pos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z) * 6;
const adjacent = (a: Pos, b: Pos) => a.z === b.z && Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;

function nearest(from: Entity, others: Entity[]): Entity | null {
  let best: Entity | null = null;
  let bestD = Infinity;
  for (const o of others) {
    const d = dist(from.pos, o.pos);
    if (d < bestD) {
      best = o;
      bestD = d;
    }
  }
  return best;
}

function attack(ctx: GameEngine, a: Entity, b: Entity): void {
  const armed = a.tools.includes('spear') ? 6 : 0;
  const dmg = 3 + armed + (a.physical?.strength ?? 5) * 0.4 + ctx.rng.next() * 3;
  b.physical!.health -= dmg;
  if (b.physical!.health <= 0) ctx.kill(b, a);
}

/** Fight anything hostile standing next to us. Returns true if we attacked. */
function fight(ctx: GameEngine, e: Entity, foes: Entity[]): boolean {
  const foe = foes.find((f) => adjacent(e.pos, f.pos));
  if (!foe) return false;
  e.movement?.clear();
  if (e.timer <= 0) {
    attack(ctx, e, foe);
    e.timer = 6;
  } else e.timer--;
  return true;
}

function randomWalkable(ctx: GameEngine, from: Pos, radius: number): Pos | null {
  for (let tries = 0; tries < 8; tries++) {
    const x = from.x + ctx.rng.int(radius * 2 + 1) - radius;
    const y = from.y + ctx.rng.int(radius * 2 + 1) - radius;
    if (ctx.world.walkable(x, y, from.z)) return { x, y, z: from.z };
  }
  return null;
}

export function updateDwarf(ctx: GameEngine, d: Entity): void {
  const monsters = ctx.entities.ofType(EntityType.MONSTER);
  if (monsters.length > 0 && fight(ctx, d, monsters)) return;

  const needs = d.needs!;
  if (d.job) {
    const urgent = needs.thirst > 92 || needs.hunger > 92 || needs.fatigue > 98;
    if (urgent && !d.job.personal) {
      ctx.jobs.release(d.job);
      d.job = null;
    } else {
      const status = d.job.update(ctx, d);
      if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
        const job = d.job;
        d.job = null;
        if (job.personal && status === JobStatus.FAILED) d.timer = 60;
        else d.timer = 0;
        ctx.jobs.finish(ctx, job, status);
      }
      return;
    }
  }

  // finish a chase leg started below
  if (d.movement!.isMoving) {
    d.movement!.step(ctx, d);
    return;
  }

  if (d.timer > 0) {
    d.timer--;
    return;
  }
  d.timer = 8;

  const personal = pickPersonalJob(ctx, d);
  if (personal) {
    personal.start(d);
    d.job = personal;
    return;
  }

  // everyone drops what they're doing to hunt invaders nearby
  const foe = nearest(d, monsters);
  if (foe && dist(d.pos, foe.pos) < 30) {
    const path = findPathAdjacent(ctx.world, d.pos, foe.pos, { maxNodes: 6000 });
    if (path) {
      // grab a spear from the stockpile on the way out
      if (!d.tools.includes('spear') && ctx.stock.spear > 0) {
        ctx.stock.spear--;
        d.tools.push('spear');
      }
      d.movement!.setPath(path);
      d.timer = 0;
      return;
    }
  }

  if (ctx.stock.food + ctx.stock.meals < 12) autoForage(ctx, d);

  const queued = ctx.jobs.requestJob(ctx, d);
  if (queued) return;

  if (ctx.rng.chance(0.25)) {
    const spot = randomWalkable(ctx, d.pos, 6);
    if (spot) {
      const wander = ctx.jobs.newJob(JobType.WANDER, spot, 0, true);
      wander.start(d);
      d.job = wander;
    }
  }
}

function pickPersonalJob(ctx: GameEngine, d: Entity) {
  const n = d.needs!;
  const night = ctx.calendar.isNight;
  if (n.thirst > 60) return ctx.jobs.newJob(JobType.DRINK, d.pos, 10, true, ctx.stock.booze >= 1 ? 1 : 0);
  if (n.hunger > 60 && ctx.stock.food + ctx.stock.meals >= 1) {
    const table = nearestBuilding(ctx, d, Building.TABLE, new Set());
    return ctx.jobs.newJob(JobType.EAT, table ?? d.pos, 10, true, table ? 1 : 0);
  }
  if (n.fatigue > (night ? 55 : 80)) {
    const bed = nearestBuilding(ctx, d, Building.BED, claimedBeds(ctx, d));
    return ctx.jobs.newJob(JobType.SLEEP, bed ?? d.pos, 10, true, bed ? 1 : 0);
  }
  return null;
}

/** Beds other dwarves are already heading to or sleeping in. */
function claimedBeds(ctx: GameEngine, self: Entity): Set<number> {
  const taken = new Set<number>();
  for (const o of ctx.entities.dwarves) {
    if (o !== self && o.job?.type === JobType.SLEEP && o.job.arg) taken.add(ctx.world.idx(o.job.pos.x, o.job.pos.y, o.job.pos.z));
  }
  return taken;
}

/** Closest building of a kind on roughly the same level, within a short walk. */
function nearestBuilding(ctx: GameEngine, d: Entity, kind: Building, exclude: Set<number>): Pos | null {
  const w = ctx.world;
  let best: Pos | null = null;
  let bestD = 40;
  for (const i of w.buildingTiles) {
    if (w.building[i] !== kind || exclude.has(i)) continue;
    const p = w.pos(i);
    const dd = dist(d.pos, p);
    if (dd < bestD) {
      best = p;
      bestD = dd;
    }
  }
  return best;
}

export function updateMonster(ctx: GameEngine, m: Entity): void {
  const dwarves = ctx.entities.dwarves;
  if (dwarves.length === 0) return wander(ctx, m, 5);
  if (fight(ctx, m, dwarves)) return;
  const move = m.movement!;
  if (move.isMoving) {
    if (move.step(ctx, m) === 'blocked') m.timer = 0;
    if (m.timer-- > 0) return;
  }
  const target = nearest(m, dwarves)!;
  const path = findPathAdjacent(ctx.world, m.pos, target.pos, { maxNodes: 8000, constraints: move.constraints });
  move.setPath(path);
  m.timer = 15;
  if (!path) wander(ctx, m, 4);
}

export function updateAnimal(ctx: GameEngine, a: Entity): void {
  const move = a.movement!;
  if (move.isMoving) {
    move.step(ctx, a);
    return;
  }
  if (a.timer-- > 0) return;
  a.timer = 30 + ctx.rng.int(60);
  wander(ctx, a, 4);
}

function wander(ctx: GameEngine, e: Entity, radius: number): void {
  const spot = randomWalkable(ctx, e.pos, radius);
  if (!spot) return;
  const path = findPathAdjacent(ctx.world, e.pos, spot, { maxNodes: 400, constraints: e.movement!.constraints });
  e.movement!.setPath(path);
}

/** Hungry colony: idle dwarves mark nearby shrubs for gathering on their own. */
function autoForage(ctx: GameEngine, d: Entity): void {
  if (ctx.jobs.pendingCount >= 4) return;
  const z = d.pos.z;
  const w = ctx.world;
  const R = 22;
  let best: Pos | null = null;
  let bestD = Infinity;
  for (let y = Math.max(0, d.pos.y - R); y <= Math.min(w.height - 1, d.pos.y + R); y++) {
    for (let x = Math.max(0, d.pos.x - R); x <= Math.min(w.width - 1, d.pos.x + R); x++) {
      const f = w.feature[w.idx(x, y, z)];
      if (f !== Feature.SHRUB && f !== Feature.MUSHROOM) continue;
      const dd = Math.abs(x - d.pos.x) + Math.abs(y - d.pos.y);
      if (dd < bestD && !ctx.jobs.designationAt(x, y, z, ctx)) {
        best = { x, y, z };
        bestD = dd;
      }
    }
  }
  if (best) ctx.jobs.designate(ctx, JobType.GATHER, best, 2);
}
