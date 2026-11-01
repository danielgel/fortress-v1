import { BIOMES, type BiomeType } from '../world/biome';
import { Feature, Flag, Material } from '../world/types';
import { WEATHER_NAMES } from '../world/weather';
import { EntityType, type Entity } from '../entities/entity';
import { JOB_LABELS, JobType, type Job } from '../jobs/job';
import { checkJob } from '../jobs/recipes';
import { SKILL_TYPES } from '../entities/components';
import { SPEED_TPS } from '../core/clock';
import { BUILDINGS, BUILD_MENU, Building, RECIPES, RESOURCE_GROUPS, canAfford, describeCost, type ToolKind } from '../game/content';
import { wanted } from '../game/production';
import type { GameEngine } from '../game/engine';
import type { Controller, Mode } from './controller';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const MATERIAL_NAMES = ['stone', 'soil', 'sand', 'grass', 'snow', 'mud'];
const FEATURE_NAMES = ['', 'tree', 'berry shrub', 'ore vein', 'gem deposit', 'mushrooms'];

const MODE_HINTS: Record<Mode, string> = {
  dig: 'Dig: drag a rectangle over rock to mine it (needs a pick)',
  stairs: 'Stairs: click a surface or floor tile to dig a stairway down (needs a pick)',
  chop: 'Chop: select trees ♣ for wood (needs an axe)',
  gather: 'Gather: select berry shrubs " or cave mushrooms ♠',
  fish: 'Fish: select water next to the shore — fishing spots stay until cancelled (needs a rod)',
  hunt: 'Hunt: click an animal for meat (needs a spear)',
  build: 'Build: pick something above ([ ] to cycle), then click floor tiles',
  remove: 'Remove: select furniture or workshops to take them down (refunds materials)',
  teleport: 'Teleport: click a tile to send a dwarf there',
  cancel: 'Cancel: drag over designations to remove them',
};

const TOOL_LABEL: Record<ToolKind, string> = { pick: 'pick', axe: 'axe', rod: 'rod', spear: 'spear' };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** One meter where a full bar is always good. */
function meter(label: string, value: number, detail: string): string {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const tone = v < 25 ? 'low' : v < 50 ? 'mid' : 'ok';
  return `<span class="bar ${tone}" title="${label}: ${v}% — ${detail}"><i style="width:${v}%"></i></span>`;
}

function needWord(level: number, words: [string, string, string]): string {
  return level > 85 ? words[2] : level > 60 ? words[1] : words[0];
}

/** Only touch the DOM when the markup actually changed (keeps hover and clicks stable). */
function setHtml(el: HTMLElement, html: string): boolean {
  if (el.dataset.html === html) return false;
  el.dataset.html = html;
  el.innerHTML = html;
  return true;
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

    this.renderStock(e);
    this.renderBuildBar(e);
    this.renderDwarves();
    this.renderTile();
    this.renderLog(e);
    if (($('orders') as HTMLDialogElement).open) this.renderOrders();
  }

  private renderStock(e: GameEngine): void {
    const s = e.stock;
    const held: Record<string, number> = {};
    for (const d of e.entities.dwarves) for (const t of d.tools) held[t] = (held[t] ?? 0) + 1;
    const html = RESOURCE_GROUPS.map((g) => {
      const cells = g.items
        .map(({ key, label }) => {
          const v = s[key];
          const bad = (key === 'food' && s.food + s.meals < 8) || (key === 'booze' && s.booze === 0 && e.tick > 0);
          const extra = held[key] ? `<em title="carried by dwarves">+${held[key]}</em>` : '';
          return `<div class="${bad ? 'bad' : v === 0 && !held[key] ? 'zero' : ''}"><span>${label}</span><b>${v}${extra}</b></div>`;
        })
        .join('');
      return `<h3>${g.title}</h3><div class="stock">${cells}</div>`;
    }).join('');
    setHtml($('stock'), html + `<div class="muted small">Jobs queued: ${e.jobs.jobs.size}</div>`);
  }

  private renderBuildBar(e: GameEngine): void {
    const bar = $('buildbar');
    const show = this.ctl.mode === 'build';
    bar.classList.toggle('show', show);
    if (!show) return;
    const html = BUILD_MENU.map((k) => {
      const info = BUILDINGS[k];
      const ok = canAfford(e.stock, info.cost);
      const on = this.ctl.buildKind === k ? ' on' : '';
      return `<button data-build="${k}" class="${on}${ok ? '' : ' short'}" title="${esc(info.desc)} — costs ${describeCost(info.cost)}"><span class="g" style="color:${info.fg}">${esc(info.glyph)}</span>${info.name}<small>${describeCost(info.cost)}</small></button>`;
    }).join('');
    setHtml(bar, html);
  }

  private renderDwarves(): void {
    const e = this.ctl.engine;
    const dwarves = e.entities.dwarves;
    $('dwarf-count').textContent = `(${dwarves.length})`;
    const list = $('dwarves');
    const html = dwarves
      .map((d) => {
        const n = d.needs!;
        const p = d.physical!;
        const m = d.mental!;
        const job = d.job ? JOB_LABELS[d.job.type] : 'idle';
        const sel = this.ctl.selected?.id === d.id ? ' sel' : '';
        const tools = d.tools.length ? `<span class="tools" title="Carrying">${d.tools.map((t) => TOOL_LABEL[t]).join(' ')}</span>` : '';
        return `<li class="dwarf${sel}" data-id="${d.id}"><div class="row"><b>${esc(d.name)}</b>${tools}<span class="muted job">${job}</span></div>
          <div class="bars">${meter('Food', 100 - n.hunger, needWord(n.hunger, ['fed', 'hungry', 'starving']))}${meter('Drink', 100 - n.thirst, needWord(n.thirst, ['fine', 'thirsty', 'parched']))}${meter('Rest', 100 - n.fatigue, needWord(n.fatigue, ['rested', 'tired', 'exhausted']))}${meter('Health', (p.health / p.maxHealth) * 100, p.health < p.maxHealth ? 'wounded' : 'unhurt')}${meter('Mood', m.happiness, m.thought || 'content')}</div></li>`;
      })
      .join('');
    if (!setHtml(list, html)) return;
    list.querySelectorAll<HTMLLIElement>('li').forEach((li) => {
      li.onclick = () => {
        const d = e.entities.all.get(Number(li.dataset.id));
        if (d) this.ctl.focus(d);
      };
    });
  }

  private jobDetail(e: GameEngine, job: Job): string {
    let label = JOB_LABELS[job.type];
    if (job.type === JobType.BUILD) label = `build ${BUILDINGS[job.arg as Building].name.toLowerCase()}`;
    if (job.type === JobType.CRAFT) label = `make ${RECIPES[job.arg].name.toLowerCase()}`;
    let status = job.worker ? ` (${esc(job.worker.name)})` : '';
    if (!job.worker && checkJob(e, job) === 'blocked') {
      const cost = job.type === JobType.BUILD ? BUILDINGS[job.arg as Building].cost : job.type === JobType.CRAFT ? RECIPES[job.arg].input : null;
      status = cost ? ` <span class="bad">waiting for ${describeCost(cost)}</span>` : ' <span class="bad">blocked</span>';
    }
    return `${label}${status}`;
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
    const b = w.building[i] as Building;
    if (b) {
      const info = BUILDINGS[b];
      lines.push(`<b>${info.name}</b>${info.workshop ? ' workshop' : ''} <span class="muted">— ${esc(info.desc)}</span>`);
      if (info.workshop) {
        const recipes = RECIPES.filter((r) => r.workshop === b).map((r) => r.name.toLowerCase());
        lines.push(`<span class="muted">Makes ${recipes.join(', ')}. Press <kbd>O</kbd> for orders.</span>`);
      }
    }
    if (z === 0) lines.push(`${BIOMES[w.biome[c.y * w.width + c.x] as BiomeType].name} biome`);
    const job = e.jobs.designationAt(c.x, c.y, z, e);
    if (job) lines.push(`Designated: ${this.jobDetail(e, job)}`);
    for (const ent of e.entities.at(c.x, c.y, z)) {
      const hunted = e.jobs.huntFor(ent.id) ? ' <span class="bad">(hunted)</span>' : '';
      lines.push(`${ent.type === EntityType.DWARF ? '@' : ent.type === EntityType.MONSTER ? 'M' : ent.name[0]} ${esc(ent.name)}${hunted}`);
    }
    const sel = this.ctl.selected;
    if (sel?.skills) lines.push(this.dwarfDetail(sel));
    setHtml(el, lines.map((l) => `<div>${l}</div>`).join(''));
  }

  private dwarfDetail(d: Entity): string {
    const n = d.needs!;
    const m = d.mental!;
    const feelings = [
      n.hunger > 60 ? needWord(n.hunger, ['', 'hungry', 'starving']) : '',
      n.thirst > 60 ? needWord(n.thirst, ['', 'thirsty', 'parched']) : '',
      n.fatigue > 60 ? needWord(n.fatigue, ['', 'tired', 'exhausted']) : '',
    ].filter(Boolean);
    const mood = m.happiness < 25 ? '<span class="bad">miserable (works slowly)</span>' : m.happiness > 70 ? 'happy (works faster)' : 'content';
    const skills = SKILL_TYPES.filter((k) => d.skills!.level(k) > 0).map((k) => `${k} ${d.skills!.level(k)}`);
    return `<div class="detail"><b>${esc(d.name)}</b> is ${mood}${feelings.length ? `, ${feelings.join(', ')}` : ''}.
      ${m.thought ? `<br><span class="muted">Recently ${esc(m.thought)}.</span>` : ''}
      <br><span class="muted">Carrying: ${d.tools.length ? d.tools.map((t) => TOOL_LABEL[t]).join(', ') : 'nothing'} · Skills: ${skills.length ? skills.join(' · ') : 'none yet'}</span></div>`;
  }

  /** The work-orders dialog: one row per recipe, grouped by workshop. */
  renderOrders(): void {
    const e = this.ctl.engine;
    const groups = new Map<Building, string[]>();
    RECIPES.forEach((r, i) => {
      const o = e.orders[r.id];
      const have = [...e.world.buildingTiles].some((t) => e.world.building[t] === r.workshop);
      const working = e.jobs.ofType(JobType.CRAFT).filter((j) => j.arg === i).length;
      const afford = canAfford(e.stock, r.input);
      const status = !have
        ? '<span class="muted">no workshop</span>'
        : working
          ? `<span class="good">working ×${working}</span>`
          : (o?.queued || (o?.keep && wanted(e, i) > 0)) && !afford
            ? `<span class="bad">needs ${describeCost(r.input)}</span>`
            : '';
      const row = `<tr>
        <td><b>${r.name}</b><br><small class="muted">${describeCost(r.input)} → ${describeCost(r.output)}</small></td>
        <td class="num">${o?.queued ?? 0}</td>
        <td class="ctl"><button data-order="${r.id}" data-n="-1" title="One less">−</button><button data-order="${r.id}" data-n="1" title="One more">+1</button><button data-order="${r.id}" data-n="5" title="Five more">+5</button>
        <button data-keep="${r.id}" class="${o?.keep ? 'on' : ''}" title="Keep making these whenever stock is below ${r.keep}">keep ${r.keep}</button></td>
        <td>${status}</td></tr>`;
      groups.set(r.workshop, [...(groups.get(r.workshop) ?? []), row]);
    });
    const html = [...groups]
      .map(([b, rows]) => `<tbody><tr class="ws"><th colspan="4"><span style="color:${BUILDINGS[b].fg}">${BUILDINGS[b].glyph}</span> ${BUILDINGS[b].name}</th></tr>${rows.join('')}</tbody>`)
      .join('');
    setHtml($('orders-body'), `<table>${html}</table>`);
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
