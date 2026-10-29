import { type Rng } from '../core/rng';
import { type WorldCalendar } from './calendar';
import { type RegionClimate } from './climate';

export enum WeatherType {
  CLEAR,
  CLOUDY,
  RAIN,
  STORM,
  SNOW,
}

export const WEATHER_NAMES = ['Clear', 'Cloudy', 'Rain', 'Storm', 'Snow'];

/** Simple Markov weather: re-rolled every few hours, shaped by the region's climate. */
export class WeatherSystem {
  current = WeatherType.CLEAR;
  private nextChange = 0;

  /** Returns the new weather if it changed this tick. */
  update(tick: number, climate: RegionClimate, calendar: WorldCalendar, rng: Rng): WeatherType | null {
    if (tick < this.nextChange) {
      // keep precipitation type consistent with temperature
      if (this.current === WeatherType.RAIN && climate.isFreezing) this.current = WeatherType.SNOW;
      if (this.current === WeatherType.SNOW && !climate.isFreezing) this.current = WeatherType.RAIN;
      return null;
    }
    this.nextChange = tick + 50 + rng.int(150);
    const wet = climate.rainfallAmount * (calendar.season === 3 ? 1.1 : 1);
    const r = rng.next();
    let next: WeatherType;
    if (r < 0.45 * (1 - wet * 0.5)) next = WeatherType.CLEAR;
    else if (r < 0.75) next = WeatherType.CLOUDY;
    else if (r < 0.75 + 0.25 * wet) next = climate.isFreezing ? WeatherType.SNOW : WeatherType.RAIN;
    else next = WeatherType.CLOUDY;
    if (next === WeatherType.RAIN && rng.chance(0.15)) next = WeatherType.STORM;
    if (next === this.current) return null;
    this.current = next;
    return next;
  }

  get precipitating(): boolean {
    return this.current === WeatherType.RAIN || this.current === WeatherType.STORM || this.current === WeatherType.SNOW;
  }
}
