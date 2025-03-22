package game.world.weather.region;

import game.world.calendar.WorldCalendar;
import game.world.weather.seasons.Seasons;

public class RegionClimate {
    private ClimateType type; // TROPICAL, TEMPERATE, ARCTIC, etc.
    private int baseTemperature; // Base temperature in Celsius
    private float temperatureVariation; // How much it varies throughout the year
    private float rainfallAmount; // Average rainfall
    private float rainfallFrequency; // How often it rains
    private float snowfallAmount; // Average snowfall in winter
//    private BiomeModifier biomeModifier; // How climate affects the local biome

    // Current conditions
    private int currentTemperature;
//    private PrecipitationType currentPrecipitation;
    private float precipitationIntensity;

    // Update climate based on world calendar
    public void update(WorldCalendar calendar, long deltaTime) {
        updateSeasonalTemperature(calendar.getSeason(), calendar.getDayOfSeason());
        updatePrecipitation(calendar, deltaTime);
    }

    // Determine if conditions are suitable for plant growth
    public boolean canSupport(PlantType plant) {
        return plant.getMinTemperature() <= currentTemperature &&
                plant.getMaxTemperature() >= currentTemperature &&
                plant.getMinRainfall() <= rainfallAmount;
    }

    public void updatePrecipitation(WorldCalendar calendar, long deltaTime) {

    }

    public void  updateSeasonalTemperature(Seasons season, int dayOfSeason) {}


    // Check if water would freeze at current temperature
    public boolean isFreezingTemperature() {
        return currentTemperature < 0;
    }
}
