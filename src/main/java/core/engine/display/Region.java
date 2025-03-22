package core.engine.display;

import game.world.Tile;
import entities.Entity;

import java.util.List;

/**
 * A specific section of the world (similar to DF's embark area)
 */
public class Region {
    private int x, y, z;
    private Tile[][][] tiles;
    private List<Entity> entities;
//    private RegionClimate climate;

    public void update(long deltaTime) {
        // Update active processes in this region
        // - Fluids flowing
        // - Plant growth
        // - Temperature changes
    }
}