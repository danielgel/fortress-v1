package entities.components;

import entities.Entity;

/**
 * Base class for all entity components
 */
public abstract class Component {
    protected Entity owner;

    public Component(Entity owner) {
        this.owner = owner;
    }

    public abstract ComponentType getType();

    public abstract void update(long deltaTime);
}