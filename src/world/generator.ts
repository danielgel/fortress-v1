import { Rng } from '../core/rng';
import { fbm, layerNoise } from '../core/noise';
import { BIOMES, BiomeType, classifyBiome } from './biome';
import { Feature, Flag, Material, MAX_FLUID } from './types';
import { World } from './world';

export interface WorldGenerationParameters {
  width: number;
  height: number;
  depth: number;
  seed: number;
}

export function defaultParameters(): WorldGenerationParameters {
  return { width: 100, height: 100, depth: 10, seed: Date.now() % 2147483647 };
}

export function generateWorld(p: WorldGenerationParameters): World {
  const world = new World(p.width, p.height, p.depth);
  const rng = new Rng(p.seed);
  generateSurface(world, p.seed, rng);
  generateUnderground(world, p.seed, rng);
  return world;
}

function generateSurface(world: World, seed: number, rng: Rng): void {
  const { width, height } = world;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const elevation = fbm(x / 28, y / 28, seed + 1);
      const temperature = fbm(x / 60, y / 60, seed + 2, 3);
      const moisture = fbm(x / 35, y / 35, seed + 3);
      const biome = classifyBiome(elevation, temperature, moisture);
      const info = BIOMES[biome];
      const i = world.idx(x, y, 0);
      world.biome[y * width + x] = biome;
      world.flags[i] = Flag.OPEN | Flag.DISCOVERED;
      world.material[i] = info.ground;

      const lowland = elevation < 0.3 && biome !== BiomeType.DESERT && biome !== BiomeType.GLACIER;
      if (lowland) {
        world.water[i] = MAX_FLUID;
        world.flags[i] |= Flag.SOURCE;
      } else if (rng.chance(info.treeDensity)) {
        world.feature[i] = Feature.TREE;
      } else if (rng.chance(info.shrubDensity)) {
        world.feature[i] = Feature.SHRUB;
      }
    }
  }
}

function generateUnderground(world: World, seed: number, rng: Rng): void {
  const { width, height, depth } = world;
  const magmaStart = Math.floor(depth * 0.7);
  for (let z = 1; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = world.idx(x, y, z);
        world.material[i] = z === 1 && rng.chance(0.6) ? Material.SOIL : Material.STONE;

        // natural caverns
        const cave = layerNoise(x / 9, y / 9, z, seed + 7);
        if (z >= 3 && cave > 0.7) {
          world.flags[i] = Flag.OPEN;
          if (z >= magmaStart) {
            if (cave > 0.76) world.magma[i] = MAX_FLUID;
          } else if (cave > 0.77) {
            world.water[i] = MAX_FLUID; // flooded cavern pocket
          }
          continue;
        }
        // mineral veins
        const r = rng.next();
        if (r < 0.025) world.feature[i] = Feature.ORE;
        else if (r < 0.03 && z >= 3) world.feature[i] = Feature.GEM;
      }
    }
  }
}

/** Find a good walkable surface tile near the middle for the starting party. */
export function findEmbarkSite(world: World): { x: number; y: number } {
  const cx = Math.floor(world.width / 2);
  const cy = Math.floor(world.height / 2);
  for (let r = 0; r < Math.max(world.width, world.height); r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (open3x3(world, x, y)) return { x, y };
      }
    }
  }
  return { x: cx, y: cy };
}

function open3x3(world: World, x: number, y: number): boolean {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!world.walkable(x + dx, y + dy, 0)) return false;
  return true;
}

/** Clear a small meadow around the embark site so the start is never boxed in. */
export function clearEmbark(world: World, x: number, y: number): void {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      if (!world.inBounds(x + dx, y + dy, 0)) continue;
      const i = world.idx(x + dx, y + dy, 0);
      if (world.feature[i] === Feature.TREE) world.feature[i] = Feature.NONE;
    }
  }
}
