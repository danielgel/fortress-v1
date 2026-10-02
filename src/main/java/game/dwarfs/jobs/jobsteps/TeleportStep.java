package game.dwarfs.jobs.jobsteps;

import entities.Entity;
import game.dwarfs.jobs.Job;
import game.dwarfs.jobs.JobStatus;

public class TeleportStep extends JobStep {
    @Override
    public JobStatus update(long deltaTime, Job job) {
        job.getAssignerPerformer().setPosition(job.getPosition());
        return JobStatus.COMPLETED;
    }
}
