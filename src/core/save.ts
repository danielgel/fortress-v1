import { GameEngine } from '../game/engine';
import { Entity, EntityType } from '../entities/entity';
import { MentalComponent, NeedsComponent, PhysicalComponent, SkillComponent } from '../entities/components';
import { Job, type JobType } from '../jobs/job';
import { WeatherType } from '../world/weather';
import { World } from '../world/world';
import { defaultStock } from '../game/content';
import { rleDecode, rleEncode } from './codec';

const KEY = 'fortress-save-v2';
const VERSION = 3;
/** Older versions we can still read (missing fields fall back to defaults). */
const READABLE = [2, 3];

export function serialize(engine: GameEngine): string {
  const w = engine.world;
  return JSON.stringify({
    version: VERSION,
    seed: engine.seed,
    tick: engine.tick,
    rngState: engine.rng.state,
    embark: engine.embark,
    stock: engine.stock,
    orders: engine.orders,
    weather: engine.weather.current,
    dims: [w.width, w.height, w.depth],
    arrays: {
      material: rleEncode(w.material),
      flags: rleEncode(w.flags),
      feature: rleEncode(w.feature),
      water: rleEncode(w.water),
      magma: rleEncode(w.magma),
      building: rleEncode(w.building),
      biome: rleEncode(w.biome),
    },
    nextEntityId: engine.entities.nextId,
    entities: [...engine.entities.all.values()].map((e) => ({
      id: e.id,
      type: e.type,
      name: e.name,
      pos: e.pos,
      physical: e.physical,
      mental: e.mental,
      skills: e.skills?.xp,
      needs: e.needs,
      tools: e.tools,
    })),
    jobs: [...engine.jobs.jobs.values()].map((j) => ({ id: j.id, type: j.type, pos: j.pos, priority: j.priority, attempts: j.attempts, arg: j.arg })),
    log: engine.logEntries.slice(-50),
  });
}

export function deserialize(text: string): GameEngine {
  const d = JSON.parse(text);
  if (!READABLE.includes(d.version)) throw new Error(`Unsupported save version ${d.version}`);
  const [width, height, depth] = d.dims as number[];
  const world = new World(width, height, depth);
  world.material.set(rleDecode(d.arrays.material, world.size));
  world.flags.set(rleDecode(d.arrays.flags, world.size));
  world.feature.set(rleDecode(d.arrays.feature, world.size));
  world.water.set(rleDecode(d.arrays.water, world.size));
  world.magma.set(rleDecode(d.arrays.magma, world.size));
  world.biome.set(rleDecode(d.arrays.biome, world.biome.length));
  if (d.arrays.building) world.building.set(rleDecode(d.arrays.building, world.size));
  world.indexBuildings();

  const engine = new GameEngine(world, d.seed);
  engine.tick = d.tick;
  engine.calendar.tick = d.tick;
  engine.rng.state = d.rngState;
  engine.embark = d.embark;
  engine.stock = { ...defaultStock(), ...d.stock };
  engine.orders = d.orders ?? {};
  engine.weather.current = d.weather as WeatherType;
  engine.attachWorld(world);
  engine.logEntries.push(...d.log);

  for (const s of d.entities) {
    const e = new Entity(s.id, s.type as EntityType, s.name, s.pos);
    e.tools = s.tools ?? [];
    if (s.physical) e.physical = Object.assign(new PhysicalComponent(), s.physical);
    if (s.mental) e.mental = Object.assign(new MentalComponent(), s.mental);
    if (s.needs) e.needs = Object.assign(new NeedsComponent(), s.needs);
    if (s.skills) {
      e.skills = new SkillComponent();
      Object.assign(e.skills.xp, s.skills);
    }
    const template =
      e.type === EntityType.DWARF ? Entity.dwarf(0, '', s.pos, { int: () => 0 }) : e.type === EntityType.MONSTER ? Entity.monster(0, s.pos) : Entity.animal(0, s.pos);
    e.movement = template.movement;
    engine.entities.add(e);
  }
  engine.entities.nextId = d.nextEntityId;

  for (const j of d.jobs) {
    engine.jobs.restore(engine, new Job(j.id, j.type as JobType, j.pos, j.priority, false, j.arg ?? 0));
  }
  return engine;
}

export function saveToStorage(engine: GameEngine): boolean {
  try {
    localStorage.setItem(KEY, serialize(engine));
    return true;
  } catch {
    return false;
  }
}

export function loadFromStorage(): GameEngine | null {
  try {
    const text = localStorage.getItem(KEY);
    return text ? deserialize(text) : null;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}
