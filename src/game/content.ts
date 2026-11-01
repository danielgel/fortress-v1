import type { SkillType } from '../entities/components';

/** Everything the fortress can hold in its (abstract) stockpile. */
export type Resource =
  | 'wood'
  | 'stone'
  | 'ore'
  | 'metal'
  | 'gems'
  | 'food'
  | 'plants'
  | 'meals'
  | 'booze'
  | 'pick'
  | 'axe'
  | 'rod'
  | 'spear'
  | 'bed'
  | 'table'
  | 'chair'
  | 'door'
  | 'statue';

export type Stock = Record<Resource, number>;
export type Cost = Partial<Record<Resource, number>>;

export const RESOURCE_GROUPS: { title: string; items: { key: Resource; label: string }[] }[] = [
  {
    title: 'Materials',
    items: [
      { key: 'wood', label: 'Wood' },
      { key: 'stone', label: 'Stone' },
      { key: 'ore', label: 'Ore' },
      { key: 'metal', label: 'Metal' },
      { key: 'gems', label: 'Gems' },
    ],
  },
  {
    title: 'Provisions',
    items: [
      { key: 'food', label: 'Food' },
      { key: 'meals', label: 'Meals' },
      { key: 'plants', label: 'Plants' },
      { key: 'booze', label: 'Booze' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { key: 'pick', label: 'Picks' },
      { key: 'axe', label: 'Axes' },
      { key: 'rod', label: 'Rods' },
      { key: 'spear', label: 'Spears' },
    ],
  },
  {
    title: 'Furniture',
    items: [
      { key: 'bed', label: 'Beds' },
      { key: 'table', label: 'Tables' },
      { key: 'chair', label: 'Chairs' },
      { key: 'door', label: 'Doors' },
      { key: 'statue', label: 'Statues' },
    ],
  },
];

export const RESOURCE_LABEL = Object.fromEntries(RESOURCE_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label.toLowerCase()]))) as Record<
  Resource,
  string
>;

export function defaultStock(): Stock {
  return {
    wood: 6,
    stone: 0,
    ore: 0,
    metal: 0,
    gems: 0,
    food: 30,
    plants: 4,
    meals: 0,
    booze: 10,
    pick: 3,
    axe: 2,
    rod: 1,
    spear: 1,
    bed: 0,
    table: 0,
    chair: 0,
    door: 0,
    statue: 0,
  };
}

export function canAfford(stock: Stock, cost: Cost, reserved: Cost = {}): boolean {
  for (const k in cost) {
    const r = k as Resource;
    if (stock[r] - (reserved[r] ?? 0) < cost[r]!) return false;
  }
  return true;
}

export function pay(stock: Stock, cost: Cost): void {
  for (const k in cost) stock[k as Resource] -= cost[k as Resource]!;
}

export function give(stock: Stock, gain: Cost): void {
  for (const k in gain) stock[k as Resource] += gain[k as Resource]!;
}

export function describeCost(cost: Cost): string {
  const parts = Object.entries(cost).map(([k, n]) => {
    const label = RESOURCE_LABEL[k as Resource];
    return `${n} ${n === 1 && label.endsWith('s') ? label.slice(0, -1) : label}`;
  });
  return parts.length ? parts.join(' + ') : 'free';
}

/** Tools a dwarf carries. A job that needs one can only be taken by a dwarf holding it (or one in stock). */
export type ToolKind = 'pick' | 'axe' | 'rod' | 'spear';

/** Things placed on a floor tile. Stored per tile in World.building. */
export enum Building {
  NONE,
  BED,
  TABLE,
  CHAIR,
  DOOR,
  STATUE,
  CARPENTER,
  MASON,
  SMELTER,
  FORGE,
  KITCHEN,
  BREWERY,
}

/** BUILD jobs carry a Building in `arg`; NONE means "raise a wall". */
export const WALL = Building.NONE;

export interface BuildingInfo {
  name: string;
  glyph: string;
  fg: string;
  bg?: string;
  cost: Cost;
  workshop: boolean;
  walkable: boolean;
  desc: string;
}

export const BUILDINGS: Record<Building, BuildingInfo> = {
  [Building.NONE]: { name: 'Wall', glyph: '#', fg: '#9a9aa6', cost: { stone: 1 }, workshop: false, walkable: false, desc: 'Solid stone wall' },
  [Building.BED]: { name: 'Bed', glyph: 'Θ', fg: '#d79a5a', cost: { bed: 1 }, workshop: false, walkable: true, desc: 'Dwarves sleep better and happier in a bed' },
  [Building.TABLE]: { name: 'Table', glyph: '╤', fg: '#d7b07a', cost: { table: 1 }, workshop: false, walkable: true, desc: 'Eating at a table lifts the mood' },
  [Building.CHAIR]: { name: 'Chair', glyph: '╥', fg: '#c09060', cost: { chair: 1 }, workshop: false, walkable: true, desc: 'A chair next to a table makes meals even nicer' },
  [Building.DOOR]: { name: 'Door', glyph: '+', fg: '#e0b050', cost: { door: 1 }, workshop: false, walkable: true, desc: 'Dwarves pass, goblins cannot' },
  [Building.STATUE]: { name: 'Statue', glyph: 'Ω', fg: '#d8d8f0', cost: { statue: 1 }, workshop: false, walkable: false, desc: 'Dwarves nearby admire it' },
  [Building.CARPENTER]: { name: 'Carpenter', glyph: 'C', fg: '#ffcf8a', bg: '#4a3418', cost: { wood: 3 }, workshop: true, walkable: true, desc: 'Wood → beds, tables, chairs, doors, rods' },
  [Building.MASON]: { name: 'Mason', glyph: 'M', fg: '#e6e6f0', bg: '#3a3a48', cost: { stone: 3 }, workshop: true, walkable: true, desc: 'Stone → tables, chairs, doors, statues' },
  [Building.SMELTER]: { name: 'Smelter', glyph: 'S', fg: '#ffb070', bg: '#4a2414', cost: { stone: 4 }, workshop: true, walkable: true, desc: 'Ore + wood → metal' },
  [Building.FORGE]: { name: 'Forge', glyph: 'F', fg: '#ff9a5a', bg: '#40201a', cost: { stone: 4, metal: 1 }, workshop: true, walkable: true, desc: 'Metal → picks, axes, spears' },
  [Building.KITCHEN]: { name: 'Kitchen', glyph: 'K', fg: '#ffe08a', bg: '#3c3418', cost: { wood: 2, stone: 2 }, workshop: true, walkable: true, desc: 'Raw food → meals' },
  [Building.BREWERY]: { name: 'Brewery', glyph: 'B', fg: '#c8f08a', bg: '#2a3a18', cost: { wood: 3 }, workshop: true, walkable: true, desc: 'Plants → booze' },
};

/** Order of the build menu. */
export const BUILD_MENU: Building[] = [
  WALL,
  Building.DOOR,
  Building.BED,
  Building.TABLE,
  Building.CHAIR,
  Building.STATUE,
  Building.CARPENTER,
  Building.MASON,
  Building.SMELTER,
  Building.FORGE,
  Building.KITCHEN,
  Building.BREWERY,
];

export interface Recipe {
  id: string;
  name: string;
  workshop: Building;
  input: Cost;
  output: Cost;
  ticks: number;
  skill: SkillType;
  /** In "keep stocked" mode, produce until the output stock reaches this. */
  keep: number;
}

export const RECIPES: Recipe[] = [
  { id: 'wood-bed', name: 'Bed', workshop: Building.CARPENTER, input: { wood: 2 }, output: { bed: 1 }, ticks: 60, skill: 'crafting', keep: 2 },
  { id: 'wood-table', name: 'Table', workshop: Building.CARPENTER, input: { wood: 1 }, output: { table: 1 }, ticks: 45, skill: 'crafting', keep: 2 },
  { id: 'wood-chair', name: 'Chair', workshop: Building.CARPENTER, input: { wood: 1 }, output: { chair: 1 }, ticks: 40, skill: 'crafting', keep: 2 },
  { id: 'wood-door', name: 'Door', workshop: Building.CARPENTER, input: { wood: 1 }, output: { door: 1 }, ticks: 40, skill: 'crafting', keep: 1 },
  { id: 'rod', name: 'Fishing rod', workshop: Building.CARPENTER, input: { wood: 1 }, output: { rod: 1 }, ticks: 30, skill: 'crafting', keep: 1 },
  { id: 'stone-table', name: 'Table', workshop: Building.MASON, input: { stone: 2 }, output: { table: 1 }, ticks: 50, skill: 'crafting', keep: 2 },
  { id: 'stone-chair', name: 'Chair', workshop: Building.MASON, input: { stone: 2 }, output: { chair: 1 }, ticks: 45, skill: 'crafting', keep: 2 },
  { id: 'stone-door', name: 'Door', workshop: Building.MASON, input: { stone: 2 }, output: { door: 1 }, ticks: 45, skill: 'crafting', keep: 1 },
  { id: 'statue', name: 'Statue', workshop: Building.MASON, input: { stone: 4 }, output: { statue: 1 }, ticks: 120, skill: 'crafting', keep: 1 },
  { id: 'metal', name: 'Metal', workshop: Building.SMELTER, input: { ore: 1, wood: 1 }, output: { metal: 1 }, ticks: 80, skill: 'crafting', keep: 4 },
  { id: 'pick', name: 'Pick', workshop: Building.FORGE, input: { metal: 1 }, output: { pick: 1 }, ticks: 80, skill: 'crafting', keep: 1 },
  { id: 'axe', name: 'Axe', workshop: Building.FORGE, input: { metal: 1 }, output: { axe: 1 }, ticks: 80, skill: 'crafting', keep: 1 },
  { id: 'spear', name: 'Spear', workshop: Building.FORGE, input: { metal: 1 }, output: { spear: 1 }, ticks: 80, skill: 'crafting', keep: 1 },
  { id: 'meal', name: 'Meals', workshop: Building.KITCHEN, input: { food: 2 }, output: { meals: 3 }, ticks: 40, skill: 'cooking', keep: 15 },
  { id: 'booze', name: 'Booze', workshop: Building.BREWERY, input: { plants: 2 }, output: { booze: 4 }, ticks: 50, skill: 'cooking', keep: 15 },
];

export const RECIPE_BY_ID = new Map(RECIPES.map((r, i) => [r.id, i]));

export const ANIMAL_SPECIES = ['deer', 'boar', 'rabbit', 'goat', 'elk'];
