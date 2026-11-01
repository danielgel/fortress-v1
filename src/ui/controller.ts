import { SPEED_TPS, TickClock } from '../core/clock';
import type { Entity } from '../entities/entity';
import { BUILD_MENU, WALL, type Building } from '../game/content';
import type { GameEngine } from '../game/engine';
import { JobType } from '../jobs/job';
import type { Pos } from '../world/types';
import type { Renderer, ViewState } from './renderer';

export type Mode = 'dig' | 'stairs' | 'chop' | 'gather' | 'fish' | 'hunt' | 'build' | 'remove' | 'teleport' | 'cancel';

const MODE_JOB: Record<Exclude<Mode, 'cancel'>, JobType> = {
  dig: JobType.DIG,
  stairs: JobType.STAIRS,
  chop: JobType.CHOP,
  gather: JobType.GATHER,
  fish: JobType.FISH,
  hunt: JobType.HUNT,
  build: JobType.BUILD,
  remove: JobType.REMOVE,
  teleport: JobType.TELEPORT,
};

const MODE_KEYS: Record<string, Mode> = {
  d: 'dig',
  v: 'stairs',
  c: 'chop',
  g: 'gather',
  f: 'fish',
  h: 'hunt',
  b: 'build',
  r: 'remove',
  t: 'teleport',
  x: 'cancel',
};

export interface ControllerHooks {
  onSave(): void;
  onLoad(): void;
  onNew(): void;
  onHelp(): void;
  onOrders(): void;
  toast(text: string): void;
}

/** Turns keyboard / mouse / touch input into engine commands and view state. */
export class Controller {
  mode: Mode | null = null;
  /** What the build tool places (WALL = a stone wall). */
  buildKind: Building = WALL;
  z = 0;
  cursor: Pos = { x: 0, y: 0, z: 0 };
  anchor: Pos | null = null;
  selected: Entity | null = null;
  readonly clock = new TickClock();
  private drag: { start: Pos } | null = null;
  private pan: { x: number; y: number; camX: number; camY: number } | null = null;

  constructor(
    public engine: GameEngine,
    private renderer: Renderer,
    private canvas: HTMLCanvasElement,
    private readonly _hooks: ControllerHooks,
  ) {
    this.bindKeyboard();
    this.bindPointer();
    this.reset(engine);
  }

  hooks(): ControllerHooks {
    return this._hooks;
  }

  reset(engine: GameEngine): void {
    this.engine = engine;
    this.z = 0;
    this.mode = null;
    this.anchor = null;
    this.drag = null;
    this.selected = null;
    this.cursor = { x: engine.embark.x, y: engine.embark.y, z: 0 };
    this.renderer.centerOn(engine, engine.embark.x, engine.embark.y);
  }

  get view(): ViewState {
    let selection: ViewState['selection'] = null;
    if (this.drag) selection = { a: this.drag.start, b: this.cursor };
    else if (this.anchor) selection = { a: this.anchor, b: this.cursor };
    return { z: this.z, cursor: this.cursor, selection, selected: this.selected };
  }

  setBuildKind(kind: Building): void {
    this.buildKind = kind;
    this.mode = 'build';
  }

  private cycleBuildKind(dir: number): void {
    const i = BUILD_MENU.indexOf(this.buildKind);
    this.setBuildKind(BUILD_MENU[(i + dir + BUILD_MENU.length) % BUILD_MENU.length]);
  }

  setMode(mode: Mode | null): void {
    this.mode = this.mode === mode ? null : mode;
    this.anchor = null;
    this.drag = null;
  }

  changeZ(dz: number): void {
    const z = Math.max(0, Math.min(this.engine.world.depth - 1, this.z + dz));
    this.z = z;
    this.cursor = { ...this.cursor, z };
    this.engine.world.currentZ = z;
  }

  moveCursor(dx: number, dy: number): void {
    const w = this.engine.world;
    this.cursor = {
      x: Math.max(0, Math.min(w.width - 1, this.cursor.x + dx)),
      y: Math.max(0, Math.min(w.height - 1, this.cursor.y + dy)),
      z: this.z,
    };
    this.renderer.reveal(this.engine, this.cursor.x, this.cursor.y);
  }

  panCamera(dx: number, dy: number): void {
    this.renderer.camX += dx;
    this.renderer.camY += dy;
    this.renderer.clampCamera(this.engine);
    this.cursor = {
      x: Math.max(this.renderer.camX, Math.min(this.renderer.camX + this.renderer.cols - 1, this.cursor.x)),
      y: Math.max(this.renderer.camY, Math.min(this.renderer.camY + this.renderer.rows - 1, this.cursor.y)),
      z: this.z,
    };
  }

  selectNextDwarf(): void {
    const dwarves = this.engine.entities.dwarves;
    if (dwarves.length === 0) return;
    const i = this.selected ? dwarves.findIndex((d) => d.id === this.selected!.id) : -1;
    this.focus(dwarves[(i + 1) % dwarves.length]);
  }

  focus(e: Entity): void {
    this.selected = e;
    this.z = e.pos.z;
    this.cursor = { ...e.pos };
    this.renderer.centerOn(this.engine, e.pos.x, e.pos.y);
  }

  /** Apply the current tool to a rectangle (or single tile). */
  private applyArea(a: Pos, b: Pos): void {
    const e = this.engine;
    if (!this.mode) return;
    if (this.mode === 'cancel') {
      const n = e.cancelArea(a, b);
      this._hooks.toast(n ? `Cancelled ${n} designation${n > 1 ? 's' : ''}` : 'Nothing to cancel there');
      return;
    }
    const type = MODE_JOB[this.mode];
    const arg = this.mode === 'build' ? this.buildKind : 0;
    const n = type === JobType.TELEPORT ? this.teleportTo(b) : e.designateArea(type, a, b, arg);
    if (n === 0) {
      const single = a.x === b.x && a.y === b.y;
      const reason = single ? e.jobs.designate(e, type, b, 1, arg) : 'no valid tiles';
      this._hooks.toast(typeof reason === 'string' ? `Can't do that: ${reason}` : 'Designated');
    } else this._hooks.toast(`Designated ${n} tile${n > 1 ? 's' : ''}`);
  }

  private teleportTo(p: Pos): number {
    return typeof this.engine.jobs.designate(this.engine, JobType.TELEPORT, p, 5) === 'string' ? 0 : 1;
  }

  private confirmKey(): void {
    if (!this.mode) return;
    if (this.mode === 'teleport' || !this.anchor) {
      if (this.mode === 'teleport') this.applyArea(this.cursor, this.cursor);
      else this.anchor = { ...this.cursor };
      return;
    }
    this.applyArea(this.anchor, this.cursor);
    this.anchor = null;
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (ev) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (document.querySelector('dialog[open]')) return;
      const k = ev.key.toLowerCase();
      let handled = true;
      switch (ev.key) {
        case 'ArrowUp':
          ev.shiftKey ? this.panCamera(0, -3) : this.moveCursor(0, -1);
          break;
        case 'ArrowDown':
          ev.shiftKey ? this.panCamera(0, 3) : this.moveCursor(0, 1);
          break;
        case 'ArrowLeft':
          ev.shiftKey ? this.panCamera(-3, 0) : this.moveCursor(-1, 0);
          break;
        case 'ArrowRight':
          ev.shiftKey ? this.panCamera(3, 0) : this.moveCursor(1, 0);
          break;
        case 'PageUp':
        case '<':
        case ',':
          this.changeZ(-1);
          break;
        case 'PageDown':
        case '>':
        case '.':
          this.changeZ(1);
          break;
        case 'Enter':
          this.confirmKey();
          break;
        case 'Escape':
          if (this.anchor || this.drag) {
            this.anchor = null;
            this.drag = null;
          } else this.mode = null;
          break;
        case ' ':
          this.clock.paused = !this.clock.paused;
          break;
        case 'Tab':
          this.selectNextDwarf();
          break;
        case '?':
          this._hooks.onHelp();
          break;
        case '[':
        case ']':
          this.cycleBuildKind(ev.key === ']' ? 1 : -1);
          break;
        default:
          handled = false;
      }
      if (!handled) {
        handled = true;
        if (k in MODE_KEYS && !ev.shiftKey) this.setMode(MODE_KEYS[k]);
        else if (k >= '1' && k <= String(SPEED_TPS.length)) this.clock.setSpeed(Number(k));
        else if (k === 'p') this._hooks.onSave();
        else if (k === 'l') this._hooks.onLoad();
        else if (k === 'n') this._hooks.onNew();
        else if (k === 'o') this._hooks.onOrders();
        else handled = false;
      }
      if (handled) ev.preventDefault();
    });
  }

  private tileAt(ev: PointerEvent): Pos {
    const r = this.canvas.getBoundingClientRect();
    const t = this.renderer.screenToTile(ev.clientX - r.left, ev.clientY - r.top);
    const w = this.engine.world;
    return { x: Math.max(0, Math.min(w.width - 1, t.x)), y: Math.max(0, Math.min(w.height - 1, t.y)), z: this.z };
  }

  private bindPointer(): void {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (ev) => {
      c.setPointerCapture(ev.pointerId);
      c.focus();
      const panning = ev.button === 2 || ev.button === 1 || (ev.pointerType === 'touch' && !this.mode);
      if (panning) {
        this.pan = { x: ev.clientX, y: ev.clientY, camX: this.renderer.camX, camY: this.renderer.camY };
        return;
      }
      this.cursor = this.tileAt(ev);
      if (this.mode && this.mode !== 'teleport') this.drag = { start: this.cursor };
    });
    c.addEventListener('pointermove', (ev) => {
      if (this.pan) {
        this.renderer.camX = this.pan.camX - Math.round((ev.clientX - this.pan.x) / this.renderer.cellW);
        this.renderer.camY = this.pan.camY - Math.round((ev.clientY - this.pan.y) / this.renderer.cellH);
        this.renderer.clampCamera(this.engine);
        return;
      }
      this.cursor = this.tileAt(ev);
    });
    const end = (ev: PointerEvent) => {
      if (this.pan) {
        this.pan = null;
        return;
      }
      this.cursor = this.tileAt(ev);
      if (this.drag) {
        this.applyArea(this.drag.start, this.cursor);
        this.drag = null;
      } else if (this.mode === 'teleport') {
        this.applyArea(this.cursor, this.cursor);
      } else if (!this.mode) {
        const here = this.engine.entities.at(this.cursor.x, this.cursor.y, this.z)[0];
        this.selected = here ?? null;
      }
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', () => {
      this.pan = null;
      this.drag = null;
    });
    c.addEventListener(
      'wheel',
      (ev) => {
        ev.preventDefault();
        this.changeZ(ev.deltaY > 0 ? 1 : -1);
      },
      { passive: false },
    );
  }
}
