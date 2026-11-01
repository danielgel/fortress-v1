import { EventManager, type EventType } from '../core/events';
import { Rng } from '../core/rng';
import { updateAnimal, updateDwarf, updateMonster } from '../entities/ai';
import { EntityType, type Entity } from '../entities/entity';
import { EntityManager } from '../entities/manager';
import { JobManager } from '../jobs/job-manager';
import { JobType } from '../jobs/job';
import { BIOMES, type BiomeType } from '../world/biome';
import { WorldCalendar, Season, SEASON_NAMES, TICKS_PER_HOUR } from '../world/calendar';
import { RegionClimate, SHRUB_PLANT } from '../world/climate';
import { FluidSystem } from '../world/fluids';
import { clearEmbark, defaultParameters, findEmbarkSite, generateWorld, type WorldGenerationParameters } from '../world/generator';
import { Feature, Flag, Material, type Pos } from '../world/types';
import { WEATHER_NAMES, WeatherSystem } from '../world/weather';
import type { World } from '../world/world';
import { Building, defaultStock, type Stock } from './content';
import { processOrders, type Orders } from './production';

export type { Stock } from './content';

export interface LogEntry {
  tick: number;
  type: EventType;
  text: string;
}

/** Central engine that owns and coordinates every subsystem. */
export class GameEngine {
  tick = 0;
  readonly events = new EventManager();
  readonly entities = new EntityManager();
  readonly jobs = new JobManager();
  readonly calendar = new WorldCalendar();
  readonly weather = new WeatherSystem();
  stock: Stock = defaultStock();
  orders: Orders = {};
  readonly logEntries: LogEntry[] = [];
  embark = { x: 0, y: 0 };
  climate!: RegionClimate;
  fluids!: FluidSystem;
  rng: Rng;

  constructor(
    public world: World,
    public readonly seed: number,
  ) {
    this.rng = new Rng(seed ^ 0x9e3779b9);
    this.attachWorld(world);
  }

  static create(params: Partial<WorldGenerationParameters> = {}, dwarves = 7): GameEngine {
    const p = { ...defaultParameters(), ...params };
    const world = generateWorld(p);
    const engine = new GameEngine(world, p.seed);
    engine.tick = engine.calendar.tick = 8 * TICKS_PER_HOUR; // start the first morning
    engine.climate.update(engine.calendar);
    engine.setupEmbark(dwarves);
    return engine;
  }

  /** (Re)wire everything that depends on the world instance. */
  attachWorld(world: World): void {
    this.world = world;
    this.fluids = new FluidSystem(world);
    this.fluids.rebuild();
    this.refreshClimate();
  }

  /** Mean temperature / rainfall of the land around the embark site. */
  private regionAverages(): [number, number] {
    const w = this.world;
    const R = 14;
    let t = 0;
    let r = 0;
    let n = 0;
    for (let y = Math.max(0, this.embark.y - R); y <= Math.min(w.height - 1, this.embark.y + R); y++) {
      for (let x = Math.max(0, this.embark.x - R); x <= Math.min(w.width - 1, this.embark.x + R); x++) {
        const info = BIOMES[w.biome[y * w.width + x] as BiomeType];
        t += info.temperature;
        r += info.rainfall;
        n++;
      }
    }
    return [t / n, r / n];
  }

  refreshClimate(): void {
    this.climate = RegionClimate.fromAverages(...this.regionAverages());
    this.climate.update(this.calendar);
  }

  private setupEmbark(dwarves: number): void {
    const site = findEmbarkSite(this.world);
    this.embark = site;
    this.refreshClimate();
    clearEmbark(this.world, site.x, site.y);
    for (let i = 0; i < dwarves; i++) this.spawnNear(EntityType.DWARF, site, 3);
    for (let i = 0; i < 6; i++) this.spawnNear(EntityType.ANIMAL, site, 25);
    this.log('DWARF_BORN', `${dwarves} dwarves embark on the ${BIOMES[this.world.biome[site.y * this.world.width + site.x] as BiomeType].name} frontier.`);
  }

  spawnNear(type: EntityType, center: { x: number; y: number }, radius: number): Entity | null {
    for (let tries = 0; tries < 60; tries++) {
      const x = center.x + this.rng.int(radius * 2 + 1) - radius;
      const y = center.y + this.rng.int(radius * 2 + 1) - radius;
      if (this.world.walkable(x, y, 0)) return this.entities.create(type, { x, y, z: 0 }, this.rng);
    }
    return null;
  }

  log(type: EventType, text: string): void {
    const entry = { tick: this.tick, type, text };
    this.logEntries.push(entry);
    if (this.logEntries.length > 200) this.logEntries.shift();
    this.events.emit({ type, message: text, tick: this.tick });
  }

  kill(victim: Entity, killer?: Entity): void {
    if (!victim.alive) return;
    if (victim.job) this.jobs.release(victim.job);
    victim.job = null;
    // the fallen dwarf's tools go back to the stockpile
    for (const t of victim.tools) this.stock[t]++;
    victim.tools = [];
    this.entities.remove(victim);
    if (victim.type === EntityType.DWARF) this.log('DWARF_DIED', `${victim.name} has died${killer ? ` (killed by a ${killer.name})` : ''}.`);
    else if (victim.type === EntityType.MONSTER) this.log('CREATURE_SPAWNED', `A ${victim.name} was slain.`);
  }

  /** Advance the simulation by one tick. */
  update(): void {
    const prevDay = this.calendar.day;
    const prevSeason = this.calendar.season;
    this.tick++;
    this.calendar.tick = this.tick;

    if (this.tick % 10 === 0) this.climate.update(this.calendar);
    const changed = this.weather.update(this.tick, this.climate, this.calendar, this.rng);
    if (changed !== null) this.log('WEATHER_CHANGED', `The weather turns to ${WEATHER_NAMES[changed].toLowerCase()}.`);

    if (this.tick % 5 === 0) this.fluids.update();
    if (this.tick % 10 === 0) processOrders(this);

    for (const e of [...this.entities.all.values()]) {
      if (!e.alive) continue;
      e.update(this);
      if (e.physical && e.physical.health <= 0) {
        this.kill(e);
        continue;
      }
      if (e.type === EntityType.DWARF) updateDwarf(this, e);
      else if (e.type === EntityType.MONSTER) updateMonster(this, e);
      else updateAnimal(this, e);
    }

    if (this.calendar.day !== prevDay) this.onNewDay();
    if (this.calendar.season !== prevSeason) {
      this.log('SEASON_CHANGED', `${SEASON_NAMES[this.calendar.season]} has arrived.`);
    }
  }

  private onNewDay(): void {
    const w = this.world;
    const season = this.calendar.season;
    // shrubs regrow where the climate allows
    const factor = season === Season.WINTER ? 0 : season === Season.AUTUMN ? 0.5 : 1;
    if (factor > 0 && this.climate.canSupport(SHRUB_PLANT)) {
      for (let n = 0; n < 40; n++) {
        const x = this.rng.int(w.width);
        const y = this.rng.int(w.height);
        const i = w.idx(x, y, 0);
        const ground = w.material[i];
        if (ground === Material.SAND || ground === Material.SNOW || ground === Material.STONE) continue;
        if (w.feature[i] === Feature.NONE && w.water[i] === 0 && this.rng.chance(0.2 * factor)) w.feature[i] = Feature.SHRUB;
      }
    }

    this.regrowMushrooms();
    const food = this.stock.food + this.stock.meals;
    if (food < 8) this.log('RESOURCE_DEPLETED', `Food is running low (${food} left)!`);
    const day = this.calendar.day;
    const dwarves = this.entities.dwarves;
    if (day > 0 && day % 18 === 0 && dwarves.length < 30) this.spawnMigrants();
    if (day >= 24 && this.entities.ofType(EntityType.MONSTER).length === 0 && this.rng.chance(0.06)) this.spawnInvasion();
    if (this.entities.ofType(EntityType.ANIMAL).length < 4) this.spawnNear(EntityType.ANIMAL, this.embark, 30);
  }

  /** Cavern floors sprout new mushrooms, whatever the season above. */
  private regrowMushrooms(): void {
    const w = this.world;
    for (let n = 0; n < 300; n++) {
      const z = 3 + this.rng.int(Math.max(1, w.depth - 3));
      if (z >= w.depth) continue;
      const i = w.idx(this.rng.int(w.width), this.rng.int(w.height), z);
      if (w.flags[i] & Flag.OPEN && w.feature[i] === Feature.NONE && w.building[i] === Building.NONE && !w.water[i] && !w.magma[i] && this.rng.chance(0.25)) {
        w.feature[i] = Feature.MUSHROOM;
      }
    }
  }

  spawnMigrants(): void {
    const n = 1 + this.rng.int(3);
    let made = 0;
    for (let i = 0; i < n; i++) if (this.spawnNear(EntityType.DWARF, this.embark, 14)) made++;
    if (made) this.log('MIGRANTS_ARRIVED', `${made} migrant${made > 1 ? 's' : ''} arrived at the fortress.`);
  }

  spawnInvasion(): void {
    const n = Math.min(5, 1 + Math.floor(this.calendar.day / 48) + this.rng.int(2));
    const edgeX = this.rng.chance(0.5) ? 2 : this.world.width - 3;
    const edgeY = 2 + this.rng.int(this.world.height - 4);
    let made = 0;
    for (let i = 0; i < n; i++) if (this.spawnNear(EntityType.MONSTER, { x: edgeX, y: edgeY }, 6)) made++;
    if (made) this.log('INVASION_STARTED', `Goblins! ${made} invader${made > 1 ? 's approach' : ' approaches'} from the ${edgeX < 10 ? 'west' : 'east'}.`);
  }

  /** Designate every tile in a rectangle on one z-level. Returns how many were accepted. */
  designateArea(type: JobType, a: Pos, b: Pos, arg = 0): number {
    let n = 0;
    for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) {
      for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) {
        if (typeof this.jobs.designate(this, type, { x, y, z: a.z }, 1, arg) !== 'string') n++;
      }
    }
    return n;
  }

  cancelArea(a: Pos, b: Pos): number {
    let n = 0;
    for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) {
      for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) if (this.jobs.cancelAt(this, { x, y, z: a.z })) n++;
    }
    return n;
  }

  /** Is the surface at this tile frozen over? (rendering + walking on ice) */
  isIce(x: number, y: number): boolean {
    const i = this.world.idx(x, y, 0);
    return this.climate.isFreezing && this.world.water[i] > 0 && (this.world.flags[i] & Flag.SOURCE) !== 0;
  }
}
