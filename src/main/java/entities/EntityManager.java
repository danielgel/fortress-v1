package entities;


import core.time.TimeTickListener;
import entities.impl.Dwarf;
import entities.impl.Monster;
import game.world.World;

import java.util.*;

/**
 * Manages all entities in the game
 */
public class EntityManager implements TimeTickListener {
    final private HashMap<UUID, Entity> allEntities = new HashMap<>();
    private World world; // Reference to the world

    public EntityManager() {
        // Initialize entity collections
    }

    public World getWorld() {
        return world;
    }

    public void setWorld(World world) {
        this.world = world;
    }

    @Override
    public void onTimeTick(long deltaTime) {
        updateEntities(deltaTime);
    }

    public List<Entity> getVisibleEntities() {
        // Return entities that should be visible in the current view
        // This might depend on the player's current position/zoom level
        List<Entity> visibleEntities = new ArrayList<>();

        // For now, just return all entities
        visibleEntities.addAll(allEntities.values());

        return visibleEntities;
    }

    private void updateEntities(long deltaTime) {
        // Process entities based on priority
        updatePlayer(deltaTime);
        updateDwarves(deltaTime);
        updateCreatures(deltaTime);
        updateItems(deltaTime);
    }

    private void updatePlayer(long deltaTime) {

    }

    private void updateItems(long deltaTime) {

    }

    private void updateCreatures(long deltaTime) {

    }

    private void updateDwarves(long deltaTime) {

    }

    public Entity createEntity(EntityType type) {
        Entity newEntity = getEntityByType(type);
        allEntities.put(newEntity.getId(), newEntity);
//        entitiesByType.get(type).add(newEntity);
        return newEntity;
    }


    private Entity getEntityByType(EntityType entityType) {
        switch (entityType) {
            case WALL -> {
            }
            case FLOOR -> {
            }
            case STAIRS_UP -> {
            }
            case STAIRS_DOWN -> {
            }
            case DOOR -> {
            }
            case WATER -> {
            }
            case MAGMA -> {
            }
            case DWARF -> {
                return new Dwarf();
            }
            case ANIMAL -> {
            }
            case MONSTER -> {
                return new Monster();
            }
            case ITEM -> {
            }
            case TREE -> {
            }
            case MINERAL -> {
            }
            case GEM -> {
            }
            case WORKSHOP -> {
            }
            case FORGE -> {
            }
        }
        return null;
    }
}