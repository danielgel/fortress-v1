package entities.components.impl;

import entities.Entity;
import entities.components.Component;
import entities.components.ComponentType;

/**
 * Represents a dwarf's skills
 */
public class SkillComponent extends Component {
//    private Map<SkillType, Skill> skills;

    public SkillComponent(Entity owner) {
        super(owner);
    }

    @Override
    public ComponentType getType() {
        return ComponentType.SKILL;
    }

    @Override
    public void update(long deltaTime) {
        // Handle skill improvement from practice
    }

//    public void improveSkill(SkillType type, int experiencePoints) {
//        skills.get(type).addExperience(experiencePoints);
//    }
}