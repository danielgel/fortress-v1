package entities;


import core.time.TimeTickListener;
import entities.components.Component;
import entities.components.ComponentType;
import game.navigation.Position;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Base class for all game objects (dwarves, creatures, items, etc.)
 */
public abstract class Entity implements TimeTickListener {
    private UUID id;
    private EntityType type;
    private Position position;
    private Map<ComponentType, Component> components = new HashMap<>();

    public Entity(EntityType type) {
        id = UUID.randomUUID();
        this.type = type;
    }

    public Entity(UUID uuid, EntityType type) {
        id = uuid;
        this.type = type;
    }

    public UUID getId() {
        return id;
    }

    @Override
    public void onTimeTick(long deltaTime) {
        // Update all components
        for (Component component : components.values()) {
            component.update(deltaTime);
        }
    }

    public void addComponent(Component component) {
        components.put(component.getType(), component);
    }

    public <T extends Component> T getComponent(ComponentType type) {
        return (T) components.get(type);
    }

    public Position getPosition() {
        return position;
    }

    public String getType() {
        return type.name();
    }

    public Entity setPosition(Position position) {
        this.position = Position.from(position);
        return this;
    }
}
