import { hasSave } from '../core/save';
import type { GameEngine } from '../game/engine';
import type { WorldGenerationParameters } from '../world/generator';
import { SEASON_NAMES } from '../world/calendar';

export type MenuView = 'main' | 'new';

export const WORLD_SIZES: Record<string, Pick<WorldGenerationParameters, 'width' | 'height' | 'depth'>> = {
  small: { width: 80, height: 80, depth: 8 },
  medium: { width: 100, height: 100, depth: 10 },
  large: { width: 140, height: 140, depth: 12 },
};

export interface NewGameOptions {
  params: Partial<WorldGenerationParameters>;
  dwarves: number;
}

export interface MenuHooks {
  /** Engine currently behind the menu. */
  engine(): GameEngine;
  /** Is that engine a game the player has actually played (or loaded)? */
  isRealGame(): boolean;
  /** The menu is about to appear over the game. */
  onOpen(): void;
  onResume(): void;
  onNewGame(opts: NewGameOptions): void;
  onLoad(): void;
  onHelp(): void;
}

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;

const randomSeed = () => 1 + Math.floor(Math.random() * 2147483646);

export function describeGame(e: GameEngine): string {
  const c = e.calendar;
  const n = e.entities.dwarves.length;
  return `${SEASON_NAMES[c.season]} ${c.dayOfSeason + 1}, Year ${c.year} · ${n} ${n === 1 ? 'dwarf' : 'dwarves'}`;
}

/** The title screen / pause menu. A modal <dialog>, so game keys are ignored while it's open. */
export class Menu {
  readonly el = document.getElementById('menu') as HTMLDialogElement;
  private view: MenuView = 'main';

  constructor(private hooks: MenuHooks) {
    this.el.addEventListener('click', (ev) => this.onClick(ev));
    this.el.addEventListener('cancel', (ev) => {
      // Esc in a sub-view steps back instead of leaving the menu
      if (this.view !== 'main') {
        ev.preventDefault();
        this.show('main');
      }
    });
    this.el.addEventListener('close', () => this.hooks.onResume());
    $<HTMLFormElement>('#new-game', this.el).addEventListener('submit', (ev) => {
      ev.preventDefault();
      this.embark();
    });
  }

  get isOpen(): boolean {
    return this.el.open;
  }

  open(view: MenuView = 'main'): void {
    if (!this.el.open) this.hooks.onOpen();
    this.show(view);
    if (!this.el.open) this.el.showModal();
  }

  close(): void {
    if (this.el.open) this.el.close();
  }

  private show(view: MenuView): void {
    this.view = view;
    this.el.querySelectorAll<HTMLElement>('[data-view]').forEach((v) => (v.hidden = v.dataset.view !== view));
    if (view === 'main') this.refreshMain();
    else {
      const seed = $<HTMLInputElement>('#opt-seed', this.el);
      if (!seed.value) seed.value = String(randomSeed());
      $('#opt-warn', this.el).hidden = !hasSave();
      seed.focus();
    }
  }

  private refreshMain(): void {
    const real = this.hooks.isRealGame();
    const primary = $<HTMLButtonElement>('[data-menu="continue"]', this.el);
    primary.querySelector('b')!.textContent = !real ? 'Quick start' : this.wasPlaying ? 'Resume' : 'Continue';
    primary.querySelector('small')!.textContent = real ? describeGame(this.hooks.engine()) : 'Embark on this world with 7 dwarves';
    // reloading the save only makes sense once you've played past it
    $<HTMLButtonElement>('[data-menu="load"]', this.el).hidden = !(this.wasPlaying && hasSave());
    primary.focus();
  }

  /** Set once the player has left the menu at least once. */
  wasPlaying = false;

  private onClick(ev: MouseEvent): void {
    const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-menu]');
    if (!b) return;
    switch (b.dataset.menu) {
      case 'continue':
        this.close();
        break;
      case 'new':
        this.show('new');
        break;
      case 'load':
        this.hooks.onLoad();
        this.close();
        break;
      case 'help':
        this.hooks.onHelp();
        break;
      case 'back':
        this.show('main');
        break;
      case 'reroll':
        $<HTMLInputElement>('#opt-seed', this.el).value = String(randomSeed());
        break;
    }
  }

  private embark(): void {
    const form = $<HTMLFormElement>('#new-game', this.el);
    const data = new FormData(form);
    const seedText = String(data.get('seed') ?? '').trim();
    // any text works as a seed: numbers are used as-is, words are hashed
    let seed = Number(seedText);
    if (!seedText) seed = randomSeed();
    else if (!Number.isInteger(seed) || seed <= 0) seed = hashSeed(seedText);
    const size = WORLD_SIZES[String(data.get('size'))] ?? WORLD_SIZES.medium;
    this.hooks.onNewGame({ params: { ...size, seed: seed % 2147483647 || 1 }, dwarves: Number(data.get('dwarves')) || 7 });
    $<HTMLInputElement>('#opt-seed', this.el).value = '';
    this.show('main');
    this.close();
  }
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) % 2147483646 + 1;
}
