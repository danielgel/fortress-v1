import { Feature, Flag, Material, type Pos } from '../world/types';
import type { Entity } from '../entities/entity';
import type { GameEngine } from '../game/engine';
import { BUILDINGS, Building, RECIPES, WALL, canAfford, give, pay } from '../game/content';
import { JobType, type Job, type JobStep } from './job';
import { GotoStep, HuntStep, TeleportStep, WorkStep } from './steps';

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

/** Is any tile within one step of `p` (or `p` itself) of this building type? */
function besideBuilding(ctx: GameEngine, p: Pos, b: Building): boolean {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (ctx.world.buildingAt(p.x + dx, p.y + dy, p.z) === b) return true;
  return false;
}

/** Can something be placed on this tile? */
function freeFloor(ctx: GameEngine, i: number): boolean {
  const w = ctx.world;
  return (w.flags[i] & Flag.OPEN) !== 0 && !(w.flags[i] & (Flag.STAIRS_DOWN | Flag.STAIRS_UP)) && w.feature[i] === Feature.NONE && w.water[i] === 0 && w.magma[i] === 0 && w.building[i] === Building.NONE;
}

/** Is this job still worth doing? */
export function checkJob(ctx: GameEngine, job: Pick<Job, 'type' | 'pos' | 'arg'>): JobCheck {
  const { x, y, z } = job.pos;
  const w = ctx.world;
  if (!w.inBounds(x, y, z)) return 'obsolete';
  const i = w.idx(x, y, z);
  switch (job.type) {
    case JobType.DIG:
      return w.flags[i] & Flag.OPEN ? 'obsolete' : 'ok';
    case JobType.STAIRS:
      return w.flags[i] & Flag.STAIRS_DOWN || z + 1 >= w.depth || w.building[i] ? 'obsolete' : 'ok';
    case JobType.CHOP:
      return w.feature[i] === Feature.TREE ? 'ok' : 'obsolete';
    case JobType.GATHER:
      return w.feature[i] === Feature.SHRUB || w.feature[i] === Feature.MUSHROOM ? 'ok' : 'obsolete';
    case JobType.BUILD:
      if (!freeFloor(ctx, i)) return 'obsolete';
      return canAfford(ctx.stock, BUILDINGS[job.arg as Building].cost) ? 'ok' : 'blocked';
    case JobType.FISH:
      if (w.water[i] === 0) return 'obsolete';
      return z === 0 && ctx.isIce(x, y) ? 'blocked' : 'ok';
    case JobType.HUNT: {
      const prey = ctx.entities.all.get(job.arg);
      return prey?.alive ? 'ok' : 'obsolete';
    }
    case JobType.CRAFT: {
      const r = RECIPES[job.arg];
      if (!r || w.building[i] !== r.workshop) return 'obsolete';
      return canAfford(ctx.stock, r.input) ? 'ok' : 'blocked';
    }
    case JobType.REMOVE:
      return w.building[i] ? 'ok' : 'obsolete';
    case JobType.TELEPORT:
      return w.walkable(x, y, z) ? 'ok' : 'obsolete';
    case JobType.EAT:
      return ctx.stock.food + ctx.stock.meals >= 1 ? 'ok' : 'obsolete';
    default:
      return 'ok';
  }
}

/** Why a designation can't be placed here (null when it can). */
export function designationError(ctx: GameEngine, type: JobType, pos: Pos, arg = 0): string | null {
  const w = ctx.world;
  if (!w.inBounds(pos.x, pos.y, pos.z)) return 'out of bounds';
  const i = w.idx(pos.x, pos.y, pos.z);
  if (type === JobType.STAIRS && w.water[i] > 0) return 'water';
  if (type === JobType.STAIRS && pos.z + 1 >= w.depth) return 'bottom level';
  if (type === JobType.STAIRS && w.building[i]) return 'something is built there';
  if (type === JobType.DIG || type === JobType.STAIRS) {
    if (type === JobType.DIG && w.flags[i] & Flag.OPEN) return 'already open';
    if (type === JobType.STAIRS && w.flags[i] & Flag.STAIRS_DOWN) return 'already stairs';
    return null;
  }
  if (type === JobType.BUILD && !freeFloor(ctx, i)) return w.building[i] ? 'something is built there' : 'needs clear, dry floor';
  if (type === JobType.FISH) {
    if (w.water[i] === 0) return 'not water';
    if (!w.neighbours4(pos.x, pos.y).some(([nx, ny]) => w.walkable(nx, ny, pos.z))) return 'too far from shore';
  }
  return checkJob(ctx, { type, pos, arg }) === 'obsolete' ? 'nothing to do there' : null;
}

/** Bookkeeping when a queued job succeeds (personal jobs never get here). */
export function onJobCompleted(ctx: GameEngine, job: Job): void {
  if (job.type !== JobType.CRAFT) return;
  const order = ctx.orders[RECIPES[job.arg].id];
  if (order && order.queued > 0) order.queued--;
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
            const i = c.world.idx(t.x, t.y, t.z);
            // berries are mostly food; mushrooms are mostly brewing plants
            give(c.stock, c.world.feature[i] === Feature.MUSHROOM ? { food: 1, plants: 2 } : { food: 2, plants: 1 });
            c.world.feature[i] = Feature.NONE;
          },
        }),
      ];
    case JobType.BUILD: {
      const kind = job.arg as Building;
      const info = BUILDINGS[kind];
      return [
        new GotoStep(near(t, info.walkable), t),
        new WorkStep({
          ticks: info.workshop ? 60 : 25,
          skill: 'construction',
          valid: (c, j) => checkJob(c, j) === 'ok' && (info.walkable || c.entities.at(t.x, t.y, t.z).length === 0),
          effect: (c) => {
            pay(c.stock, info.cost);
            if (kind === WALL) {
              c.world.fill(t.x, t.y, t.z, Material.STONE);
              c.world.flags[c.world.idx(t.x, t.y, t.z)] |= Flag.DISCOVERED;
            } else {
              c.world.setBuilding(t.x, t.y, t.z, kind);
              if (info.workshop) c.log('BUILDING_CONSTRUCTED', `A ${info.name.toLowerCase()} workshop was built.`);
            }
          },
        }),
      ];
    }
    case JobType.REMOVE:
      return [
        new GotoStep(near(t, true), t),
        new WorkStep({
          ticks: 20,
          skill: 'construction',
          valid: (c, j) => checkJob(c, j) === 'ok',
          effect: (c) => {
            const kind = c.world.buildingAt(t.x, t.y, t.z);
            give(c.stock, BUILDINGS[kind].cost);
            c.world.setBuilding(t.x, t.y, t.z, Building.NONE);
          },
        }),
      ];
    case JobType.FISH:
      return [
        new GotoStep(near(t, false), t),
        new WorkStep({
          ticks: 70,
          skill: 'fishing',
          valid: (c, j) => checkJob(c, j) === 'ok',
          effect: (c, _j, w) => {
            const level = w.skills?.level('fishing') ?? 0;
            if (c.rng.chance(0.55 + level * 0.06)) c.stock.food += 2 + (level >= 3 ? 1 : 0);
          },
        }),
      ];
    case JobType.HUNT:
      return [new HuntStep()];
    case JobType.CRAFT: {
      const r = RECIPES[job.arg];
      return [
        new GotoStep(near(t, true), t),
        new WorkStep({
          ticks: r.ticks,
          skill: r.skill,
          valid: (c, j) => checkJob(c, j) === 'ok',
          effect: (c, _j, w) => {
            pay(c.stock, r.input);
            give(c.stock, r.output);
            if (r.skill === 'crafting') c.log('JOB_COMPLETED', `${w.name} made a ${r.name.toLowerCase()}.`);
          },
        }),
      ];
    }
    case JobType.DRINK:
      if (job.arg === 1) {
        return [
          new WorkStep({
            ticks: 8,
            valid: (c) => c.stock.booze >= 1,
            effect: (c, _j, w) => {
              c.stock.booze -= 1;
              if (w.needs) w.needs.thirst = 0;
              w.mental?.feel('enjoyed a drink of booze', 4);
            },
          }),
        ];
      }
      return [
        new GotoStep(nearWater, null),
        new WorkStep({
          ticks: 6,
          effect: (_c, _j, w) => {
            if (w.needs) w.needs.thirst = 0;
            w.mental?.feel('drank plain water', 0);
          },
        }),
      ];
    case JobType.EAT:
      return [
        ...(job.arg ? [new GotoStep(near(t, true), t, true)] : []),
        new WorkStep({
          ticks: 10,
          valid: (c) => c.stock.food + c.stock.meals >= 1,
          effect: (c, _j, w) => eat(c, w),
        }),
      ];
    case JobType.SLEEP:
      return [
        ...(job.arg ? [new GotoStep(exact(t), t, true)] : []),
        new WorkStep({
          ticks: job.arg ? 110 : 160,
          onTick: (c, w) => w.needs && (w.needs.fatigue = Math.max(0, w.needs.fatigue - (inBed(c, w) ? 0.8 : 0.5))),
          effect: (c, _j, w) => {
            if (w.needs) w.needs.fatigue = 0;
            if (inBed(c, w)) w.mental?.feel('slept in a comfortable bed', 6);
            else w.mental?.feel('slept on the hard ground', -3);
          },
        }),
      ];
    case JobType.WANDER:
      return [new GotoStep(exact(t), t)];
  }
}

const inBed = (c: GameEngine, w: Entity) => c.world.buildingAt(w.pos.x, w.pos.y, w.pos.z) === Building.BED;

function eat(c: GameEngine, w: Entity): void {
  const meal = c.stock.meals >= 1;
  if (meal) c.stock.meals -= 1;
  else c.stock.food -= 1;
  if (w.needs) w.needs.hunger = 0;
  const table = besideBuilding(c, w.pos, Building.TABLE);
  const chair = table && besideBuilding(c, w.pos, Building.CHAIR);
  if (meal && chair) w.mental?.feel('had a fine meal at a proper table', 8);
  else if (meal && table) w.mental?.feel('had a meal at a table', 6);
  else if (meal) w.mental?.feel('ate a meal standing up', 3);
  else if (table) w.mental?.feel('ate raw food at a table', 1);
  else w.mental?.feel('ate raw food off the floor', -2);
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
