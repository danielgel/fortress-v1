import { type WorldCalendar } from './calendar';

export enum ClimateType {
  TROPICAL,
  TEMPERATE,
  ARCTIC,
}

export interface PlantType {
  name: string;
  minTemperature: number;
  maxTemperature: number;
  minRainfall: number;
}

export const SHRUB_PLANT: PlantType = { name: 'berry shrub', minTemperature: 2, maxTemperature: 38, minRainfall: 0.15 };

/** Climate of the embark region; drives seasonal temperature. */
export class RegionClimate {
  currentTemperature: number;

  constructor(
    readonly type: ClimateType,
    readonly baseTemperature: number,
    readonly temperatureVariation: number,
    readonly rainfallAmount: number,
  ) {
    this.currentTemperature = baseTemperature;
  }

  static fromAverages(temp: number, rainfall: number): RegionClimate {
    const type = temp > 22 ? ClimateType.TROPICAL : temp < 3 ? ClimateType.ARCTIC : ClimateType.TEMPERATE;
    const variation = type === ClimateType.TROPICAL ? 4 : type === ClimateType.ARCTIC ? 14 : 11;
    return new RegionClimate(type, temp, variation, rainfall);
  }

  /** Seasonal + daily temperature curve. Coldest at mid-winter, warmest mid-summer. */
  update(calendar: WorldCalendar): void {
    // yearProgress 0 = start of spring; summer peak at 0.375, winter trough at 0.875.
    const s = Math.sin((calendar.yearProgress - 0.125) * Math.PI * 2);
    const daily = Math.cos(((calendar.hour - 15) / 24) * Math.PI * 2) * 3;
    this.currentTemperature = Math.round(this.baseTemperature + s * this.temperatureVariation + daily);
  }

  canSupport(plant: PlantType): boolean {
    return (
      plant.minTemperature <= this.currentTemperature &&
      plant.maxTemperature >= this.currentTemperature &&
      plant.minRainfall <= this.rainfallAmount
    );
  }

  get isFreezing(): boolean {
    return this.currentTemperature < 0;
  }
}
