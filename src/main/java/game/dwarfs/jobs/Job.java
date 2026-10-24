package game.dwarfs.jobs;


import entities.Entity;
import entities.EntityType;
import game.dwarfs.jobs.jobsteps.JobStep;
import game.dwarfs.jobs.jobsteps.TeleportStep;
import game.navigation.Position;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Represents a task that a dwarf can perform
 */
public class Job {
    private List<EntityType> processableEntities = new ArrayList<>();
    final private UUID id = UUID.randomUUID();
    private JobType type;
    private Position position;
    private int priority;
    private Entity assignerPerformer;
    private JobStatus status = JobStatus.NOT_STARTED;
    private List<JobStep> steps;
    private int currentStepIndex = 0;

    public boolean isComplete() {
        return status == JobStatus.COMPLETED;
    }

    /**
     * @return true once the job reached a terminal state (completed or failed) and its performer is free again
     */
    public boolean isFinished() {
        return status == JobStatus.COMPLETED || status == JobStatus.FAILED;
    }

    public void start() {
        status = JobStatus.IN_PROGRESS;
    }

    public boolean isStarted() {
        return status != JobStatus.NOT_STARTED;
    }

    public void update(long deltaTime) {
        if (!isStarted() || isFinished()) {
            return;
        }

        // A job type without any implemented steps can never make progress
        if (steps == null || steps.isEmpty()) {
            status = JobStatus.FAILED;
            return;
        }

        JobStatus stepStatus = steps.get(currentStepIndex).update(deltaTime, this);
        if (stepStatus == JobStatus.COMPLETED) {
            currentStepIndex++;
            if (currentStepIndex >= steps.size()) {
                status = JobStatus.COMPLETED;
            }
        } else if (stepStatus == JobStatus.FAILED) {
            status = JobStatus.FAILED;
        }
    }

    public UUID getId() {
        return id;
    }

    public JobType getType() {
        return type;
    }

    public void setType(JobType type) {
        this.type = type;
    }

    public Position getPosition() {
        return position;
    }

    public void setPosition(Position position) {
        this.position = position;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public Entity getAssignerPerformer() {
        return assignerPerformer;
    }

    public void setAssignerPerformer(Entity assignerPerformer) {
        this.assignerPerformer = assignerPerformer;
    }

    public JobStatus getStatus() {
        return status;
    }

    public void setStatus(JobStatus status) {
        this.status = status;
    }

    public List<JobStep> getSteps() {
        return steps;
    }

    public void setSteps(List<JobStep> steps) {
        this.steps = steps;
    }

    public Job addProcessableEntitiy(EntityType type) {
        processableEntities.add(type);
        return this;
    }

    public Job(JobType type, Position position, int priority) {
        this.priority = priority;
        this.position = Position.from(position); // copy, the caller's position may be mutable (e.g. the cursor)
        this.type = type;
        setJobStepsByType();
    }

    private void setJobStepsByType() {
        switch (type) {
            case TELEPORT -> {
                steps = List.of(new TeleportStep());
            }
            case GOTO, DIG, WORK_ON, BUILD -> {
                // Not implemented yet: no steps, so the job fails as soon as it is started
                steps = List.of();
            }
            default -> throw new IllegalStateException("Unexpected value: " + type);
        }
    }


}