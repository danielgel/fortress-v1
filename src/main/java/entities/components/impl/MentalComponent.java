package entities.components.impl;

import entities.Entity;
import entities.components.Component;
import entities.components.ComponentType;

/**
 * Represents a dwarf's mental state
 */
public class MentalComponent extends Component {
    private int happiness, stress;
//    private List<Thought> recentThoughts;
//    private List<Relationship> relationships;
//    private Personality personality;

    public MentalComponent(Entity owner) {
        super(owner);
    }

    @Override
    public ComponentType getType() {
        return ComponentType.MENTAL;
    }

    @Override
    public void update(long deltaTime) {
        // Update happiness/stress based on surroundings
        // Process thoughts and mood changes
    }
}