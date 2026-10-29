import { findPath, type PathfindingConstraints, DEFAULT_CONSTRAINTS } from '../nav/astar';
import { Flag, type Pos } from '../world/types';
import type { Entity } from './entity';
import type { GameEngine } from '../game/engine';

export interface Component {
  update(ctx: GameEngine, owner: Entity): void;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export class PhysicalComponent implements Component {
  health: number;
  constructor(
    public strength = 10,
    public agility = 10,
    public endurance = 10,
    public maxHealth = 100,
  ) {
    this.health = maxHealth;
  }
  update(_ctx: GameEngine, _owner: Entity): void {
    if (this.health < this.maxHealth) this.health = Math.min(this.maxHealth, this.health + 0.01 * (this.endurance / 10));
  }
}

export class MentalComponent implements Component {
  constructor(
    public happiness = 60,
    public stress = 0,
  ) {}
  update(_ctx: GameEngine, owner: Entity): void {
    const n = owner.needs;
    if (!n) return;
    // unmet needs sour the mood; satisfied dwarves slowly recover
    const misery = Math.max(0, n.hunger - 60) + Math.max(0, n.thirst - 60) + Math.max(0, n.fatigue - 70);
    this.happiness = clamp(this.happiness + (misery > 0 ? -misery / 4000 : 0.01) );
    this.stress = clamp(this.stress + (misery > 0 ? misery / 6000 : -0.01));
  }
}

export type SkillType = 'mining' | 'woodcutting' | 'foraging' | 'construction';
export const SKILL_TYPES: SkillType[] = ['mining', 'woodcutting', 'foraging', 'construction'];

export class SkillComponent implements Component {
  xp: Record<SkillType, number> = { mining: 0, woodcutting: 0, foraging: 0, construction: 0 };
  level(skill: SkillType): number {
    return Math.floor(Math.sqrt(this.xp[skill] / 10));
  }
  gain(skill: SkillType, amount: number): void {
    this.xp[skill] += amount;
  }
  update(): void {}
}

export class NeedsComponent implements Component {
  constructor(
    public hunger = 10,
    public thirst = 10,
    public fatigue = 10,
  ) {}
  update(ctx: GameEngine, owner: Entity): void {
    this.hunger = clamp(this.hunger + 0.035);
    this.thirst = clamp(this.thirst + 0.05);
    this.fatigue = clamp(this.fatigue + (ctx.calendar.isNight ? 0.08 : 0.04));
    const p = owner.physical;
    if (p) {
      if (this.hunger >= 100) p.health -= 0.05;
      if (this.thirst >= 100) p.health -= 0.1;
    }
  }
}

export type MoveResult = 'idle' | 'moving' | 'arrived' | 'blocked';

/** Walks an entity along a precomputed path, one tile at a time. */
export class MovementComponent implements Component {
  path: Pos[] = [];
  private cooldown = 0;
  constraints: PathfindingConstraints = DEFAULT_CONSTRAINTS;

  constructor(public speedTicks = 4) {}

  get isMoving(): boolean {
    return this.path.length > 0;
  }

  setPath(path: Pos[] | null): boolean {
    this.path = path ? [...path] : [];
    this.cooldown = 0;
    return path !== null;
  }

  clear(): void {
    this.path = [];
  }

  moveTo(ctx: GameEngine, owner: Entity, isGoal: (x: number, y: number, z: number) => boolean, hint: Pos | null): boolean {
    return this.setPath(findPath(ctx.world, owner.pos, isGoal, hint, { constraints: this.constraints }));
  }

  /** Advance along the path; call once per tick. */
  step(ctx: GameEngine, owner: Entity): MoveResult {
    if (this.path.length === 0) return 'idle';
    if (this.cooldown > 0) {
      this.cooldown--;
      return 'moving';
    }
    const next = this.path[0];
    if (!ctx.world.walkable(next.x, next.y, next.z)) {
      this.path = [];
      return 'blocked';
    }
    const diag = next.x !== owner.pos.x && next.y !== owner.pos.y;
    const cost = ctx.world.moveCost(next.x, next.y, next.z);
    owner.pos = { ...next };
    this.path.shift();
    this.cooldown = Math.round(this.speedTicks * (diag ? 1.4 : 1) * cost) - 1;
    if (next.z > 0 && ctx.world.flags[ctx.world.idx(next.x, next.y, next.z)] & Flag.OPEN) {
      ctx.world.discoverAround(next.x, next.y, next.z);
    }
    return this.path.length === 0 ? 'arrived' : 'moving';
  }

  update(): void {}
}
