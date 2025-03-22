package game.world;

import core.engine.display.Region;
import game.world.calendar.WorldCalendar;

/**
 * Represents the entire game world
 */
public class World {
    private int width, height, depth;
    private Region[][][] regions;
    private WorldHistory history;
    private WorldCalendar calendar;

    // Natural features
//    private RiverSystem riverSystem;
//    private BiomeManager biomeManager;


    public Tile getTileAt(int x, int y, int z) {
        return null; // Placeholder
    }

    public int getCurrentZ() {
        return 0; // Placeholder
    }
}