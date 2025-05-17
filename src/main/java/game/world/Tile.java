package game.world;

import core.engine.tiles.TileMaterial;
import game.world.fluids.FluidLevel;

/**
 * A single tile in the world, with properties relevant for pathfinding
 */
public class Tile {
    private TileMaterial material;
    private boolean isExcavated;
    private FluidLevel waterLevel;
    private FluidLevel magmaLevel;
    private int temperature;

    // Pathfinding properties
    private boolean isWalkable;
    private boolean supportsSwimming;
    private boolean supportsFlying;
    private boolean supportsClimbing;
    private boolean isStairsUp;
    private boolean isStairsDown;
    private boolean isDoor;
    private boolean isVisible;
    private float movementCost;

    /**
     * Creates a basic wall tile (not walkable)
     */
    public Tile() {
        this.material = TileMaterial.STONE;
        this.isExcavated = false;
        this.waterLevel = null;
        this.magmaLevel = null;
        this.temperature = 20; // Room temperature in Celsius

        this.isWalkable = false;
        this.supportsSwimming = false;
        this.supportsFlying = false;
        this.supportsClimbing = false;
        this.isStairsUp = false;
        this.isStairsDown = false;
        this.isDoor = false;
        this.isVisible = true;
        this.movementCost = 1.0f;
    }

    /**
     * Creates a tile with the specified material and excavation state
     */
    public Tile(TileMaterial material, boolean isExcavated) {
        this();
        this.material = material;
        this.isExcavated = isExcavated;

        // Set default walkability based on material and excavation
        updateWalkability();
    }

    /**
     * Updates the walkability based on current properties
     */
    private void updateWalkability() {
        if (isExcavated) {
            // Excavated tiles are generally walkable
            isWalkable = true;

            // Different materials have different properties
            if (material == TileMaterial.WATER) {
                isWalkable = false;
                supportsSwimming = true;
                movementCost = 2.0f; // Swimming is slower
            } else if (material == TileMaterial.MAGMA) {
                isWalkable = false;
                supportsSwimming = false; // Can't swim in magma!
                movementCost = 10.0f; // Very difficult
            } else {
                // Normal terrain
                supportsSwimming = false;
                movementCost = 1.0f;
            }
        } else {
            // Unexcavated tiles are not walkable except for flying entities
            isWalkable = false;
            supportsSwimming = false;
            supportsFlying = true;
            movementCost = 1.0f;
        }
    }

    /**
     * Gets the material of this tile
     */
    public TileMaterial getMaterial() {
        return material;
    }

    /**
     * Sets the material of this tile
     */
    public void setMaterial(TileMaterial material) {
        this.material = material;
        updateWalkability();
    }

    /**
     * Checks if this tile has been excavated
     */
    public boolean isExcavated() {
        return isExcavated;
    }

    /**
     * Sets whether this tile has been excavated
     */
    public void setExcavated(boolean excavated) {
        this.isExcavated = excavated;
        updateWalkability();
    }

    /**
     * Checks if this tile is walkable
     */
    public boolean isWalkable() {
        return isWalkable;
    }

    /**
     * Sets whether this tile is walkable
     */
    public void setWalkable(boolean walkable) {
        this.isWalkable = walkable;
    }

    /**
     * Checks if this tile supports swimming
     */
    public boolean supportsSwimming() {
        return supportsSwimming;
    }

    /**
     * Sets whether this tile supports swimming
     */
    public void setSupportsSwimming(boolean supportsSwimming) {
        this.supportsSwimming = supportsSwimming;
    }

    /**
     * Checks if this tile supports flying
     */
    public boolean supportsFlying() {
        return supportsFlying;
    }

    /**
     * Sets whether this tile supports flying
     */
    public void setSupportsFlying(boolean supportsFlying) {
        this.supportsFlying = supportsFlying;
    }

    /**
     * Checks if this tile supports climbing
     */
    public boolean supportsClimbing() {
        return supportsClimbing;
    }

    /**
     * Sets whether this tile supports climbing
     */
    public void setSupportsClimbing(boolean supportsClimbing) {
        this.supportsClimbing = supportsClimbing;
    }

    /**
     * Checks if this tile is stairs going up
     */
    public boolean isStairsUp() {
        return isStairsUp;
    }

    /**
     * Sets whether this tile is stairs going up
     */
    public void setStairsUp(boolean stairsUp) {
        this.isStairsUp = stairsUp;
    }

    /**
     * Checks if this tile is stairs going down
     */
    public boolean isStairsDown() {
        return isStairsDown;
    }

    /**
     * Sets whether this tile is stairs going down
     */
    public void setStairsDown(boolean stairsDown) {
        this.isStairsDown = stairsDown;
    }

    /**
     * Checks if this tile is a door
     */
    public boolean isDoor() {
        return isDoor;
    }

    /**
     * Sets whether this tile is a door
     */
    public void setDoor(boolean door) {
        this.isDoor = door;
    }

    /**
     * Gets the movement cost for this tile
     */
    public float getMovementCost() {
        return movementCost;
    }

    /**
     * Sets the movement cost for this tile
     */
    public void setMovementCost(float cost) {
        this.movementCost = cost;
    }

    /**
     * Gets the water level of this tile
     */
    public FluidLevel getWaterLevel() {
        return waterLevel;
    }

    /**
     * Sets the water level of this tile
     */
    public void setWaterLevel(FluidLevel waterLevel) {
        this.waterLevel = waterLevel;
    }

    /**
     * Gets the magma level of this tile
     */
    public FluidLevel getMagmaLevel() {
        return magmaLevel;
    }

    /**
     * Sets the magma level of this tile
     */
    public void setMagmaLevel(FluidLevel magmaLevel) {
        this.magmaLevel = magmaLevel;
    }

    /**
     * Gets the temperature of this tile
     */
    public int getTemperature() {
        return temperature;
    }

    /**
     * Sets the temperature of this tile
     */
    public void setTemperature(int temperature) {
        this.temperature = temperature;
    }

    /**
     * Checks if this tile is visible
     */
    public boolean isVisible() {
        return isVisible;
    }

    /**
     * Sets whether this tile is visible
     */
    public void setVisible(boolean visible) {
        this.isVisible = visible;
    }

    /**
     * Creates a floor tile
     */
    public static Tile createFloor(TileMaterial material) {
        Tile tile = new Tile(material, true);
        tile.setWalkable(true);
        return tile;
    }

    /**
     * Creates a wall tile
     */
    public static Tile createWall(TileMaterial material) {
        Tile tile = new Tile(material, false);
        tile.setWalkable(false);
        return tile;
    }

    /**
     * Creates a water tile
     */
    public static Tile createWater() {
        Tile tile = new Tile(TileMaterial.WATER, true);
        tile.setWalkable(false);
        tile.setSupportsSwimming(true);
        return tile;
    }

    /**
     * Creates a magma tile
     */
    public static Tile createMagma() {
        Tile tile = new Tile(TileMaterial.MAGMA, true);
        tile.setWalkable(false);
        tile.setSupportsSwimming(false);
        return tile;
    }

    /**
     * Creates a stairs up tile
     */
    public static Tile createStairsUp(TileMaterial material) {
        Tile tile = new Tile(material, true);
        tile.setWalkable(true);
        tile.setStairsUp(true);
        return tile;
    }

    /**
     * Creates a stairs down tile
     */
    public static Tile createStairsDown(TileMaterial material) {
        Tile tile = new Tile(material, true);
        tile.setWalkable(true);
        tile.setStairsDown(true);
        return tile;
    }

    /**
     * Creates a door tile
     */
    public static Tile createDoor(TileMaterial material) {
        Tile tile = new Tile(material, true);
        tile.setWalkable(true);
        tile.setDoor(true);
        return tile;
    }
}