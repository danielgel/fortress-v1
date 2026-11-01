import { EntityType, type Entity } from '../entities/entity';
import { findPathAdjacent } from '../nav/astar';
import type { GameEngine } from '../game/engine';
import type { Pos } from '../world/types';
import { JOB_LABELS, JOB_TOOL, Job, JobStatus, JobType } from './job';
import { checkJob, designationError, onJobCompleted } from './recipes';

/** The shared work queue: designations made by the player, claimed by idle dwarves. */
export class JobManager {
  /** All queued or assigned (non-personal) jobs. */
  readonly jobs = new Map<number, Job>();
  private byTile = new Map<number, Job>();
  private nextId = 1;

  newJob(type: JobType, pos: Pos, priority = 1, personal = false, arg = 0): Job {
    return new Job(this.nextId++, type, { ...pos }, priority, personal, arg);
  }

  /** Create a designation. Returns the job, or a reason string if rejected. */
  designate(ctx: GameEngine, type: JobType, pos: Pos, priority = 1, arg = 0): Job | string {
    if (type === JobType.HUNT) return this.designateHunt(ctx, pos);
    const err = designationError(ctx, type, pos, arg);
    if (err) return err;
    const key = ctx.world.idx(pos.x, pos.y, pos.z);
    const existing = this.byTile.get(key);
    // tearing down a workshop takes over from whatever it was making
    if (existing && type === JobType.REMOVE && existing.type === JobType.CRAFT) this.drop(ctx, existing);
    else if (existing) return 'already designated';
    const job = this.newJob(type, pos, priority, false, arg);
    this.jobs.set(job.id, job);
    this.byTile.set(key, job);
    return job;
  }

  /** Hunts follow an animal around, so they are keyed by the animal, not the tile. */
  private designateHunt(ctx: GameEngine, pos: Pos): Job | string {
    const prey = ctx.entities.at(pos.x, pos.y, pos.z).find((e) => e.type === EntityType.ANIMAL);
    if (!prey) return 'no animal there';
    if (this.huntFor(prey.id)) return 'already hunted';
    const job = this.newJob(JobType.HUNT, prey.pos, 1, false, prey.id);
    this.jobs.set(job.id, job);
    return job;
  }

  huntFor(entityId: number): Job | undefined {
    for (const j of this.jobs.values()) if (j.type === JobType.HUNT && j.arg === entityId) return j;
    return undefined;
  }

  designationAt(x: number, y: number, z: number, ctx: GameEngine): Job | undefined {
    return this.byTile.get(ctx.world.idx(x, y, z));
  }

  cancelAt(ctx: GameEngine, pos: Pos): boolean {
    let done = false;
    for (const e of ctx.entities.at(pos.x, pos.y, pos.z)) {
      const hunt = this.huntFor(e.id);
      if (hunt) {
        this.drop(ctx, hunt);
        done = true;
      }
    }
    const job = this.byTile.get(ctx.world.idx(pos.x, pos.y, pos.z));
    if (!job) return done;
    this.drop(ctx, job);
    return true;
  }

  get pendingCount(): number {
    let n = 0;
    for (const j of this.jobs.values()) if (!j.worker) n++;
    return n;
  }

  ofType(type: JobType): Job[] {
    return [...this.jobs.values()].filter((j) => j.type === type);
  }

  private drop(ctx: GameEngine, job: Job): void {
    this.jobs.delete(job.id);
    const key = ctx.world.idx(job.pos.x, job.pos.y, job.pos.z);
    if (this.byTile.get(key) === job) this.byTile.delete(key);
    if (job.worker) {
      job.worker.job = null;
      job.worker.movement?.clear();
    }
  }

  /** Can this dwarf do the job tool-wise (holding the tool, or one is free in stock)? */
  private equipped(ctx: GameEngine, dwarf: Entity, job: Job): boolean {
    const tool = JOB_TOOL[job.type];
    return !tool || dwarf.tools.includes(tool) || ctx.stock[tool] > 0;
  }

  /** Give a queued job to an idle dwarf, nearest-first within priority. */
  requestJob(ctx: GameEngine, dwarf: Entity): Job | null {
    const candidates: Job[] = [];
    for (const job of this.jobs.values()) {
      if (job.worker || job.retryAt > ctx.tick) continue;
      const check = checkJob(ctx, job);
      if (check === 'obsolete') {
        this.drop(ctx, job);
        continue;
      }
      if (check === 'blocked' || !this.equipped(ctx, dwarf, job)) continue;
      if (job.type === JobType.HUNT) Object.assign(job.pos, ctx.entities.all.get(job.arg)!.pos);
      candidates.push(job);
    }
    const dist = (j: Job) => Math.abs(j.pos.x - dwarf.pos.x) + Math.abs(j.pos.y - dwarf.pos.y) + Math.abs(j.pos.z - dwarf.pos.z) * 8;
    candidates.sort((a, b) => b.priority - a.priority || dist(a) - dist(b));

    for (const job of candidates.slice(0, 3)) {
      const reachable = findPathAdjacent(ctx.world, dwarf.pos, job.pos, { maxNodes: 12000 }, job.type !== JobType.BUILD && job.type !== JobType.FISH) !== null;
      if (!reachable && job.type !== JobType.TELEPORT) {
        job.retryAt = ctx.tick + 300;
        continue;
      }
      const tool = JOB_TOOL[job.type];
      if (tool && !dwarf.tools.includes(tool)) {
        ctx.stock[tool]--;
        dwarf.tools.push(tool);
      }
      job.start(dwarf);
      dwarf.job = job;
      return job;
    }
    return null;
  }

  /** Called by the AI when a job it was running ended. */
  finish(ctx: GameEngine, job: Job, status: JobStatus): void {
    if (job.personal) {
      job.worker = null;
      return;
    }
    if (status === JobStatus.COMPLETED) {
      onJobCompleted(ctx, job);
      // fishing spots stay designated and get worked again after a rest
      if (job.type === JobType.FISH && this.jobs.has(job.id)) {
        job.reset();
        job.retryAt = ctx.tick + 250;
        return;
      }
      this.drop(ctx, job);
      return;
    }
    // failed: retry later, give up after a few attempts
    job.attempts++;
    if (job.attempts >= 3) {
      this.drop(ctx, job);
      ctx.log('JOB_COMPLETED', `Gave up on ${JOB_LABELS[job.type]} at ${job.pos.x},${job.pos.y},${job.pos.z}.`);
      return;
    }
    job.worker = null;
    job.reset();
    job.retryAt = ctx.tick + 200;
  }

  /** A dwarf stops what it's doing (e.g. urgent need): put the job back. */
  release(job: Job): void {
    if (job.personal) return;
    job.reset();
  }

  clear(): void {
    this.jobs.clear();
    this.byTile.clear();
  }

  /** Re-register an already-built job (used when loading a save). */
  restore(ctx: GameEngine, job: Job): void {
    this.jobs.set(job.id, job);
    if (job.type !== JobType.HUNT) this.byTile.set(ctx.world.idx(job.pos.x, job.pos.y, job.pos.z), job);
    this.nextId = Math.max(this.nextId, job.id + 1);
  }
}
