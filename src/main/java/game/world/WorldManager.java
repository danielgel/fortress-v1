package game.world;

/**************************************
 * WORLD REPRESENTATION
 **************************************/

import core.engine.display.Region;
import core.time.TimeTickListener;
import game.world.generator.WorldGenerationParameters;
import game.world.generator.WorldGenerator;
import game.world.weather.WeatherSystem;

import java.util.ArrayList;

/**
 * Manages the world, its layers and regions
 */
public class WorldManager implements TimeTickListener {
    private World world;
    private WorldGenerator worldGenerator;
    private WeatherSystem weatherSystem;
    private ArrayList<Region> activeRegions;

    @Override
    public void onTimeTick(long deltaTime) {
        updateActiveRegions(deltaTime);
        weatherSystem.update(deltaTime);
    }

    public void generateNewWorld(WorldGenerationParameters params) {
        world = worldGenerator.generateWorld(params);
    }

    private void updateActiveRegions(long deltaTime) {
        // Only update regions that are currently active/visible
    }
}