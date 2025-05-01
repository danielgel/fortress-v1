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
    //    private PriorityQueue<Job> availableJobs;
    private Map<UUID, Job> assignedJobs;
    private List<Job> jobsQueue;
    private EntityManager entityManager;
//    private List<WorkshopJob> workshopJobs;

    public JobManager(EntityManager entityManager) {
        assignedJobs = new HashMap<>();
        jobsQueue = new ArrayList<>();
        this.entityManager = entityManager;
    }

    @Override
    public void onTimeTick(long deltaTime) {
        assignAvailableJobs();
        updateOngoingJobs(deltaTime);
    }

    public void createJob(JobType type, Position position, int priority) {
        Job job = new Job(type, position, priority);
        jobsQueue.add(job);
    }

    private void updateOngoingJobs(long deltaTime) {
        assignedJobs.values().forEach((job -> {
            job.update(deltaTime);
        }));
    }

    private void assignAvailableJobs() {
        // Find idle dwarves and assign them appropriate jobs
        if (!jobsQueue.isEmpty()) {
            Job job = jobsQueue.removeFirst();
            // FIXME: This is not the correct way of doing job assignment. This needs to be fixed for the following use cases:
            //  - Different types of performers can collide in logic.
            //  - There may not be enough performers of specific type for a job
            //  - The assignment mechanism is not so good. Must be refactored.
            List<EntityType> performers = getPerformersByJobType(job.getType());
            Optional<EntityType> performerType = performers.stream().filter((entityType -> {
                List<AbstractMap.SimpleEntry<UUID, Entity>> entities = entityManager.getEntitiesByType(entityType);
                return !entities.isEmpty();
            })).findFirst();

            performerType.ifPresent((type) -> {
                List<AbstractMap.SimpleEntry<UUID, Entity>> entities = entityManager.getEntitiesByType(type);
                Optional<AbstractMap.SimpleEntry<UUID, Entity>> entity = entities.stream().findFirst();
                Entity performer = entity.get().getValue();
                job.setAssignerPerformer(performer);
                assignedJobs.put(performer.getId(), job);
            });
        }

    }

    private List<EntityType> getPerformersByJobType(JobType jobType) {
        switch (jobType) {
            case TELEPORT, WORK_ON, DIG, BUILD, GOTO -> {
                return List.of(EntityType.DWARF);
            }
        }
        return null;
    }
}