package game.world;

import core.engine.tiles.TileMaterial;
import game.world.fluids.FluidLevel;

/**
 * A single tile in the world
 */
public class Tile {
    private TileMaterial material;
    private boolean isExcavated;
    private FluidLevel waterLevel;
    private FluidLevel magmaLevel;
    private int temperature;
//    private List<Item> items;

    // Tile properties
    private boolean isWalkable;
    private boolean isVisible;
    private boolean supportsConstruction;

    public TileMaterial getMaterial() {
        return TileMaterial.STONE; // Placeholder
    }

    public boolean isExcavated() {
        return false; // Placeholder
    }
}