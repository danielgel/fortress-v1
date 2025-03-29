package entities;


/**************************************
 * ENTITY SYSTEM
 **************************************/

import core.time.TimeTickListener;
import entities.impl.Dwarf;
import entities.impl.Monster;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Manages all entities in the game
 */
public class EntityManager implements TimeTickListener {
    private HashMap<UUID, Entity> allEntities = new HashMap<>();
    private HashMap<EntityType, List<Entity>> entitiesByType = new HashMap<>();

    @Override
    public void onTimeTick(long deltaTime) {
        updateEntities(deltaTime);
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