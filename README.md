# Fortress

A Dwarf Fortress–inspired colony sim that runs entirely in the browser. TypeScript, Vite, a single `<canvas>`, no runtime dependencies (~18 kB gzipped).

Guide a band of dwarves: designate digging, chopping and foraging; they pick up work, eat, drink and sleep on their own. Dig stairs down from the surface, carve out rooms, break into caverns, and watch out for flooded pockets, magma and goblin raids.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # simulation tests (vitest, headless)
npm run build      # typecheck + static bundle in dist/
```

## Deploy to Cloudflare

The build is a static site, so it deploys as Workers static assets (config in `wrangler.jsonc`).

```bash
npx wrangler login   # once
npm run deploy       # builds, then `wrangler deploy`
```

Cloudflare Pages also works: build command `npm run build`, output directory `dist`.

## Controls

| Key | Action |
| --- | --- |
| Arrows / mouse | move cursor |
| Shift+arrows, right-drag | pan camera |
| `<` `>` / PgUp PgDn / wheel | change level (0 = surface, higher = deeper) |
| `D` `V` `C` `G` `B` `T` `X` | dig · stairs down · chop · gather · build wall · teleport · cancel |
| Drag, or `Enter` twice | apply the tool to a rectangle |
| `Space`, `1`–`4` | pause, speed |
| `Tab` | cycle dwarves |
| `P` `L` `N` | save · load · new world (autosaves each season) |
| `?` | help |

## How it's organised

```
src/
  core/      seeded RNG, noise, events, tick clock, RLE codec, localStorage saves
  world/     typed-array world, generator, biomes, calendar, climate, weather, fluids
  nav/       3D A* (stairs, wading, multi-goal "stand next to X" queries)
  entities/  entities + components (physical, mental, skills, needs, movement), AI
  jobs/      jobs made of steps (goto / work / teleport), recipes, shared queue
  game/      GameEngine: owns every system and advances one tick at a time
  ui/        canvas renderer, input controller, DOM HUD
tests/       headless simulation tests
```

The simulation has no DOM dependency and is driven by `GameEngine.update()`; the browser loop only decides how many ticks to run per frame (`core/clock.ts`).

## Notes on the port from Java/LibGDX

The original project was mostly scaffolding. The ported version keeps its architecture (tick-driven systems, entity components, job steps, event manager, ASCII glyphs) and fills in the stubbed pieces: world generation with biomes, seasons and weather, fluids, needs, combat, saving. The old threaded `TimeTickManager` became a frame-driven clock; fluids are now level-based tiles rather than the `FluidLevel` placeholder, and `WATER`/`MAGMA` are fluid levels instead of tile materials. The Java sources remain in git history.
