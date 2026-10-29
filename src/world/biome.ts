import { Material } from './types';

export enum BiomeType {
  PLAINS,
  FOREST,
  TAIGA,
  TUNDRA,
  DESERT,
  SAVANNA,
  JUNGLE,
  SWAMP,
  MOUNTAIN,
  GLACIER,
}

export interface BiomeInfo {
  name: string;
  temperature: number; // mean °C
  rainfall: number; // 0..1
  ground: Material;
  treeDensity: number;
  shrubDensity: number;
  color: string; // ground tint used by the renderer
}

export const BIOMES: Record<BiomeType, BiomeInfo> = {
  [BiomeType.PLAINS]: { name: 'Plains', temperature: 14, rainfall: 0.4, ground: Material.GRASS, treeDensity: 0.01, shrubDensity: 0.04, color: '#2f5d2a' },
  [BiomeType.FOREST]: { name: 'Forest', temperature: 11, rainfall: 0.6, ground: Material.GRASS, treeDensity: 0.22, shrubDensity: 0.05, color: '#1f4a24' },
  [BiomeType.TAIGA]: { name: 'Taiga', temperature: 1, rainfall: 0.5, ground: Material.SOIL, treeDensity: 0.14, shrubDensity: 0.03, color: '#2a4a3a' },
  [BiomeType.TUNDRA]: { name: 'Tundra', temperature: -7, rainfall: 0.25, ground: Material.SNOW, treeDensity: 0.01, shrubDensity: 0.02, color: '#aab4bd' },
  [BiomeType.DESERT]: { name: 'Desert', temperature: 30, rainfall: 0.05, ground: Material.SAND, treeDensity: 0, shrubDensity: 0.01, color: '#b5994f' },
  [BiomeType.SAVANNA]: { name: 'Savanna', temperature: 26, rainfall: 0.3, ground: Material.GRASS, treeDensity: 0.03, shrubDensity: 0.05, color: '#7a7a33' },
  [BiomeType.JUNGLE]: { name: 'Jungle', temperature: 27, rainfall: 0.9, ground: Material.GRASS, treeDensity: 0.3, shrubDensity: 0.08, color: '#16511f' },
  [BiomeType.SWAMP]: { name: 'Swamp', temperature: 18, rainfall: 0.85, ground: Material.MUD, treeDensity: 0.08, shrubDensity: 0.06, color: '#3b4a2c' },
  [BiomeType.MOUNTAIN]: { name: 'Mountain', temperature: 3, rainfall: 0.35, ground: Material.STONE, treeDensity: 0.02, shrubDensity: 0.01, color: '#6d6d72' },
  [BiomeType.GLACIER]: { name: 'Glacier', temperature: -18, rainfall: 0.2, ground: Material.SNOW, treeDensity: 0, shrubDensity: 0, color: '#d8e6f0' },
};

/** Whittaker-style classification from noise-derived climate values. */
export function classifyBiome(elevation: number, temperature: number, moisture: number): BiomeType {
  if (elevation > 0.72) return temperature < 0.3 ? BiomeType.GLACIER : BiomeType.MOUNTAIN;
  if (temperature < 0.22) return BiomeType.TUNDRA;
  if (temperature < 0.38) return moisture > 0.4 ? BiomeType.TAIGA : BiomeType.TUNDRA;
  if (temperature > 0.7) {
    if (moisture < 0.3) return BiomeType.DESERT;
    return moisture > 0.62 ? BiomeType.JUNGLE : BiomeType.SAVANNA;
  }
  if (moisture > 0.68 && elevation < 0.42) return BiomeType.SWAMP;
  return moisture > 0.5 ? BiomeType.FOREST : BiomeType.PLAINS;
}
