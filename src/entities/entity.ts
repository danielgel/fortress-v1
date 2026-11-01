import { ANIMAL_SPECIES, type ToolKind } from '../game/content';
import type { GameEngine } from '../game/engine';
import { NO_DOORS } from '../nav/astar';
import type { Job } from '../jobs/job';
import type { Pos } from '../world/types';
import {
  MentalComponent,
  MovementComponent,
  NeedsComponent,
  PhysicalComponent,
  SkillComponent,
  type Component,
} from './components';

export enum EntityType {
  DWARF,
  ANIMAL,
  MONSTER,
}

/** A creature in the world. Behaviour comes from its components plus ai.ts. */
export class Entity {
  alive = true;
  job: Job | null = null;
  /** Ticks until the next idle wander / attack. */
  timer = 0;
  /** Tools this dwarf carries around. */
  tools: ToolKind[] = [];
  physical: PhysicalComponent | null = null;
  mental: MentalComponent | null = null;
  skills: SkillComponent | null = null;
  needs: NeedsComponent | null = null;
  movement: MovementComponent | null = null;

  constructor(
    readonly id: number,
    readonly type: EntityType,
    public name: string,
    public pos: Pos,
  ) {}

  private all(): Component[] {
    const parts: (Component | null)[] = [this.physical, this.mental, this.skills, this.needs, this.movement];
    return parts.filter((c): c is Component => c !== null);
  }

  update(ctx: GameEngine): void {
    for (const c of this.all()) c.update(ctx, this);
  }

  static dwarf(id: number, name: string, pos: Pos, rng: { int(n: number): number }): Entity {
    const e = new Entity(id, EntityType.DWARF, name, pos);
    e.physical = new PhysicalComponent(8 + rng.int(8), 8 + rng.int(8), 8 + rng.int(8));
    e.mental = new MentalComponent(55 + rng.int(20), rng.int(10));
    e.skills = new SkillComponent();
    e.needs = new NeedsComponent(rng.int(30), rng.int(30), rng.int(30));
    e.movement = new MovementComponent(4);
    return e;
  }

  static animal(id: number, pos: Pos, name = 'animal'): Entity {
    const e = new Entity(id, EntityType.ANIMAL, name, pos);
    e.physical = new PhysicalComponent(3, 12, 6, 20);
    e.movement = new MovementComponent(7);
    return e;
  }

  static monster(id: number, pos: Pos): Entity {
    const e = new Entity(id, EntityType.MONSTER, 'goblin', pos);
    e.physical = new PhysicalComponent(11, 9, 12, 45);
    e.movement = new MovementComponent(5);
    e.movement.constraints = NO_DOORS;
    return e;
  }
}

const SYLLABLES = ['Ur', 'Dor', 'Bar', 'Thor', 'Gim', 'Bal', 'Dwa', 'Nor', 'Ber', 'Kil', 'Fun', 'Mor', 'Oin', 'Zul', 'Dur', 'Tha'];
const ENDINGS = ['in', 'ak', 'ur', 'li', 'grim', 'din', 'bek', 'rik', 'dak', 'mund'];

export function animalName(rng: { int(n: number): number }): string {
  return ANIMAL_SPECIES[rng.int(ANIMAL_SPECIES.length)];
}

export function dwarfName(rng: { int(n: number): number }): string {
  return SYLLABLES[rng.int(SYLLABLES.length)] + ENDINGS[rng.int(ENDINGS.length)];
}
