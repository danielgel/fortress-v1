export type EventType =
  | 'CREATURE_SPAWNED'
  | 'DWARF_BORN'
  | 'DWARF_DIED'
  | 'MIGRANTS_ARRIVED'
  | 'BUILDING_CONSTRUCTED'
  | 'INVASION_STARTED'
  | 'RESOURCE_DEPLETED'
  | 'CAVERN_DISCOVERED'
  | 'SEASON_CHANGED'
  | 'WEATHER_CHANGED'
  | 'JOB_COMPLETED';

export interface GameEvent {
  type: EventType;
  message: string;
  tick: number;
}

export type EventListener = (event: GameEvent) => void;

/** Decoupled pub/sub between game systems. */
export class EventManager {
  private listeners = new Map<EventType | '*', EventListener[]>();

  on(type: EventType | '*', listener: EventListener): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  emit(event: GameEvent): void {
    for (const l of this.listeners.get(event.type) ?? []) l(event);
    for (const l of this.listeners.get('*') ?? []) l(event);
  }
}
