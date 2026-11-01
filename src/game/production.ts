import { JobType } from '../jobs/job';
import { RECIPES, type Cost, type Resource, canAfford } from './content';
import type { GameEngine } from './engine';

/** A standing work order for one recipe. */
export interface Order {
  /** How many more batches to make. */
  queued: number;
  /** Keep making batches while the output stock is below the recipe's `keep` level. */
  keep: boolean;
}

export type Orders = Record<string, Order>;

/** Inputs already promised to queued craft jobs (consumed only when the job finishes). */
function reserved(ctx: GameEngine): Cost {
  const out: Cost = {};
  for (const job of ctx.jobs.ofType(JobType.CRAFT)) {
    for (const [k, n] of Object.entries(RECIPES[job.arg].input)) out[k as Resource] = (out[k as Resource] ?? 0) + n;
  }
  return out;
}

/** How many more batches of recipe `i` are wanted beyond those already in progress. */
export function wanted(ctx: GameEngine, i: number): number {
  const r = RECIPES[i];
  const o = ctx.orders[r.id];
  if (!o) return 0;
  const inflight = ctx.jobs.ofType(JobType.CRAFT).filter((j) => j.arg === i).length;
  let want = o.queued - inflight;
  if (o.keep) {
    const [res, per] = Object.entries(r.output)[0] as [Resource, number];
    want = Math.max(want, Math.ceil((r.keep - ctx.stock[res]) / per) - inflight);
  }
  return want;
}

/** Turn work orders into craft jobs at free workshops. Called a few times a second. */
export function processOrders(ctx: GameEngine): void {
  const w = ctx.world;
  for (let i = 0; i < RECIPES.length; i++) {
    const r = RECIPES[i];
    let want = wanted(ctx, i);
    if (want <= 0) continue;
    for (const tile of w.buildingTiles) {
      if (want <= 0) break;
      const p = w.pos(tile);
      if (w.building[tile] !== r.workshop || ctx.jobs.designationAt(p.x, p.y, p.z, ctx)) continue;
      if (!canAfford(ctx.stock, r.input, reserved(ctx))) break;
      if (typeof ctx.jobs.designate(ctx, JobType.CRAFT, p, 1, i) !== 'string') want--;
    }
  }
  // finished one-off orders disappear
  for (const [id, o] of Object.entries(ctx.orders)) if (o.queued <= 0 && !o.keep) delete ctx.orders[id];
}

export function addOrder(ctx: GameEngine, id: string, n: number): void {
  const o = (ctx.orders[id] ??= { queued: 0, keep: false });
  o.queued = Math.max(0, o.queued + n);
}

export function toggleKeep(ctx: GameEngine, id: string): void {
  const o = (ctx.orders[id] ??= { queued: 0, keep: false });
  o.keep = !o.keep;
}
