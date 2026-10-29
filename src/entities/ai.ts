import { findPathAdjacent } from '../nav/astar';
import { JobStatus, JobType } from '../jobs/job';
import type { GameEngine } from '../game/engine';
import { Entity, EntityType } from './entity';
import { Feature, type Pos } from '../world/types';

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
  const dmg = 3 + (a.physical?.strength ?? 5) * 0.4 + ctx.rng.next() * 3;
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
      d.movement!.setPath(path);
      d.timer = 0;
      return;
    }
  }

  if (ctx.stock.food < 12) autoForage(ctx, d);

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
  let type: JobType | null = null;
  if (n.thirst > 60) type = JobType.DRINK;
  else if (n.hunger > 60 && ctx.stock.food >= 1) type = JobType.EAT;
  else if (n.fatigue > (night ? 55 : 80)) type = JobType.SLEEP;
  if (type === null) return null;
  return ctx.jobs.newJob(type, d.pos, 10, true);
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
  const path = findPathAdjacent(ctx.world, m.pos, target.pos, { maxNodes: 8000 });
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
  const path = findPathAdjacent(ctx.world, e.pos, spot, { maxNodes: 400 });
  e.movement!.setPath(path);
}

/** Hungry colony: idle dwarves mark nearby shrubs for gathering on their own. */
function autoForage(ctx: GameEngine, d: Entity): void {
  if (d.pos.z !== 0 || ctx.jobs.pendingCount >= 4) return;
  const w = ctx.world;
  const R = 22;
  let best: Pos | null = null;
  let bestD = Infinity;
  for (let y = Math.max(0, d.pos.y - R); y <= Math.min(w.height - 1, d.pos.y + R); y++) {
    for (let x = Math.max(0, d.pos.x - R); x <= Math.min(w.width - 1, d.pos.x + R); x++) {
      if (w.feature[w.idx(x, y, 0)] !== Feature.SHRUB) continue;
      const dd = Math.abs(x - d.pos.x) + Math.abs(y - d.pos.y);
      if (dd < bestD && !ctx.jobs.designationAt(x, y, 0, ctx)) {
        best = { x, y, z: 0 };
        bestD = dd;
      }
    }
  }
  if (best) ctx.jobs.designate(ctx, JobType.GATHER, best, 2);
}
