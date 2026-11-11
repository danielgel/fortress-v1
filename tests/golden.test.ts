/**
 * Golden fixtures for the Godot port: the GDScript side (godot/tests) must reproduce these
 * exactly. Regenerate after an intentional change with `npx vitest run -u tests/golden.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { rleEncode } from '../src/core/codec';
import { fbm, layerNoise, valueNoise } from '../src/core/noise';
import { Rng } from '../src/core/rng';
import { findPath, findPathAdjacent, findPathTo } from '../src/nav/astar';
import { FluidSystem } from '../src/world/fluids';
import { generateWorld } from '../src/world/generator';
import { type Pos } from '../src/world/types';
import {
  breachWorld,
  constraintsOf,
  embarkWorld,
  f64hex,
  layerHashes,
  LARGE,
  MEDIUM,
  ODD,
  pathQueries,
  pathWorld,
  sha256,
  shaftWorld,
  SMALL,
} from './golden-scenarios';

const FIXTURES = '../godot/tests/fixtures';

/** One JSON value per line for arrays of rows, so fixture diffs stay readable. */
function rows(items: unknown[]): string {
  return `[\n${items.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`;
}

describe('golden fixtures', () => {
  it('rng', async () => {
    const out = [0, 1, 12345, 0x7fffffff, 0xffffffff, 12345 ^ 0x9e3779b9].map((seed) => {
      const rng = new Rng(seed);
      const states: number[] = [];
      const ints: number[] = [];
      for (let i = 0; i < 20; i++) {
        rng.next();
        states.push(rng.state);
      }
      for (let i = 0; i < 20; i++) ints.push(rng.int(1 + i * 37));
      for (let i = 0; i < 1000; i++) rng.next();
      return { seed, states, ints, next: f64hex(rng.next()), final: rng.state };
    });
    await expect(rows(out)).toMatchFileSnapshot(`${FIXTURES}/rng.json`);
  });

  it('noise', async () => {
    // binary-exact values, so JSON parsing on the Godot side cannot shift them
    const coords = [-1234.5, -3.75, -1, -0.25, 0, 0.5, 1.25, 7.875, 123.4375, 99999.875];
    const seeds = [0, 1, 12346, 2147483646, 2147483653, -5];
    const out: unknown[] = [];
    for (const seed of seeds) {
      for (const x of coords) {
        for (const y of [coords[(coords.indexOf(x) * 3) % coords.length], coords[(coords.indexOf(x) * 7 + 2) % coords.length]]) {
          out.push({
            x,
            y,
            seed,
            value: f64hex(valueNoise(x, y, seed)),
            fbm: f64hex(fbm(x, y, seed)),
            fbm3: f64hex(fbm(x, y, seed, 3)),
            layer: f64hex(layerNoise(x, y, 5, seed)),
          });
        }
      }
    }
    await expect(rows(out)).toMatchFileSnapshot(`${FIXTURES}/noise.json`);
  });

  it('codec', async () => {
    const data = new Uint8Array(1000).map((_, i) => (i < 400 ? 0 : i % 7));
    const { world } = embarkWorld(SMALL);
    const out = { sample: rleEncode(data), smallFlags: rleEncode(world.flags), smallFeature: rleEncode(world.feature) };
    await expect(`${JSON.stringify(out, null, 1)}\n`).toMatchFileSnapshot(`${FIXTURES}/codec.json`);
  });

  it('worlds', async () => {
    const out: unknown[] = [];
    for (const [name, p] of Object.entries({ SMALL, MEDIUM, LARGE, ODD })) {
      const generated = await layerHashes(generateWorld(p));
      const { world, site } = embarkWorld(p);
      out.push({ name, params: p, generated, site, embarkFeature: await sha256(world.feature) });
    }
    await expect(rows(out)).toMatchFileSnapshot(`${FIXTURES}/worlds.json`);
  });

  it('paths', async () => {
    const { world, site } = pathWorld();
    const out = pathQueries(world, site).map((q) => {
      const [sx, sy, sz] = q.start;
      const [tx, ty, tz] = q.target;
      const start = { x: sx, y: sy, z: sz };
      const target = { x: tx, y: ty, z: tz };
      const opts = { maxNodes: q.maxNodes, constraints: constraintsOf(q) };
      let path: Pos[] | null;
      if (q.kind === 'to') path = findPathTo(world, start, target, opts);
      else if (q.kind === 'adj') path = findPathAdjacent(world, start, target, opts, q.allowOnTarget);
      else path = findPath(world, start, (x, y, z) => z > 0 && world.walkable(x, y, z), target, opts);
      return { ...q, path: path && path.flatMap((p) => [p.x, p.y, p.z]) };
    });
    await expect(rows(out)).toMatchFileSnapshot(`${FIXTURES}/paths.json`);
  });

  it('fluids', async () => {
    const snap = async (world: { water: Uint8Array; magma: Uint8Array; flags: Uint8Array }, fluids: FluidSystem, step: number) => ({
      step,
      water: await sha256(world.water),
      magma: await sha256(world.magma),
      active: fluids.activeCount,
    });
    const run = async (world: Parameters<typeof snap>[0], fluids: FluidSystem, checkpoints: number[]) => {
      const out = [await snap(world, fluids, 0)];
      let step = 0;
      for (const c of checkpoints) {
        for (; step < c; step++) fluids.update();
        out.push(await snap(world, fluids, step));
      }
      return out;
    };

    const shaft = shaftWorld();
    const { world: lakeWorld } = embarkWorld(SMALL);
    const lakes = new FluidSystem(lakeWorld);
    lakes.rebuild();
    const water = breachWorld('water');
    const magma = breachWorld('magma');
    const out = [
      { name: 'shaft', at: null, trace: await run(shaft.world, shaft.fluids, [1, 2, 5, 10, 100]) },
      { name: 'lakes', at: null, trace: await run(lakeWorld, lakes, [1, 40]) },
      { name: 'breach-water', at: water.at, flags: await sha256(water.world.flags), trace: await run(water.world, water.fluids, [1, 5, 20, 100, 300]) },
      { name: 'breach-magma', at: magma.at, flags: await sha256(magma.world.flags), trace: await run(magma.world, magma.fluids, [1, 5, 20, 100, 300]) },
    ];
    await expect(rows(out)).toMatchFileSnapshot(`${FIXTURES}/fluids.json`);
  });
});
