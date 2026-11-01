import type { Entity } from '../entities/entity';
import type { ToolKind } from '../game/content';
import type { GameEngine } from '../game/engine';
import type { Pos } from '../world/types';
import { buildSteps } from './recipes';

export enum JobType {
  TELEPORT,
  GOTO,
  DIG,
  STAIRS,
  CHOP,
  GATHER,
  BUILD,
  DRINK,
  EAT,
  SLEEP,
  WANDER,
  FISH,
  HUNT,
  CRAFT,
  REMOVE,
}

export const JOB_LABELS: Record<JobType, string> = {
  [JobType.TELEPORT]: 'teleport',
  [JobType.GOTO]: 'walk',
  [JobType.DIG]: 'dig',
  [JobType.STAIRS]: 'dig stairs',
  [JobType.CHOP]: 'chop tree',
  [JobType.GATHER]: 'gather',
  [JobType.BUILD]: 'build',
  [JobType.DRINK]: 'drink',
  [JobType.EAT]: 'eat',
  [JobType.SLEEP]: 'sleep',
  [JobType.WANDER]: 'wander',
  [JobType.FISH]: 'fish',
  [JobType.HUNT]: 'hunt',
  [JobType.CRAFT]: 'craft',
  [JobType.REMOVE]: 'remove building',
};

/** The tool a dwarf must carry to do this kind of work. */
export const JOB_TOOL: Partial<Record<JobType, ToolKind>> = {
  [JobType.DIG]: 'pick',
  [JobType.STAIRS]: 'pick',
  [JobType.CHOP]: 'axe',
  [JobType.FISH]: 'rod',
  [JobType.HUNT]: 'spear',
};

export enum JobStatus {
  NOT_STARTED,
  IN_PROGRESS,
  COMPLETED,
  FAILED,
}

export interface JobStep {
  update(ctx: GameEngine, job: Job, worker: Entity): JobStatus;
}

/** A task a dwarf can perform, made of sequential steps. */
export class Job {
  status = JobStatus.NOT_STARTED;
  worker: Entity | null = null;
  steps: JobStep[] = [];
  stepIndex = 0;
  attempts = 0;
  retryAt = 0;

  constructor(
    readonly id: number,
    readonly type: JobType,
    readonly pos: Pos,
    public priority = 1,
    /** Personal jobs (eating, sleeping...) never enter the shared queue. */
    readonly personal = false,
    /** Job-specific detail: building to place, recipe index, hunted entity id, booze... */
    readonly arg = 0,
  ) {
    this.reset();
  }

  reset(): void {
    this.steps = buildSteps(this);
    this.stepIndex = 0;
    this.status = JobStatus.NOT_STARTED;
    this.worker = null;
  }

  start(worker: Entity): void {
    this.worker = worker;
    this.status = JobStatus.IN_PROGRESS;
  }

  update(ctx: GameEngine, worker: Entity): JobStatus {
    if (this.status !== JobStatus.IN_PROGRESS) return this.status;
    const result = this.steps[this.stepIndex].update(ctx, this, worker);
    if (result === JobStatus.FAILED) this.status = JobStatus.FAILED;
    else if (result === JobStatus.COMPLETED && ++this.stepIndex >= this.steps.length) this.status = JobStatus.COMPLETED;
    return this.status;
  }
}
