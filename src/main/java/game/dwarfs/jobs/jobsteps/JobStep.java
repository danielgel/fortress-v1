package game.dwarfs.jobs.jobsteps;

import entities.Entity;
import game.dwarfs.jobs.Job;
import game.dwarfs.jobs.JobStatus;

public abstract class JobStep {

    public abstract JobStatus update(long deltaTime, Job job);
}
