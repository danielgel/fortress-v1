package entities;

/**
 * Enum for different types of game entities (used for symbol mapping)
 */
public enum EntityType {
    // Terrain
    WALL, FLOOR, STAIRS_UP, STAIRS_DOWN, DOOR, WATER, MAGMA,

    // Entities
    DWARF, ANIMAL, MONSTER, ITEM,

    // Resources
    TREE, MINERAL, GEM,

    // Buildings
    WORKSHOP, FORGE,
    CURSOR

}