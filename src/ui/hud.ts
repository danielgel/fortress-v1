import { BIOMES, type BiomeType } from '../world/biome';
import { Feature, Flag, Material } from '../world/types';
import { WEATHER_NAMES } from '../world/weather';
import { EntityType } from '../entities/entity';
import { JOB_LABELS } from '../jobs/job';
import { SKILL_TYPES } from '../entities/components';
import { SPEED_TPS } from '../core/clock';
import type { GameEngine } from '../game/engine';
import type { Controller, Mode } from './controller';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const MATERIAL_NAMES = ['stone', 'soil', 'sand', 'grass', 'snow', 'mud'];
const FEATURE_NAMES = ['', 'tree', 'berry shrub', 'ore vein', 'gem deposit'];

const MODE_HINTS: Record<Mode, string> = {
  dig: 'Dig: drag a rectangle over rock to mine it',
  stairs: 'Stairs: click a surface or floor tile to dig a stairway down',
  chop: 'Chop: select trees (♣)',
  gather: 'Gather: select berry shrubs (")',
  build: 'Build: click open floor to raise a wall (costs 1 stone)',
  teleport: 'Teleport: click a tile to send a dwarf there',
  cancel: 'Cancel: drag over designations to remove them',
};

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

function bar(label: string, value: number, bad: boolean): string {
  return `<span class="bar ${bad ? 'bad' : ''}" title="${label} ${Math.round(value)}"><i style="width:${Math.round(value)}%"></i></span>`;
}

/** Refreshes the DOM panels around the canvas. Cheap enough to call a few times a second. */
export class Hud {
  private lastLog = -1;

  constructor(private ctl: Controller) {}

  update(): void {
    const { engine: e, clock } = this.ctl;
    $('date').textContent = e.calendar.describe();
    $('weather').textContent = `${WEATHER_NAMES[e.weather.current]} · ${e.climate.currentTemperature}°C`;
    $('depth').textContent = this.ctl.z === 0 ? 'Surface' : `Depth ${this.ctl.z}`;

    document.querySelectorAll<HTMLButtonElement>('#speed button[data-speed]').forEach((b) => {
      b.classList.toggle('on', !clock.paused && Number(b.dataset.speed) === clock.speed);
      b.title = `${SPEED_TPS[Number(b.dataset.speed) - 1]} ticks/s`;
    });
    $('speed').querySelector<HTMLButtonElement>('[data-act="pause"]')!.classList.toggle('on', clock.paused);
    document.querySelectorAll<HTMLButtonElement>('#modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === this.ctl.mode));
    $('hint').textContent = this.ctl.mode ? MODE_HINTS[this.ctl.mode] : '';
    $('hint').classList.toggle('show', this.ctl.mode !== null);

    const s = e.stock;
    $('stock').innerHTML = (
      [
        ['Food', s.food, s.food < 8],
        ['Wood', s.wood, false],
        ['Stone', s.stone, false],
        ['Ore', s.ore, false],
        ['Gems', s.gems, false],
        ['Jobs', e.jobs.jobs.size, false],
      ] as const
    )
      .map(([k, v, bad]) => `<div class="${bad ? 'bad' : ''}"><span>${k}</span><b>${v}</b></div>`)
      .join('');

    this.renderDwarves();
    this.renderTile();
    this.renderLog(e);
  }

  private renderDwarves(): void {
    const e = this.ctl.engine;
    const dwarves = e.entities.dwarves;
    $('dwarf-count').textContent = `(${dwarves.length})`;
    const list = $('dwarves');
    list.innerHTML = dwarves
      .map((d) => {
        const n = d.needs!;
        const job = d.job ? JOB_LABELS[d.job.type] : 'idle';
        const sel = this.ctl.selected?.id === d.id ? ' sel' : '';
        return `<li class="dwarf${sel}" data-id="${d.id}"><div class="row"><b>${esc(d.name)}</b><span class="muted">${job}</span></div>
          <div class="bars">${bar('hunger', n.hunger, n.hunger > 80)}${bar('thirst', n.thirst, n.thirst > 80)}${bar('tired', n.fatigue, n.fatigue > 85)}${bar('health', d.physical!.health, d.physical!.health < 40)}</div></li>`;
      })
      .join('');
    list.querySelectorAll<HTMLLIElement>('li').forEach((li) => {
      li.onclick = () => {
        const d = e.entities.all.get(Number(li.dataset.id));
        if (d) this.ctl.focus(d);
      };
    });
  }

  private renderTile(): void {
    const { engine: e, cursor: c, z } = this.ctl;
    const w = e.world;
    const el = $('tile');
    if (!w.inBounds(c.x, c.y, z)) return;
    const i = w.idx(c.x, c.y, z);
    const f = w.flags[i];
    const lines: string[] = [`<b>${c.x}, ${c.y}</b> · level ${z}`];
    if (!(f & Flag.OPEN)) {
      lines.push(f & Flag.DISCOVERED ? `Solid ${MATERIAL_NAMES[w.material[i]]}${w.feature[i] ? ` with ${FEATURE_NAMES[w.feature[i]]}` : ''}` : 'Unexplored rock');
    } else {
      const parts: string[] = [];
      if (f & Flag.STAIRS_DOWN) parts.push('stairs down');
      if (f & Flag.STAIRS_UP) parts.push('stairs up');
      parts.push(z === 0 ? `${MATERIAL_NAMES[w.material[i] as Material]} floor` : 'floor');
      if (w.feature[i] !== Feature.NONE) parts.push(FEATURE_NAMES[w.feature[i]]);
      if (w.water[i]) parts.push(`water ${w.water[i]}/7`);
      if (w.magma[i]) parts.push(`<span class="bad">magma ${w.magma[i]}/7</span>`);
      lines.push(parts.join(', '));
    }
    if (z === 0) lines.push(`${BIOMES[w.biome[c.y * w.width + c.x] as BiomeType].name} biome`);
    const job = e.jobs.designationAt(c.x, c.y, z, e);
    if (job) lines.push(`Designated: ${JOB_LABELS[job.type]}${job.worker ? ` (${esc(job.worker.name)})` : ''}`);
    for (const ent of e.entities.at(c.x, c.y, z)) {
      lines.push(`${ent.type === EntityType.DWARF ? '@' : ent.type === EntityType.MONSTER ? 'M' : 'a'} ${esc(ent.name)}`);
    }
    const sel = this.ctl.selected;
    if (sel?.skills) {
      lines.push(`<span class="muted">${esc(sel.name)}: ${SKILL_TYPES.map((k) => `${k} ${sel.skills!.level(k)}`).join(' · ')} · mood ${Math.round(sel.mental!.happiness)}</span>`);
    }
    el.innerHTML = lines.map((l) => `<div>${l}</div>`).join('');
  }

  private renderLog(e: GameEngine): void {
    const last = e.logEntries.length ? e.logEntries[e.logEntries.length - 1].tick * 1000 + e.logEntries.length : 0;
    if (last === this.lastLog) return;
    this.lastLog = last;
    const important = e.logEntries.filter((l) => l.type !== 'WEATHER_CHANGED').slice(-40).reverse();
    $('log').innerHTML = important
      .map((l) => `<li class="${l.type === 'DWARF_DIED' || l.type === 'INVASION_STARTED' ? 'bad' : ''}"><span class="muted">d${Math.floor(l.tick / 600) + 1}</span> ${esc(l.text)}</li>`)
      .join('');
  }
}
