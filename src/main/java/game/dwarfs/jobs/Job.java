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

    public void start() {
        status = JobStatus.IN_PROGRESS;
    }

    public void update(long deltaTime) {
        if (isComplete()) {
            return;
        }

        // Update current job step progress
        JobStep currentStep = steps.get(currentStepIndex);
        JobStatus stepStatus = currentStep.update(deltaTime, this);

        // Step Completed, check if job is also completed...
        if (stepStatus == JobStatus.COMPLETED && ++currentStepIndex < steps.size()) {
            status = JobStatus.COMPLETED;
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
        this.position = position;
        this.type = type;
        setJobStepsByType();
    }

    private void setJobStepsByType() {
        switch (type) {
            case TELEPORT -> {
                steps = List.of(new TeleportStep());
            }
            case GOTO, DIG, WORK_ON, BUILD -> {
            }
            default -> throw new IllegalStateException("Unexpected value: " + type);
        }
    }


}