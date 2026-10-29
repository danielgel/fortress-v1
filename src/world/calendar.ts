export enum Season {
  SPRING,
  SUMMER,
  AUTUMN,
  WINTER,
}

export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];

export const TICKS_PER_HOUR = 25;
export const HOURS_PER_DAY = 24;
export const TICKS_PER_DAY = TICKS_PER_HOUR * HOURS_PER_DAY; // 600
export const DAYS_PER_SEASON = 12;

/** Derives the in-game date from the global tick counter. */
export class WorldCalendar {
  constructor(public tick = 0) {}

  get day(): number {
    return Math.floor(this.tick / TICKS_PER_DAY);
  }
  get hour(): number {
    return Math.floor(this.tick / TICKS_PER_HOUR) % HOURS_PER_DAY;
  }
  get dayOfSeason(): number {
    return this.day % DAYS_PER_SEASON;
  }
  get season(): Season {
    return Math.floor(this.day / DAYS_PER_SEASON) % 4;
  }
  get year(): number {
    return 1 + Math.floor(this.day / (DAYS_PER_SEASON * 4));
  }
  /** 0..1 progress through the year, starting at the beginning of spring. */
  get yearProgress(): number {
    return (this.day % (DAYS_PER_SEASON * 4)) / (DAYS_PER_SEASON * 4);
  }
  get isNight(): boolean {
    return this.hour < 6 || this.hour >= 20;
  }
  /** 0 (full day) .. 1 (deep night), smooth. */
  get darkness(): number {
    const h = this.tick / TICKS_PER_HOUR;
    const t = (h % 24) / 24;
    return Math.max(0, Math.min(1, 0.5 + 0.9 * Math.cos((t - 0.0) * Math.PI * 2)));
  }
  describe(): string {
    return `${SEASON_NAMES[this.season]} ${this.dayOfSeason + 1}, Year ${this.year}  ${String(this.hour).padStart(2, '0')}:00`;
  }
}
