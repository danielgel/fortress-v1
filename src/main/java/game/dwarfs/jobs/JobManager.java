package game.dwarfs.jobs;

/**************************************
 * JOB SYSTEM
 **************************************/

import core.time.TimeTickListener;
import game.navigation.Position;

import java.util.Map;
import java.util.UUID;

/**
 * Manages job assignments for dwarves
 */
public class JobManager implements TimeTickListener {
//    private PriorityQueue<Job> availableJobs;
    private Map<UUID, Job> assignedJobs;
//    private List<WorkshopJob> workshopJobs;

    @Override
    public void onTimeTick(long deltaTime) {
        assignAvailableJobs();
        updateOngoingJobs(deltaTime);
    }

//    public void createJob(JobType type, Position position, int priority) {
//        Job job = new Job(type, position, priority);
//        availableJobs.add(job);
//    }

    private void updateOngoingJobs(long deltaTime) {}

    private void assignAvailableJobs() {
        // Find idle dwarves and assign them appropriate jobs
    }
}