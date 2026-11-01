import './style.css';
import { hasSave, loadFromStorage, saveToStorage } from './core/save';
import { GameEngine } from './game/engine';
import { addOrder, toggleKeep } from './game/production';
import type { Building } from './game/content';
import { Controller } from './ui/controller';
import { Hud } from './ui/hud';
import { Renderer } from './ui/renderer';

const canvas = document.getElementById('map') as HTMLCanvasElement;
const stage = document.getElementById('stage') as HTMLElement;
const help = document.getElementById('help') as HTMLDialogElement;
const orders = document.getElementById('orders') as HTMLDialogElement;
const hint = document.getElementById('hint') as HTMLElement;

const renderer = new Renderer(canvas);
let engine = loadFromStorage() ?? GameEngine.create();

let toastTimer = 0;
function toast(text: string): void {
  hint.textContent = text;
  hint.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => hint.classList.remove('show'), 2200);
}

const controller = new Controller(engine, renderer, canvas, {
  onSave: () => toast(saveToStorage(controller.engine) ? 'Game saved' : 'Could not save (storage full or blocked)'),
  onLoad: () => {
    const loaded = loadFromStorage();
    if (!loaded) return toast('No saved game found');
    wire(loaded);
    toast('Game loaded');
  },
  onNew: () => {
    if (!confirm('Start a new world? Unsaved progress will be lost.')) return;
    wire(GameEngine.create());
    toast('A new expedition begins');
  },
  onHelp: () => (help.open ? help.close() : help.showModal()),
  onOrders: () => {
    if (orders.open) return orders.close();
    hud.renderOrders();
    orders.showModal();
  },
  toast,
});
const hud = new Hud(controller);

function wire(next: GameEngine): void {
  engine = next;
  controller.reset(next);
  next.events.on('SEASON_CHANGED', () => saveToStorage(next));
}
wire(engine);

function resize(): void {
  renderer.resize(stage.clientWidth, stage.clientHeight);
  renderer.clampCamera(controller.engine);
}
new ResizeObserver(resize).observe(stage);
resize();
renderer.centerOn(engine, engine.embark.x, engine.embark.y);

// toolbar buttons
document.getElementById('toolbar')!.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b) return;
  if (b.dataset.mode) controller.setMode(b.dataset.mode as never);
  switch (b.dataset.act) {
    case 'zup':
      controller.changeZ(-1);
      break;
    case 'zdown':
      controller.changeZ(1);
      break;
    case 'save':
      controller.hooks().onSave();
      break;
    case 'load':
      controller.hooks().onLoad();
      break;
    case 'new':
      controller.hooks().onNew();
      break;
    case 'help':
      controller.hooks().onHelp();
      break;
    case 'orders':
      controller.hooks().onOrders();
      break;
  }
});
document.getElementById('buildbar')!.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-build]');
  if (b) controller.setBuildKind(Number(b.dataset.build) as Building);
  hud.update();
});
orders.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!b) return;
  if (b.dataset.order) addOrder(controller.engine, b.dataset.order, Number(b.dataset.n));
  if (b.dataset.keep) toggleKeep(controller.engine, b.dataset.keep);
  hud.renderOrders();
});
document.getElementById('speed')!.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b) return;
  if (b.dataset.act === 'pause') controller.clock.paused = !controller.clock.paused;
  if (b.dataset.speed) {
    controller.clock.paused = false;
    controller.clock.setSpeed(Number(b.dataset.speed));
  }
});
document.getElementById('sidebar-toggle')!.addEventListener('click', () => document.body.classList.toggle('side-open'));

window.addEventListener('beforeunload', () => saveToStorage(controller.engine));
if (!hasSave() && !localStorage.getItem('fortress-seen-help')) {
  try {
    localStorage.setItem('fortress-seen-help', '1');
  } catch {
    /* storage blocked */
  }
  help.showModal();
}

let last = performance.now();
let hudAt = 0;
function frame(now: number): void {
  const dt = now - last;
  last = now;
  const eng = controller.engine;
  controller.clock.advance(dt, () => eng.update());
  renderer.render(eng, controller.view, now);
  if (now - hudAt > 200) {
    hudAt = now;
    hud.update();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
hud.update();

// handy for debugging in the console
(window as unknown as { fortress: unknown }).fortress = { get engine() { return controller.engine; }, controller };
