import { BUILDINGS, Building } from '../game/content';
import { Feature, Flag, Material, type Pos } from './types';

/** The whole world as flat typed arrays. z=0 is the surface, higher z is deeper. */
export class World {
  readonly size: number;
  readonly material: Uint8Array;
  readonly flags: Uint8Array;
  readonly feature: Uint8Array;
  readonly water: Uint8Array;
  readonly magma: Uint8Array;
  /** Furniture / workshop on each tile (see Building). */
  readonly building: Uint8Array;
  /** Indices of every tile that holds a building, for quick lookups. */
  readonly buildingTiles = new Set<number>();
  /** Surface biome per (x,y) column. */
  readonly biome: Uint8Array;
  currentZ = 0;
  /** Called when a tile becomes open so fluids can react. */
  onOpened: ((idx: number) => void) | null = null;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly depth: number,
  ) {
    this.size = width * height * depth;
    this.material = new Uint8Array(this.size);
    this.flags = new Uint8Array(this.size);
    this.feature = new Uint8Array(this.size);
    this.water = new Uint8Array(this.size);
    this.magma = new Uint8Array(this.size);
    this.building = new Uint8Array(this.size);
    this.biome = new Uint8Array(width * height);
  }

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height && z >= 0 && z < this.depth;
  }

  idx(x: number, y: number, z: number): number {
    return (z * this.height + y) * this.width + x;
  }

  pos(idx: number): Pos {
    const x = idx % this.width;
    const y = Math.floor(idx / this.width) % this.height;
    return { x, y, z: Math.floor(idx / (this.width * this.height)) };
  }

  has(x: number, y: number, z: number, flag: number): boolean {
    return this.inBounds(x, y, z) && (this.flags[this.idx(x, y, z)] & flag) !== 0;
  }

  isOpen(x: number, y: number, z: number): boolean {
    return this.has(x, y, z, Flag.OPEN);
  }

  featureAt(x: number, y: number, z: number): Feature {
    return this.inBounds(x, y, z) ? this.feature[this.idx(x, y, z)] : Feature.NONE;
  }

  materialAt(x: number, y: number, z: number): Material {
    return this.material[this.idx(x, y, z)];
  }

  /** Can a ground-bound walker stand here? */
  walkable(x: number, y: number, z: number): boolean {
    if (!this.inBounds(x, y, z)) return false;
    const i = this.idx(x, y, z);
    if (!(this.flags[i] & Flag.OPEN)) return false;
    if (this.feature[i] === Feature.TREE) return false;
    if (this.building[i] && !BUILDINGS[this.building[i] as Building].walkable) return false;
    return this.magma[i] === 0 && this.water[i] <= 3;
  }

  moveCost(x: number, y: number, z: number): number {
    return 1 + this.water[this.idx(x, y, z)] * 0.5;
  }

  /** Mark tile and neighbours as seen (fog of war). */
  discoverAround(x: number, y: number, z: number): void {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (this.inBounds(x + dx, y + dy, z)) this.flags[this.idx(x + dx, y + dy, z)] |= Flag.DISCOVERED;
      }
    }
  }

  /** Turn a solid tile into an open floor. Returns the feature that was inside it. */
  excavate(x: number, y: number, z: number): Feature {
    const i = this.idx(x, y, z);
    const found = this.feature[i] as Feature;
    this.feature[i] = Feature.NONE;
    this.flags[i] |= Flag.OPEN;
    this.discoverAround(x, y, z);
    this.onOpened?.(i);
    return found;
  }

  /** Turn an open tile back into solid wall. */
  fill(x: number, y: number, z: number, material = Material.STONE): void {
    const i = this.idx(x, y, z);
    this.flags[i] &= ~(Flag.OPEN | Flag.STAIRS_UP | Flag.STAIRS_DOWN | Flag.DOOR);
    this.material[i] = material;
    this.feature[i] = Feature.NONE;
    this.setBuilding(x, y, z, Building.NONE);
  }

  buildingAt(x: number, y: number, z: number): Building {
    return this.inBounds(x, y, z) ? this.building[this.idx(x, y, z)] : Building.NONE;
  }

  setBuilding(x: number, y: number, z: number, b: Building): void {
    const i = this.idx(x, y, z);
    this.building[i] = b;
    if (b === Building.NONE) this.buildingTiles.delete(i);
    else this.buildingTiles.add(i);
    if (b === Building.DOOR) this.flags[i] |= Flag.DOOR;
    else this.flags[i] &= ~Flag.DOOR;
  }

  /** Rebuild the building index from the raw array (after loading). */
  indexBuildings(): void {
    this.buildingTiles.clear();
    for (let i = 0; i < this.size; i++) if (this.building[i]) this.buildingTiles.add(i);
  }

  setStairsDown(x: number, y: number, z: number): void {
    if (z + 1 >= this.depth) return;
    this.excavate(x, y, z);
    this.flags[this.idx(x, y, z)] |= Flag.STAIRS_DOWN;
    this.excavate(x, y, z + 1);
    this.flags[this.idx(x, y, z + 1)] |= Flag.STAIRS_UP;
  }

  /** Is any 4-neighbour of (x,y,z) walkable on the same level? */
  neighbours4(x: number, y: number): [number, number][] {
    return [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
  }
}
