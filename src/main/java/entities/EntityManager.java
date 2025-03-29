package entities;


/**************************************
 * ENTITY SYSTEM
 **************************************/

import core.time.TimeTickListener;
import entities.impl.Dwarf;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Manages all entities in the game
 */
public class EntityManager implements TimeTickListener {
    private HashMap<UUID, Entity> allEntities;
    private HashMap<EntityType, List<Entity>> entitiesByType;

    private Map<EntityType, Entity> entityTypeClassMap = new HashMap<>();

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
        entityTypeClassMap.get(type)
        Entity entity = new Entity(UUID.randomUUID(), type);
        allEntities.put(entity.getId(), entity);
        entitiesByType.get(type).add(entity);
        return entity;
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
    }
}