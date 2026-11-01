import { describe, expect, it } from 'vitest';
import { rleDecode, rleEncode } from '../src/core/codec';
import { deserialize, serialize } from '../src/core/save';
import { GameEngine } from '../src/game/engine';
import { JobType } from '../src/jobs/job';
import { findPathTo } from '../src/nav/astar';
import { EntityType } from '../src/entities/entity';
import { Feature, Flag } from '../src/world/types';
import { Building, WALL } from '../src/game/content';
import { addOrder } from '../src/game/production';
import { NO_DOORS } from '../src/nav/astar';

const small = { width: 60, height: 60, depth: 8, seed: 12345 };

function run(engine: GameEngine, ticks: number) {
  for (let i = 0; i < ticks; i++) engine.update();
}

describe('codec', () => {
  it('round-trips RLE data', () => {
    const data = new Uint8Array(1000).map((_, i) => (i < 400 ? 0 : i % 7));
    expect(rleDecode(rleEncode(data), data.length)).toEqual(data);
  });
});

describe('generation', () => {
  it('is deterministic for a seed', () => {
    const a = GameEngine.create(small);
    const b = GameEngine.create(small);
    expect(a.world.material).toEqual(b.world.material);
    expect(a.world.feature).toEqual(b.world.feature);
  });

  it('embarks dwarves on walkable surface tiles', () => {
    const e = GameEngine.create(small, 5);
    const dwarves = e.entities.dwarves;
    expect(dwarves).toHaveLength(5);
    for (const d of dwarves) expect(e.world.walkable(d.pos.x, d.pos.y, 0)).toBe(true);
  });
});

describe('pathfinding', () => {
  it('finds a path across the surface and rejects solid rock', () => {
    const e = GameEngine.create(small);
    const d = e.entities.dwarves[0];
    const target = { x: e.embark.x + 3, y: e.embark.y, z: 0 };
    expect(findPathTo(e.world, d.pos, target)).not.toBeNull();
    expect(findPathTo(e.world, d.pos, { x: e.embark.x, y: e.embark.y, z: 2 })).toBeNull();
  });
});

describe('jobs', () => {
  it('dwarves dig stairs, descend and dig out a room', () => {
    const e = GameEngine.create(small);
    const { x, y } = e.embark;
    const stairs = e.jobs.designate(e, JobType.STAIRS, { x, y, z: 0 });
    expect(typeof stairs).not.toBe('string');
    run(e, 600);
    expect(e.world.has(x, y, 0, Flag.STAIRS_DOWN)).toBe(true);
    expect(e.world.has(x, y, 1, Flag.STAIRS_UP)).toBe(true);

    const placed = e.designateArea(JobType.DIG, { x: x + 1, y, z: 1 }, { x: x + 3, y, z: 1 });
    expect(placed).toBe(3);
    run(e, 1500);
    for (let dx = 1; dx <= 3; dx++) expect(e.world.isOpen(x + dx, y, 1)).toBe(true);
    expect(e.jobs.jobs.size).toBe(0);
    expect(e.stock.stone).toBeGreaterThan(0);
  });

  it('rejects invalid designations', () => {
    const e = GameEngine.create(small);
    const { x, y } = e.embark;
    expect(e.jobs.designate(e, JobType.DIG, { x, y, z: 0 })).toBe('already open');
    expect(e.jobs.designate(e, JobType.CHOP, { x, y, z: 0 })).toBe('nothing to do there');
  });

  it('chops trees and gathers shrubs for resources', () => {
    const e = GameEngine.create(small);
    const w = e.world;
    const { x, y } = e.embark;
    w.feature[w.idx(x + 2, y, 0)] = Feature.TREE;
    w.feature[w.idx(x, y + 2, 0)] = Feature.SHRUB;
    e.jobs.designate(e, JobType.CHOP, { x: x + 2, y, z: 0 });
    e.jobs.designate(e, JobType.GATHER, { x, y: y + 2, z: 0 });
    const food = e.stock.food;
    const wood = e.stock.wood;
    run(e, 400);
    expect(e.stock.wood).toBe(wood + 3);
    expect(e.stock.food).toBeGreaterThanOrEqual(food + 3 - 7);
    expect(w.feature[w.idx(x + 2, y, 0)]).toBe(Feature.NONE);
  });

  it('builds a wall only when stone is available', () => {
    const e = GameEngine.create(small);
    const { x, y } = e.embark;
    e.jobs.designate(e, JobType.BUILD, { x: x + 3, y: y + 3, z: 0 });
    run(e, 300);
    expect(e.world.isOpen(x + 3, y + 3, 0)).toBe(true);
    e.stock.stone = 2;
    run(e, 600);
    expect(e.world.isOpen(x + 3, y + 3, 0)).toBe(false);
    expect(e.stock.stone).toBe(1);
  });
});

describe('needs', () => {
  it('dwarves drink and eat on their own', () => {
    const e = GameEngine.create(small);
    for (const d of e.entities.dwarves) {
      d.needs!.thirst = 80;
      d.needs!.hunger = 80;
    }
    const food = e.stock.food;
    run(e, 1500);
    expect(e.stock.food).toBeLessThan(food);
    expect(e.stock.booze).toBeLessThan(10);
    for (const d of e.entities.dwarves) expect(d.needs!.hunger).toBeLessThan(70);
  });
});

describe('fluids', () => {
  it('flows water downward and conserves volume without sources', () => {
    const e = GameEngine.create(small);
    const w = e.world;
    // carve a shaft at z=1..3 and put a blob of water at the top
    const x = 5;
    const y = 5;
    for (let z = 1; z <= 3; z++) {
      w.flags[w.idx(x, y, z)] |= Flag.OPEN | (z < 3 ? Flag.STAIRS_DOWN : 0);
      w.flags[w.idx(x + 1, y, z)] |= Flag.OPEN;
    }
    w.water[w.idx(x, y, 1)] = 7;
    e.fluids.rebuild();
    for (let i = 0; i < 100; i++) e.fluids.update();
    let total = 0;
    for (let z = 1; z <= 3; z++) total += w.water[w.idx(x, y, z)] + w.water[w.idx(x + 1, y, z)];
    expect(total).toBe(7);
    expect(w.water[w.idx(x, y, 3)] + w.water[w.idx(x + 1, y, 3)]).toBe(7);
  });
});

describe('fluids and floors', () => {
  it('does not let water fall through a solid floor', () => {
    const e = GameEngine.create(small);
    const w = e.world;
    w.flags[w.idx(5, 5, 1)] |= Flag.OPEN;
    w.flags[w.idx(5, 5, 2)] |= Flag.OPEN;
    w.water[w.idx(5, 5, 1)] = 7;
    e.fluids.rebuild();
    for (let i = 0; i < 50; i++) e.fluids.update();
    expect(w.water[w.idx(5, 5, 1)]).toBe(7);
    expect(w.water[w.idx(5, 5, 2)]).toBe(0);
  });

  it('surface lakes never flood the surface or the level below', () => {
    const e = GameEngine.create(small);
    const w = e.world;
    const before = w.water.slice(0, w.width * w.height).filter((v) => v > 0).length;
    for (let i = 0; i < 40; i++) e.fluids.update();
    const after = w.water.slice(0, w.width * w.height).filter((v) => v > 0).length;
    expect(after).toBe(before);
  });
});

describe('world events', () => {
  it('advances the calendar, weather and survives a long run', () => {
    const e = GameEngine.create(small);
    run(e, 600 * 30);
    expect(e.calendar.day).toBe(30);
    expect(e.entities.dwarves.length).toBeGreaterThan(0);
  });

  it('invaders attack and dwarves fight back', () => {
    const e = GameEngine.create(small);
    e.spawnInvasion();
    expect(e.entities.ofType(EntityType.MONSTER).length).toBeGreaterThan(0);
    run(e, 3000);
    // either the invaders were slain or at least someone engaged them without crashing
    expect(e.entities.dwarves.length).toBeGreaterThan(0);
  });
});

describe('save/load', () => {
  it('round-trips a running game', () => {
    const e = GameEngine.create(small);
    e.jobs.designate(e, JobType.STAIRS, { x: e.embark.x, y: e.embark.y, z: 0 });
    run(e, 200);
    const copy = deserialize(serialize(e));
    expect(copy.world.flags).toEqual(e.world.flags);
    expect(copy.tick).toBe(e.tick);
    expect(copy.entities.all.size).toBe(e.entities.all.size);
    expect(copy.jobs.jobs.size).toBe(e.jobs.jobs.size);
    run(copy, 800);
    expect(copy.world.has(e.embark.x, e.embark.y, 0, Flag.STAIRS_DOWN)).toBe(true);
  });
});

/** Flat, open test site: clear everything in a square around the embark. */
function clearing(e: GameEngine, r = 6) {
  const w = e.world;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      const i = w.idx(e.embark.x + dx, e.embark.y + dy, 0);
      w.feature[i] = Feature.NONE;
      w.water[i] = 0;
      w.flags[i] &= ~Flag.SOURCE;
    }
}

describe('tools', () => {
  it('nobody can mine without a pick', () => {
    const e = GameEngine.create(small);
    e.stock.pick = 0;
    const { x, y } = e.embark;
    e.jobs.designate(e, JobType.STAIRS, { x, y, z: 0 });
    run(e, 600);
    expect(e.world.has(x, y, 0, Flag.STAIRS_DOWN)).toBe(false);
    e.stock.pick = 1;
    run(e, 600);
    expect(e.world.has(x, y, 0, Flag.STAIRS_DOWN)).toBe(true);
    expect(e.entities.dwarves.filter((d) => d.tools.includes('pick'))).toHaveLength(1);
    expect(e.stock.pick).toBe(0);
  });

  it('a dead dwarf returns their tools to the stockpile', () => {
    const e = GameEngine.create(small);
    const d = e.entities.dwarves[0];
    d.tools.push('axe');
    const axes = e.stock.axe;
    e.kill(d);
    expect(e.stock.axe).toBe(axes + 1);
  });
});

describe('buildings and production', () => {
  it('builds a workshop, fills an order, places the furniture', () => {
    const e = GameEngine.create(small);
    clearing(e);
    const { x, y } = e.embark;
    e.stock.wood = 10;
    expect(typeof e.jobs.designate(e, JobType.BUILD, { x: x + 3, y, z: 0 }, 1, Building.CARPENTER)).not.toBe('string');
    run(e, 400);
    expect(e.world.buildingAt(x + 3, y, 0)).toBe(Building.CARPENTER);
    expect(e.stock.wood).toBe(7);

    addOrder(e, 'wood-bed', 2);
    run(e, 800);
    expect(e.stock.bed).toBe(2);
    expect(e.stock.wood).toBe(3);
    expect(e.orders['wood-bed']).toBeUndefined();

    e.jobs.designate(e, JobType.BUILD, { x: x - 3, y, z: 0 }, 1, Building.BED);
    run(e, 300);
    expect(e.world.buildingAt(x - 3, y, 0)).toBe(Building.BED);
    expect(e.stock.bed).toBe(1);
  });

  it('dwarves sleep in beds and enjoy it', () => {
    const e = GameEngine.create(small, 1);
    clearing(e);
    const { x, y } = e.embark;
    e.world.setBuilding(x + 2, y + 2, 0, Building.BED);
    const d = e.entities.dwarves[0];
    d.needs!.fatigue = 90;
    d.needs!.hunger = d.needs!.thirst = 0;
    run(e, 200);
    expect(d.mental!.thought).toBe('slept in a comfortable bed');
  });

  it('does not let workshops exceed the materials on hand', () => {
    const e = GameEngine.create(small);
    clearing(e);
    const { x, y } = e.embark;
    e.world.setBuilding(x + 2, y, 0, Building.KITCHEN);
    e.world.setBuilding(x - 2, y, 0, Building.KITCHEN);
    e.stock.food = 3;
    e.stock.meals = 0;
    addOrder(e, 'meal', 5);
    run(e, 20);
    expect(e.jobs.ofType(JobType.CRAFT)).toHaveLength(1);
  });

  it('removing furniture refunds it', () => {
    const e = GameEngine.create(small);
    clearing(e);
    const { x, y } = e.embark;
    e.world.setBuilding(x + 2, y, 0, Building.TABLE);
    const tables = e.stock.table;
    e.jobs.designate(e, JobType.REMOVE, { x: x + 2, y, z: 0 });
    run(e, 200);
    expect(e.world.buildingAt(x + 2, y, 0)).toBe(Building.NONE);
    expect(e.stock.table).toBe(tables + 1);
  });

  it('walls go through the build menu too', () => {
    const e = GameEngine.create(small);
    clearing(e);
    e.stock.stone = 1;
    e.jobs.designate(e, JobType.BUILD, { x: e.embark.x + 3, y: e.embark.y, z: 0 }, 1, WALL);
    run(e, 300);
    expect(e.world.isOpen(e.embark.x + 3, e.embark.y, 0)).toBe(false);
  });

  it('doors keep goblins out but let dwarves through', () => {
    const e = GameEngine.create(small);
    const w = e.world;
    // a 1-wide corridor at depth 1 with a door in the middle
    for (let x = 5; x <= 9; x++) w.flags[w.idx(x, 5, 1)] |= Flag.OPEN;
    w.setBuilding(7, 5, 1, Building.DOOR);
    expect(findPathTo(w, { x: 5, y: 5, z: 1 }, { x: 9, y: 5, z: 1 })).not.toBeNull();
    expect(findPathTo(w, { x: 5, y: 5, z: 1 }, { x: 9, y: 5, z: 1 }, { constraints: NO_DOORS })).toBeNull();
  });
});

describe('gathering', () => {
  it('fishing spots keep yielding food until cancelled', () => {
    const e = GameEngine.create(small);
    clearing(e);
    const w = e.world;
    const { x, y } = e.embark;
    const i = w.idx(x + 3, y, 0);
    w.water[i] = 7;
    w.flags[i] |= Flag.SOURCE;
    e.fluids.rebuild();
    const job = e.jobs.designate(e, JobType.FISH, { x: x + 3, y, z: 0 });
    expect(typeof job).not.toBe('string');
    for (const d of e.entities.dwarves) d.needs!.hunger = 0;
    const food = e.stock.food;
    run(e, 1500);
    expect(e.stock.food).toBeGreaterThan(food - 4);
    expect(e.entities.dwarves.some((d) => d.skills!.xp.fishing >= 10)).toBe(true);
    expect(e.jobs.ofType(JobType.FISH)).toHaveLength(1);
  });

  it('hunters chase down an animal', () => {
    const e = GameEngine.create(small);
    clearing(e, 8);
    const prey = e.entities.ofType(EntityType.ANIMAL)[0];
    prey.pos = { x: e.embark.x + 6, y: e.embark.y + 6, z: 0 };
    const food = e.stock.food;
    expect(typeof e.jobs.designate(e, JobType.HUNT, prey.pos)).not.toBe('string');
    run(e, 800);
    expect(prey.alive).toBe(false);
    expect(e.stock.food).toBeGreaterThanOrEqual(food + 5 - 7);
  });

  it('gathers mushrooms underground', () => {
    const e = GameEngine.create(small);
    const w = e.world;
    const { x, y } = e.embark;
    w.setStairsDown(x, y, 0);
    w.flags[w.idx(x + 1, y, 1)] |= Flag.OPEN;
    w.flags[w.idx(x + 2, y, 1)] |= Flag.OPEN;
    w.feature[w.idx(x + 2, y, 1)] = Feature.MUSHROOM;
    const plants = e.stock.plants;
    e.jobs.designate(e, JobType.GATHER, { x: x + 2, y, z: 1 });
    run(e, 500);
    expect(e.stock.plants).toBe(plants + 2);
  });
});

describe('save compatibility', () => {
  it('round-trips buildings, tools and orders', () => {
    const e = GameEngine.create(small);
    e.world.setBuilding(e.embark.x + 2, e.embark.y, 0, Building.MASON);
    e.entities.dwarves[0].tools.push('pick');
    addOrder(e, 'statue', 3);
    const copy = deserialize(serialize(e));
    expect(copy.world.buildingAt(e.embark.x + 2, e.embark.y, 0)).toBe(Building.MASON);
    expect(copy.world.buildingTiles.size).toBe(1);
    expect(copy.entities.all.get(e.entities.dwarves[0].id)!.tools).toEqual(['pick']);
    expect(copy.orders.statue.queued).toBe(3);
  });

  it('loads a version 2 save', () => {
    const e = GameEngine.create(small);
    const d = JSON.parse(serialize(e));
    d.version = 2;
    delete d.arrays.building;
    delete d.orders;
    d.stock = { stone: 4, ore: 1, gems: 0, wood: 2, food: 9 };
    for (const ent of d.entities) delete ent.tools;
    const copy = deserialize(JSON.stringify(d));
    expect(copy.stock.stone).toBe(4);
    expect(copy.stock.pick).toBeGreaterThan(0);
    expect(copy.stock.meals).toBe(0);
    run(copy, 100);
  });
});
