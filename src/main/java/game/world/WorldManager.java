package game.world;

import core.time.TimeTickListener;
import game.world.generator.WorldGenerationParameters;
import game.world.generator.WorldGenerator;
import game.world.weather.WeatherSystem;

/**
 * Manages the world, its layers and regions
 */
public class WorldManager implements TimeTickListener {
    private World world;
    private WorldGenerator worldGenerator;
    private WeatherSystem weatherSystem;

    public WorldManager() {
        worldGenerator = new WorldGenerator();
        weatherSystem = new WeatherSystem();
    }

    @Override
    public void onTimeTick(long deltaTime) {
        if (world != null) {
            updateActiveRegions(deltaTime);
            weatherSystem.update(deltaTime);
        }
    }

    public void generateNewWorld(WorldGenerationParameters params) {
        world = worldGenerator.generateWorld(params);
        // Initialize the world with proper data
        // This might include setting up regions, generating terrain, etc.
    }

    private void updateActiveRegions(long deltaTime) {
        // Only update regions that are currently active/visible
    }

    public World getWorld() {
        return world;
    }
}