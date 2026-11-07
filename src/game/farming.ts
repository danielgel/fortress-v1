import { JobType } from '../jobs/job';
import type { PlantType } from '../world/climate';
import { Material } from '../world/types';
import type { World } from '../world/world';
import { Building, type Cost } from './content';
import type { GameEngine } from './engine';

export interface Crop extends PlantType {
  /** Days of growing weather from planting to harvest. */
  growDays: number;
  yield: Cost;
}

/**
 * Surface fields only grow while the weather allows. Growth is checked at midnight,
 * about 2° below the daily mean, so this means roughly 6° by day.
 */
export const SURFACE_CROP: Crop = { name: 'turnips', minTemperature: 4, maxTemperature: 36, minRainfall: 0.15, growDays: 6, yield: { food: 3, plants: 1 } };
/** Cave plots need no sun and grow all year, a little slower. */
export const CAVE_CROP: Crop = { name: 'cave mushrooms', minTemperature: -100, maxTemperature: 100, minRainfall: 0, growDays: 8, yield: { food: 2, plants: 1 } };

export const cropFor = (z: number): Crop => (z === 0 ? SURFACE_CROP : CAVE_CROP);

/** Can a farm plot go on this tile's ground? */
export function farmable(w: World, i: number): boolean {
  const m = w.material[i];
  return m === Material.GRASS || m === Material.SOIL || m === Material.MUD;
}

export function isRipe(w: World, i: number): boolean {
  return w.building[i] === Building.FARM && w.crop[i] >= cropFor(w.pos(i).z).growDays;
}

/** Why a plot is not growing today (null when it is). */
export function stalled(ctx: GameEngine, i: number): string | null {
  const w = ctx.world;
  if (w.water[i] || w.magma[i]) return 'flooded';
  const c = ctx.climate;
  if (w.pos(i).z > 0 || c.canSupport(SURFACE_CROP)) return null;
  if (c.rainfallAmount < SURFACE_CROP.minRainfall) return 'too dry';
  return c.currentTemperature > SURFACE_CROP.maxTemperature ? 'too hot' : 'too cold';
}

/** Once a day: every plot grows a day, and ripe ones get a harvest job. */
export function growCrops(ctx: GameEngine): void {
  const w = ctx.world;
  for (const i of w.buildingTiles) {
    if (w.building[i] !== Building.FARM) continue;
    if (w.crop[i] < cropFor(w.pos(i).z).growDays && !stalled(ctx, i)) w.crop[i]++;
    const p = w.pos(i);
    if (isRipe(w, i) && !ctx.jobs.designationAt(p.x, p.y, p.z, ctx)) ctx.jobs.designate(ctx, JobType.HARVEST, p);
  }
}
