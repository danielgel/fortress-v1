package game.world;

import game.world.calendar.WorldCalendar;

/**
 * Represents the entire game world
 */
public class World {
    private int width, height, depth;
    private Tile[][][] tiles;
    private WorldHistory history;
    private WorldCalendar calendar;
    private int currentZ = 0; // Current Z level (depth) being viewed

    public World(int width, int height, int depth) {
        this.width = width;
        this.height = height;
        this.depth = depth;

        // Initialize tile array
        tiles = new Tile[depth][height][width];

        // Initialize other systems
        history = new WorldHistory();
        calendar = new WorldCalendar();
    }

    public Tile getTileAt(int x, int y, int z) {
        if (isValidCoordinate(x, y, z)) {
            return tiles[z][y][x];
        }
        return null;
    }

    public void setTileAt(int x, int y, int z, Tile tile) {
        if (isValidCoordinate(x, y, z)) {
            tiles[z][y][x] = tile;
        }
    }

    public boolean isValidCoordinate(int x, int y, int z) {
        return x >= 0 && x < width && y >= 0 && y < height && z >= 0 && z < depth;
    }

    public int getCurrentZ() {
        return currentZ;
    }

    public void setCurrentZ(int z) {
        if (z >= 0 && z < depth) {
            currentZ = z;
        }
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }

    public int getDepth() {
        return depth;
    }
}