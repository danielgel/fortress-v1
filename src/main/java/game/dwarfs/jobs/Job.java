package game.dwarfs.jobs;


import entities.Entity;

import javax.swing.text.Position;
import java.util.UUID;

/**
 * Represents a task that a dwarf can perform
 */
public class Job {
    private UUID id;
//    private JobType type;
    private Position position;
    private int priority;
    private UUID assignedDwarfId;
    private JobStatus status;
//    private List<JobStep> steps;

    public boolean isComplete() {
        return status == JobStatus.COMPLETED;
    }

    public void update(long deltaTime, Entity dwarf) {
        // Update current job step progress
    }
}