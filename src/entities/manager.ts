import type { Pos } from '../world/types';
import { Entity, EntityType, dwarfName } from './entity';
import type { Rng } from '../core/rng';

export class EntityManager {
  readonly all = new Map<number, Entity>();
  nextId = 1;

  create(type: EntityType, pos: Pos, rng: Rng): Entity {
    const id = this.nextId++;
    let e: Entity;
    if (type === EntityType.DWARF) e = Entity.dwarf(id, dwarfName(rng), pos, rng);
    else if (type === EntityType.MONSTER) e = Entity.monster(id, pos);
    else e = Entity.animal(id, pos);
    this.all.set(id, e);
    return e;
  }

  add(e: Entity): void {
    this.all.set(e.id, e);
    this.nextId = Math.max(this.nextId, e.id + 1);
  }

  remove(e: Entity): void {
    e.alive = false;
    this.all.delete(e.id);
  }

  ofType(type: EntityType): Entity[] {
    return [...this.all.values()].filter((e) => e.type === type);
  }

  get dwarves(): Entity[] {
    return this.ofType(EntityType.DWARF);
  }

  at(x: number, y: number, z: number): Entity[] {
    return [...this.all.values()].filter((e) => e.pos.x === x && e.pos.y === y && e.pos.z === z);
  }
}
