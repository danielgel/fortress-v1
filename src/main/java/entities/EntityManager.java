package entities;


/**************************************
 * ENTITY SYSTEM
 **************************************/

import core.time.TimeTickListener;

import java.util.HashMap;
import java.util.List;
import java.util.UUID;

/**
 * Manages all entities in the game
 */
public class EntityManager implements TimeTickListener {
    private HashMap<UUID, Entity> allEntities;
    private HashMap<EntityType, List<Entity>> entitiesByType;

    @Override
    public void onTimeTick(long deltaTime) {
        updateEntities(deltaTime);
    }

    private void updateEntities(long deltaTime) {
        // Process entities based on priority
        updateDwarves(deltaTime);
        updateCreatures(deltaTime);
        updateItems(deltaTime);
    }

    private void updateItems(long deltaTime) {

    }

    private void updateCreatures(long deltaTime) {

    }

    private void updateDwarves(long deltaTime) {

    }

    public Entity createEntity(EntityType type) {
        Entity entity = new Entity(UUID.randomUUID(), type);
        allEntities.put(entity.getId(), entity);
        entitiesByType.get(type).add(entity);
        return entity;
    }
}