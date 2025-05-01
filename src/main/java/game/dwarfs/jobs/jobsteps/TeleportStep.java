package game.dwarfs.jobs.jobsteps;

import entities.Entity;
import game.dwarfs.jobs.Job;
import game.dwarfs.jobs.JobStatus;

public class TeleportStep extends JobStep{
    @Override
    public JobStatus update(long deltaTime, Job job) {
        // FIXME: For some reason, the dwarf is not being rendered in the new postition. Need to check why
        job.getAssignerPerformer().setPosition(job.getPosition());
        return JobStatus.COMPLETED;
    }
}
