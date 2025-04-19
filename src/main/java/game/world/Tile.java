package game.world;

import core.engine.tiles.TileMaterial;
import game.world.fluids.FluidLevel;

/**
 * A single tile in the world
 */
public class Tile {
    private TileMaterial material;
    private boolean excavated;
    private FluidLevel waterLevel;
    private FluidLevel magmaLevel;
    private int temperature;

    // Tile properties
    private boolean walkable;
    private boolean visible;
    private boolean supportsConstruction;

    public Tile() {
        // Default values
        this.material = TileMaterial.STONE;
        this.excavated = false;
        this.waterLevel = new FluidLevel();
        this.magmaLevel = new FluidLevel();
        this.temperature = 15; // Default room temperature

        // Default properties
        updateProperties();
    }

    // Update derived properties based on material, excavation status, etc.
    private void updateProperties() {
        // Determine if the tile is walkable
        if (material == TileMaterial.WATER || material == TileMaterial.MAGMA) {
            walkable = false;
        } else {
            walkable = excavated; // Can only walk on excavated tiles
        }

        // Determine if the tile is visible
        visible = excavated;

        // Determine if the tile supports construction
        supportsConstruction = excavated && material != TileMaterial.WATER &&
                material != TileMaterial.MAGMA;
    }

    // Getters and setters
    public TileMaterial getMaterial() {
        return material;
    }

    public void setMaterial(TileMaterial material) {
        this.material = material;
        updateProperties();
    }

    public boolean isExcavated() {
        return excavated;
    }

    public void setExcavated(boolean excavated) {
        this.excavated = excavated;
        updateProperties();
    }

    public boolean isWalkable() {
        return walkable;
    }

    public boolean isVisible() {
        return visible;
    }

    public boolean supportsConstruction() {
        return supportsConstruction;
    }
}