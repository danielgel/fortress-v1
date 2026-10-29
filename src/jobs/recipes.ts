import { Feature, Flag, Material, type Pos } from '../world/types';
import type { GameEngine } from '../game/engine';
import { JobType, type Job, type JobStep } from './job';
import { GotoStep, TeleportStep, WorkStep } from './steps';

export type JobCheck = 'ok' | 'obsolete' | 'blocked';

const near = (target: Pos, allowOn: boolean) => (ctx: GameEngine) => (x: number, y: number, z: number) => {
  if (z !== target.z || !ctx.world.walkable(x, y, z)) return false;
  const d = Math.abs(x - target.x) + Math.abs(y - target.y);
  return d === 1 || (d === 0 && allowOn);
};

const exact = (target: Pos) => () => (x: number, y: number, z: number) => x === target.x && y === target.y && z === target.z;

const nearWater = (ctx: GameEngine) => (x: number, y: number, z: number) => {
  const w = ctx.world;
  if (!w.walkable(x, y, z)) return false;
  if (w.water[w.idx(x, y, z)] > 0) return true;
  return w.neighbours4(x, y).some(([nx, ny]) => w.inBounds(nx, ny, z) && w.water[w.idx(nx, ny, z)] > 0 && w.isOpen(nx, ny, z));
};

/** Is this job still worth doing? */
export function checkJob(ctx: GameEngine, job: Job): JobCheck {
  const { x, y, z } = job.pos;
  const w = ctx.world;
  if (!w.inBounds(x, y, z)) return 'obsolete';
  const i = w.idx(x, y, z);
  switch (job.type) {
    case JobType.DIG:
      return w.flags[i] & Flag.OPEN ? 'obsolete' : 'ok';
    case JobType.STAIRS:
      return w.flags[i] & Flag.STAIRS_DOWN || z + 1 >= w.depth ? 'obsolete' : 'ok';
    case JobType.CHOP:
      return w.feature[i] === Feature.TREE ? 'ok' : 'obsolete';
    case JobType.GATHER:
      return w.feature[i] === Feature.SHRUB ? 'ok' : 'obsolete';
    case JobType.BUILD:
      if (!(w.flags[i] & Flag.OPEN) || w.feature[i] !== Feature.NONE || w.water[i] > 0) return 'obsolete';
      return ctx.stock.stone >= 1 ? 'ok' : 'blocked';
    case JobType.TELEPORT:
      return w.walkable(x, y, z) ? 'ok' : 'obsolete';
    case JobType.EAT:
      return ctx.stock.food >= 1 ? 'ok' : 'obsolete';
    default:
      return 'ok';
  }
}

/** Why a designation can't be placed here (null when it can). */
export function designationError(ctx: GameEngine, type: JobType, pos: Pos): string | null {
  const w = ctx.world;
  if (!w.inBounds(pos.x, pos.y, pos.z)) return 'out of bounds';
  const i = w.idx(pos.x, pos.y, pos.z);
  if (type === JobType.STAIRS && w.water[i] > 0) return 'water';
  if (type === JobType.STAIRS && pos.z + 1 >= w.depth) return 'bottom level';
  if (type === JobType.DIG || type === JobType.STAIRS) {
    if (type === JobType.DIG && w.flags[i] & Flag.OPEN) return 'already open';
    if (type === JobType.STAIRS && w.flags[i] & Flag.STAIRS_DOWN) return 'already stairs';
    return null;
  }
  return checkJob(ctx, { type, pos } as Job) === 'obsolete' ? 'nothing to do there' : null;
}

export function buildSteps(job: Job): JobStep[] {
  const t = job.pos;
  switch (job.type) {
    case JobType.TELEPORT:
      return [new TeleportStep()];
    case JobType.GOTO:
      return [new GotoStep(exact(t), t)];
    case JobType.DIG:
      return [
        new GotoStep(near(t, false), t),
        new WorkStep({
          ticks: 30,
          skill: 'mining',
          valid: (c, j) => checkJob(c, j) === 'ok',
          effect: (c) => dig(c, t),
        }),
      ];
    case JobType.STAIRS:
      return [
        new GotoStep(near(t, true), t),
        new WorkStep({
          ticks: 45,
          skill: 'mining',
          valid: (c, j) => checkJob(c, j) === 'ok',
          effect: (c) => {
            if (!c.world.isOpen(t.x, t.y, t.z)) dig(c, t);
            c.world.setStairsDown(t.x, t.y, t.z);
          },
        }),
      ];
    case JobType.CHOP:
      return [
        new GotoStep(near(t, false), t),
        new WorkStep({
          ticks: 40,
          skill: 'woodcutting',
          valid: (c, j) => checkJob(c, j) === 'ok',
          effect: (c) => {
            c.world.feature[c.world.idx(t.x, t.y, t.z)] = Feature.NONE;
            c.stock.wood += 3;
          },
        }),
      ];
    case JobType.GATHER:
      return [
        new GotoStep(near(t, false), t),
        new WorkStep({
          ticks: 15,
          skill: 'foraging',
          valid: (c, j) => checkJob(c, j) === 'ok',
          effect: (c) => {
            c.world.feature[c.world.idx(t.x, t.y, t.z)] = Feature.NONE;
            c.stock.food += 3;
          },
        }),
      ];
    case JobType.BUILD:
      return [
        new GotoStep(near(t, false), t),
        new WorkStep({
          ticks: 25,
          skill: 'construction',
          valid: (c, j) => checkJob(c, j) === 'ok' && c.entities.at(t.x, t.y, t.z).length === 0,
          effect: (c) => {
            c.stock.stone -= 1;
            c.world.fill(t.x, t.y, t.z, Material.STONE);
            c.world.flags[c.world.idx(t.x, t.y, t.z)] |= Flag.DISCOVERED;
            c.log('BUILDING_CONSTRUCTED', `A wall was built at ${t.x},${t.y}.`);
          },
        }),
      ];
    case JobType.DRINK:
      return [
        new GotoStep(nearWater, null),
        new WorkStep({ ticks: 6, effect: (_c, _j, w) => w.needs && (w.needs.thirst = 0) }),
      ];
    case JobType.EAT:
      return [
        new WorkStep({
          ticks: 10,
          valid: (c) => c.stock.food >= 1,
          effect: (c, _j, w) => {
            c.stock.food -= 1;
            if (w.needs) w.needs.hunger = 0;
          },
        }),
      ];
    case JobType.SLEEP:
      return [
        new WorkStep({
          ticks: 160,
          onTick: (_c, w) => w.needs && (w.needs.fatigue = Math.max(0, w.needs.fatigue - 0.5)),
          effect: (_c, _j, w) => w.needs && (w.needs.fatigue = 0),
        }),
      ];
    case JobType.WANDER:
      return [new GotoStep(exact(t), t)];
  }
}

function dig(ctx: GameEngine, t: Pos): void {
  const w = ctx.world;
  // breaking into an undiscovered natural cavern?
  const cavern = w.neighbours4(t.x, t.y).some(([nx, ny]) => w.inBounds(nx, ny, t.z) && w.isOpen(nx, ny, t.z) && !w.has(nx, ny, t.z, Flag.DISCOVERED));
  const material = w.materialAt(t.x, t.y, t.z);
  const found = w.excavate(t.x, t.y, t.z);
  if (material === Material.STONE) ctx.stock.stone += 1;
  if (found === Feature.ORE) {
    ctx.stock.ore += 1;
    ctx.log('RESOURCE_DEPLETED', 'Ore vein found!');
  } else if (found === Feature.GEM) {
    ctx.stock.gems += 1;
    ctx.log('RESOURCE_DEPLETED', 'A gem was unearthed!');
  }
  if (cavern) ctx.log('CAVERN_DISCOVERED', `Breakthrough! A cavern at depth ${t.z}.`);
}
