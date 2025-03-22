package entities.components.impl;

/**************************************
 * DWARF-SPECIFIC COMPONENTS
 **************************************/

import entities.Entity;
import entities.components.Component;
import entities.components.ComponentType;

/**
 * Represents a dwarf's physical attributes
 */
public class PhysicalComponent extends Component {
    private int strength, agility, endurance;
    private int health, maxHealth;
//    private List<BodyPart> bodyParts;

    public PhysicalComponent(Entity owner) {
        super(owner);
    }

    @Override
    public ComponentType getType() {
        return ComponentType.PHYSICAL;
    }

    @Override
    public void update(long deltaTime) {
        // Handle health regeneration, injuries, etc.
    }
}
