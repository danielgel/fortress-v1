package game.world.generator;

import core.engine.tiles.TileMaterial;
import game.world.Tile;
import game.world.World;

import java.util.Random;

public class WorldGenerator {
    public World generateWorld(WorldGenerationParameters params) {
        // Create a new world with the specified dimensions
        World world = new World(params.getWidth(), params.getHeight(), params.getDepth());

        // Use the seed for random generation
        Random random = new Random(params.getSeed());

        // Generate terrain (simple example)
        generateTerrain(world, random);

        // Place initial entities
        placeInitialEntities(world, random);

        return world;
    }

    private void generateTerrain(World world, Random random) {
        // Simple terrain generation - for a real game you'd use noise algorithms
        for (int z = 0; z < world.getDepth(); z++) {
            for (int y = 0; y < world.getHeight(); y++) {
                for (int x = 0; x < world.getWidth(); x++) {
                    // Create a tile
                    Tile tile = new Tile();

                    // Determine tile type based on depth
                    if (z == 0) {
                        // Surface layer - mix of soil and stone
                        if (random.nextFloat() < 0.7f) {
                            tile.setMaterial(TileMaterial.SOIL);
                        } else {
                            tile.setMaterial(TileMaterial.STONE);
                        }

                        // Add some water pools
                        if (random.nextFloat() < 0.05f) {
                            tile.setMaterial(TileMaterial.WATER);
                        }

                        // Surface is always excavated (visible)
                        tile.setExcavated(true);
                    } else {
                        // Underground layers - mostly stone
                        tile.setMaterial(TileMaterial.STONE);

                        // Deeper layers have chance of magma
                        if (z > world.getDepth() * 0.7f && random.nextFloat() < 0.03f) {
                            tile.setMaterial(TileMaterial.MAGMA);
                        }

                        // Underground is not excavated by default
                        tile.setExcavated(false);
                    }

                    // Set the tile in the world
                    world.setTileAt(x, y, z, tile);
                }
            }
        }
    }

    private void placeInitialEntities(World world, Random random) {
        // Place entities in the world (example implementation)
        // In a real game, you'd have much more sophisticated entity placement
    }
}
