import { BIOMES, type BiomeType } from '../world/biome';
import { EntityType, type Entity } from '../entities/entity';
import type { GameEngine } from '../game/engine';
import { JobType } from '../jobs/job';
import { Feature, Flag, Material, type Pos } from '../world/types';
import { WeatherType } from '../world/weather';
import { BUILDINGS, Building } from '../game/content';

export interface ViewState {
  z: number;
  cursor: Pos;
  selection: { a: Pos; b: Pos } | null;
  selected: Entity | null;
}

interface Cell {
  ch: string;
  fg: string;
  bg: string;
}

const FONT = '"DejaVu Sans Mono", "Cascadia Mono", Menlo, Consolas, monospace';
const FONT_PX = 16;

const JOB_GLYPH: Partial<Record<JobType, string>> = {
  [JobType.DIG]: 'x',
  [JobType.STAIRS]: '>',
  [JobType.CHOP]: 't',
  [JobType.GATHER]: 'g',
  [JobType.TELEPORT]: '*',
  [JobType.FISH]: 'f',
  [JobType.REMOVE]: 'r',
};

const ENTITY_VIEW: Record<EntityType, Cell> = {
  [EntityType.DWARF]: { ch: '@', fg: '#ffffff', bg: '' },
  [EntityType.ANIMAL]: { ch: 'a', fg: '#7ad67a', bg: '' },
  [EntityType.MONSTER]: { ch: 'M', fg: '#ff4040', bg: '' },
};

function hash(x: number, y: number, n = 0): number {
  let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(n + 1, 1013904223);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amount));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/** Draws the map as a grid of ASCII cells on a canvas. */
export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  cellW = 10;
  cellH = 18;
  cols = 0;
  rows = 0;
  camX = 0;
  camY = 0;
  private cssW = 0;
  private cssH = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
  }

  resize(cssW: number, cssH: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.cssW = cssW;
    this.cssH = cssH;
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.font = `${FONT_PX}px ${FONT}`;
    this.cellW = Math.ceil(this.ctx.measureText('M').width) || Math.ceil(FONT_PX * 0.6);
    this.cellH = FONT_PX + 3;
    this.cols = Math.max(1, Math.floor(cssW / this.cellW));
    this.rows = Math.max(1, Math.floor(cssH / this.cellH));
  }

  clampCamera(engine: GameEngine): void {
    const w = engine.world;
    this.camX = Math.max(0, Math.min(Math.max(0, w.width - this.cols), this.camX));
    this.camY = Math.max(0, Math.min(Math.max(0, w.height - this.rows), this.camY));
  }

  centerOn(engine: GameEngine, x: number, y: number): void {
    this.camX = Math.round(x - this.cols / 2);
    this.camY = Math.round(y - this.rows / 2);
    this.clampCamera(engine);
  }

  /** Scroll just enough to keep a tile visible with a small margin. */
  reveal(engine: GameEngine, x: number, y: number): void {
    const m = 3;
    if (x < this.camX + m) this.camX = x - m;
    if (x > this.camX + this.cols - 1 - m) this.camX = x - this.cols + 1 + m;
    if (y < this.camY + m) this.camY = y - m;
    if (y > this.camY + this.rows - 1 - m) this.camY = y - this.rows + 1 + m;
    this.clampCamera(engine);
  }

  screenToTile(px: number, py: number): { x: number; y: number } {
    return { x: this.camX + Math.floor(px / this.cellW), y: this.camY + Math.floor(py / this.cellH) };
  }

  private tileCell(engine: GameEngine, x: number, y: number, z: number): Cell {
    const w = engine.world;
    const i = w.idx(x, y, z);
    const f = w.flags[i];

    if (!(f & Flag.OPEN)) {
      if (!(f & Flag.DISCOVERED)) return { ch: ' ', fg: '#000', bg: '#08080b' };
      const feat = w.feature[i];
      const soil = w.material[i] === Material.SOIL;
      const bg = soil ? '#33281e' : '#26262c';
      if (feat === Feature.ORE) return { ch: '◊', fg: '#4fd8e8', bg };
      if (feat === Feature.GEM) return { ch: '♦', fg: '#d070ff', bg };
      return { ch: '#', fg: soil ? '#6f5a42' : '#6c6c76', bg };
    }

    if (w.magma[i] > 0) return { ch: '≈', fg: '#ff8a2a', bg: shade('#5a1a08', w.magma[i] * 6) };
    if (w.water[i] > 0) {
      if (z === 0 && engine.isIce(x, y)) return { ch: '=', fg: '#e6f6ff', bg: '#7fa6bb' };
      return { ch: w.water[i] > 3 ? '≈' : '~', fg: '#7fb4ff', bg: shade('#10305f', w.water[i] * 7) };
    }

    const feat = w.feature[i];
    if (f & Flag.STAIRS_DOWN && f & Flag.STAIRS_UP) return { ch: 'X', fg: '#ffd070', bg: '#222228' };
    if (f & Flag.STAIRS_DOWN) return { ch: '>', fg: '#ffd070', bg: z === 0 ? '#2a3a26' : '#222228' };
    if (f & Flag.STAIRS_UP) return { ch: '<', fg: '#ffd070', bg: '#222228' };
    const b = w.building[i] as Building;
    if (b) {
      const info = BUILDINGS[b];
      return { ch: info.glyph, fg: info.fg, bg: info.bg ?? (z === 0 ? '#2e2a22' : '#24242a') };
    }

    let bg: string;
    let fg: string;
    if (z === 0) {
      const biome = BIOMES[w.biome[y * w.width + x] as BiomeType];
      const snowy = engine.climate.isFreezing && biome.ground !== Material.SAND;
      bg = snowy ? shade('#b9c4cc', Math.round((hash(x, y) - 0.5) * 14)) : shade(biome.color, Math.round((hash(x, y) - 0.5) * 16));
      fg = snowy ? '#8a97a1' : shade(biome.color, 40);
    } else {
      bg = shade('#1c1c22', Math.round((hash(x, y, z) - 0.5) * 8));
      fg = '#4a4a54';
    }
    if (feat === Feature.TREE) return { ch: '♣', fg: engine.climate.isFreezing ? '#9fc2a8' : '#37b04a', bg };
    if (feat === Feature.SHRUB) return { ch: '"', fg: '#e0587a', bg };
    if (feat === Feature.MUSHROOM) return { ch: '♠', fg: '#b48cff', bg };
    return { ch: hash(x, y, 7) < 0.5 ? '.' : ',', fg, bg };
  }

  render(engine: GameEngine, view: ViewState, now: number): void {
    const c = this.ctx;
    const w = engine.world;
    const z = view.z;
    c.font = `${FONT_PX}px ${FONT}`;
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.fillStyle = '#08080b';
    c.fillRect(0, 0, this.cssW, this.cssH);

    const entityAt = new Map<number, Entity>();
    for (const e of engine.entities.all.values()) {
      if (e.pos.z === z) entityAt.set(e.pos.y * w.width + e.pos.x, e);
    }
    const weather = engine.weather.current;
    const frame = Math.floor(now / 140);

    for (let r = 0; r < this.rows; r++) {
      const y = this.camY + r;
      if (y >= w.height) break;
      for (let col = 0; col < this.cols; col++) {
        const x = this.camX + col;
        if (x >= w.width) break;
        const px = col * this.cellW;
        const py = r * this.cellH;
        let cell = this.tileCell(engine, x, y, z);

        const job = engine.jobs.designationAt(x, y, z, engine);
        if (job?.type === JobType.CRAFT) {
          // a busy workshop: keep its glyph, light it up
          cell = { ch: cell.ch, fg: cell.fg, bg: job.worker ? '#7a4a10' : cell.bg };
        } else if (job) {
          const g = job.type === JobType.BUILD ? BUILDINGS[job.arg as Building].glyph : JOB_GLYPH[job.type];
          cell = { ch: g ?? cell.ch, fg: '#ffe27a', bg: job.worker ? '#6b5a14' : '#4a4012' };
        }
        const ent = entityAt.get(y * w.width + x);
        if (ent) {
          const v = ENTITY_VIEW[ent.type];
          const ch = ent.type === EntityType.ANIMAL ? ent.name[0] : v.ch;
          const bg = ent === view.selected ? '#3b5bb0' : ent.type === EntityType.ANIMAL && engine.jobs.huntFor(ent.id) ? '#7a1f1f' : cell.bg;
          cell = { ch, fg: v.fg, bg };
        }

        c.fillStyle = cell.bg;
        c.fillRect(px, py, this.cellW, this.cellH);
        if (z === 0 && !ent && weather !== WeatherType.CLEAR && weather !== WeatherType.CLOUDY && hash(x, y, frame) < (weather === WeatherType.STORM ? 0.08 : 0.04)) {
          cell = weather === WeatherType.SNOW ? { ch: '*', fg: '#ffffff', bg: cell.bg } : { ch: '/', fg: '#8ab4ff', bg: cell.bg };
        }
        if (cell.ch !== ' ') {
          c.fillStyle = cell.fg;
          c.fillText(cell.ch, px + this.cellW / 2, py + this.cellH / 2 + 1);
        }
      }
    }

    // night / weather tint on the surface
    if (z === 0) {
      const dark = engine.calendar.darkness * 0.55 + (weather === WeatherType.STORM ? 0.15 : weather === WeatherType.CLOUDY ? 0.05 : 0);
      if (dark > 0.01) {
        c.fillStyle = `rgba(4,8,36,${Math.min(0.75, dark).toFixed(3)})`;
        c.fillRect(0, 0, this.cssW, this.cssH);
      }
    }

    if (view.selection) this.outline(view.selection.a, view.selection.b, 'rgba(255,226,122,0.95)', 'rgba(255,226,122,0.16)');
    this.outline(view.cursor, view.cursor, 'rgba(255,255,255,0.95)', null);
  }

  private outline(a: Pos, b: Pos, stroke: string, fill: string | null): void {
    const x0 = Math.min(a.x, b.x);
    const y0 = Math.min(a.y, b.y);
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const px = (x0 - this.camX) * this.cellW;
    const py = (y0 - this.camY) * this.cellH;
    const pw = (x1 - x0 + 1) * this.cellW;
    const ph = (y1 - y0 + 1) * this.cellH;
    if (fill) {
      this.ctx.fillStyle = fill;
      this.ctx.fillRect(px, py, pw, ph);
    }
    this.ctx.strokeStyle = stroke;
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(px + 0.75, py + 0.75, pw - 1.5, ph - 1.5);
  }
}
