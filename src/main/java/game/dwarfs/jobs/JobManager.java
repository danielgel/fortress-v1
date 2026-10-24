package game.dwarfs.jobs;

/**************************************
 * JOB SYSTEM
 **************************************/

import core.time.TimeTickListener;
import entities.Entity;
import entities.EntityManager;
import entities.EntityType;
import game.navigation.Position;

import java.util.*;

/**
 * Manages job assignments for dwarves
 */
public class JobManager implements TimeTickListener {
    private static final Map<JobType, List<EntityType>> PERFORMERS_BY_JOB_TYPE = new EnumMap<>(JobType.class);

    static {
        for (JobType jobType : JobType.values()) {
            PERFORMERS_BY_JOB_TYPE.put(jobType, List.of(EntityType.DWARF));
        }
    }

    // performer id -> the job they are currently working on
    private final Map<UUID, Job> assignedJobs = new HashMap<>();
    private final List<Job> jobsQueue = new ArrayList<>();
    private final EntityManager entityManager;

    public JobManager(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    // Jobs are created from the render thread while ticks run on the scheduler thread, hence the synchronization.
    @Override
    public synchronized void onTimeTick(long deltaTime) {
        releaseFinishedJobs();
        assignAvailableJobs();
        updateOngoingJobs(deltaTime);
    }

    public synchronized void createJob(JobType type, Position position, int priority) {
        jobsQueue.add(new Job(type, position, priority));
    }

    public synchronized int getQueuedJobCount() {
        return jobsQueue.size();
    }

    public synchronized Optional<Job> getAssignedJob(UUID performerId) {
        return Optional.ofNullable(assignedJobs.get(performerId));
    }

    private void releaseFinishedJobs() {
        assignedJobs.values().removeIf(Job::isFinished);
    }

    private void updateOngoingJobs(long deltaTime) {
        assignedJobs.values().forEach(job -> job.update(deltaTime));
    }

    /**
     * Assigns queued jobs to idle performers, highest priority first (first come first served among equals).
     * A job stays queued while no suitable idle performer exists, without blocking other jobs.
     */
    private void assignAvailableJobs() {
        jobsQueue.sort(Comparator.comparingInt(Job::getPriority).reversed());

        Iterator<Job> queued = jobsQueue.iterator();
        while (queued.hasNext()) {
            Job job = queued.next();
            Optional<Entity> performer = findIdlePerformer(job.getType());
            if (performer.isEmpty()) {
                continue;
            }

            job.setAssignerPerformer(performer.get());
            assignedJobs.put(performer.get().getId(), job);
            job.start();
            queued.remove();
        }
    }

    private Optional<Entity> findIdlePerformer(JobType jobType) {
        for (EntityType performerType : PERFORMERS_BY_JOB_TYPE.getOrDefault(jobType, List.of())) {
            for (AbstractMap.SimpleEntry<UUID, Entity> candidate : entityManager.getEntitiesByType(performerType)) {
                if (!assignedJobs.containsKey(candidate.getKey())) {
                    return Optional.of(candidate.getValue());
                }
            }
        }
        return Optional.empty();
    }
}
