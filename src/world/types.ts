export interface Pos {
  x: number;
  y: number;
  z: number;
}

export enum Material {
  STONE,
  SOIL,
  SAND,
  GRASS,
  SNOW,
  MUD,
}

/** Bit flags stored per tile. */
export const Flag = {
  OPEN: 1, // excavated / floor you can stand on
  STAIRS_UP: 2, // leads to z-1
  STAIRS_DOWN: 4, // leads to z+1
  DOOR: 8,
  DISCOVERED: 16,
  SOURCE: 32, // infinite water source (surface lakes)
} as const;

export enum Feature {
  NONE,
  TREE,
  SHRUB,
  ORE,
  GEM,
  MUSHROOM,
}

export const MAX_FLUID = 7;
