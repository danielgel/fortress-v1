import type { Entity } from '../entities/entity';
import type { SkillType } from '../entities/components';
import type { GameEngine } from '../game/engine';
import { findPathAdjacent } from '../nav/astar';
import type { Pos } from '../world/types';
import { JobStatus, type Job, type JobStep } from './job';

type GoalFactory = (ctx: GameEngine) => (x: number, y: number, z: number) => boolean;

/** Walk until the goal predicate is satisfied, replanning if the route gets blocked. */
export class GotoStep implements JobStep {
  private planned = false;
  private replans = 0;

  constructor(
    private goal: GoalFactory,
    private hint: Pos | null,
    /** If the walk fails, carry on with the next step anyway (e.g. eat without a table). */
    private optional = false,
  ) {}

  update(ctx: GameEngine, _job: Job, w: Entity): JobStatus {
    const move = w.movement!;
    const isGoal = this.goal(ctx);
    if (!this.planned) {
      if (isGoal(w.pos.x, w.pos.y, w.pos.z)) return JobStatus.COMPLETED;
      if (!move.moveTo(ctx, w, isGoal, this.hint)) return this.optional ? JobStatus.COMPLETED : JobStatus.FAILED;
      this.planned = true;
    }
    const r = move.step(ctx, w);
    if (r === 'arrived') return JobStatus.COMPLETED;
    if (r === 'blocked' || r === 'idle') {
      if (isGoal(w.pos.x, w.pos.y, w.pos.z)) return JobStatus.COMPLETED;
      if (++this.replans > 3) return this.optional ? JobStatus.COMPLETED : JobStatus.FAILED;
      this.planned = false;
    }
    return JobStatus.IN_PROGRESS;
  }
}

export interface WorkOptions {
  ticks: number;
  skill?: SkillType;
  /** Return false if the work is no longer possible when it would start/finish. */
  valid?: (ctx: GameEngine, job: Job) => boolean;
  onTick?: (ctx: GameEngine, worker: Entity) => void;
  effect: (ctx: GameEngine, job: Job, worker: Entity) => void;
}

/** Stand still and work for a duration shortened by skill. */
export class WorkStep implements JobStep {
  private progress = 0;
  private total = 0;

  constructor(private o: WorkOptions) {}

  update(ctx: GameEngine, job: Job, w: Entity): JobStatus {
    if (this.total === 0) {
      if (this.o.valid && !this.o.valid(ctx, job)) return JobStatus.FAILED;
      const level = this.o.skill ? (w.skills?.level(this.o.skill) ?? 0) : 0;
      this.total = Math.max(1, Math.ceil((this.o.ticks / (1 + 0.2 * level)) * (w.mental?.workFactor ?? 1)));
    }
    this.o.onTick?.(ctx, w);
    if (++this.progress < this.total) return JobStatus.IN_PROGRESS;
    if (this.o.valid && !this.o.valid(ctx, job)) return JobStatus.FAILED;
    this.o.effect(ctx, job, w);
    if (this.o.skill) w.skills?.gain(this.o.skill, 5);
    return JobStatus.COMPLETED;
  }
}

export class TeleportStep implements JobStep {
  update(_ctx: GameEngine, job: Job, w: Entity): JobStatus {
    w.pos = { ...job.pos };
    w.movement?.clear();
    return JobStatus.COMPLETED;
  }
}

/** Chase an animal (job.arg = its id) and spear it. */
export class HuntStep implements JobStep {
  private cooldown = 0;
  private repath = 0;
  private fails = 0;

  update(ctx: GameEngine, job: Job, w: Entity): JobStatus {
    const prey = ctx.entities.all.get(job.arg);
    if (!prey?.alive) return JobStatus.COMPLETED; // someone else got it
    const move = w.movement!;
    const adjacent = prey.pos.z === w.pos.z && Math.abs(prey.pos.x - w.pos.x) <= 1 && Math.abs(prey.pos.y - w.pos.y) <= 1;
    if (adjacent) {
      move.clear();
      if (this.cooldown-- > 0) return JobStatus.IN_PROGRESS;
      this.cooldown = 6;
      const level = w.skills?.level('hunting') ?? 0;
      prey.physical!.health -= 6 + (w.physical?.strength ?? 10) * 0.4 + level * 2 + ctx.rng.next() * 4;
      if (prey.physical!.health <= 0) {
        ctx.kill(prey, w);
        ctx.stock.food += 5;
        w.skills?.gain('hunting', 5);
        ctx.log('JOB_COMPLETED', `${w.name} hunted a ${prey.name}.`);
        return JobStatus.COMPLETED;
      }
      return JobStatus.IN_PROGRESS;
    }
    if (!move.isMoving || this.repath-- <= 0) {
      this.repath = 20;
      const path = findPathAdjacent(ctx.world, w.pos, prey.pos, { maxNodes: 5000 });
      if (!path && ++this.fails > 3) return JobStatus.FAILED;
      move.setPath(path);
    }
    move.step(ctx, w);
    return JobStatus.IN_PROGRESS;
  }
}
