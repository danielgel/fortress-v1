package game.dwarfs.jobs;

import entities.Entity;
import entities.EntityManager;
import entities.EntityType;
import game.navigation.Position;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JobManagerTest {
    private EntityManager entityManager;
    private JobManager jobManager;

    @BeforeEach
    void setUp() {
        entityManager = new EntityManager();
        jobManager = new JobManager(entityManager);
    }

    private Entity dwarfAt(double x, double y) {
        return entityManager.createEntity(EntityType.DWARF).setPosition(new Position(x, y));
    }

    @Test
    void teleportJobMovesPerformerToJobPosition() {
        Entity dwarf = dwarfAt(15, 15);
        jobManager.createJob(JobType.TELEPORT, new Position(3, 4, 0), 1);

        jobManager.onTimeTick(100);

        assertEquals(3, dwarf.getPosition().getX());
        assertEquals(4, dwarf.getPosition().getY());
    }

    @Test
    void jobStaysQueuedWhenThereIsNoPerformer() {
        jobManager.createJob(JobType.TELEPORT, new Position(1, 1), 1);

        jobManager.onTimeTick(100);
        assertEquals(1, jobManager.getQueuedJobCount());

        Entity dwarf = dwarfAt(0, 0);
        jobManager.onTimeTick(100);

        assertEquals(0, jobManager.getQueuedJobCount());
        assertEquals(1, dwarf.getPosition().getX());
    }

    @Test
    void busyPerformerIsNotGivenASecondJobAndFinishedJobsFreeThePerformer() {
        Entity dwarf = dwarfAt(0, 0);
        jobManager.createJob(JobType.TELEPORT, new Position(1, 1), 1);
        jobManager.createJob(JobType.TELEPORT, new Position(2, 2), 1);

        jobManager.onTimeTick(100);
        // First job is done in one tick, the second one is still waiting for the dwarf to be released
        assertEquals(1, dwarf.getPosition().getX());
        assertEquals(1, jobManager.getQueuedJobCount());

        jobManager.onTimeTick(100);
        assertEquals(2, dwarf.getPosition().getX());
        assertEquals(0, jobManager.getQueuedJobCount());
    }

    @Test
    void multipleIdlePerformersTakeJobsInTheSameTick() {
        Entity first = dwarfAt(0, 0);
        Entity second = dwarfAt(0, 0);
        jobManager.createJob(JobType.TELEPORT, new Position(5, 5), 1);
        jobManager.createJob(JobType.TELEPORT, new Position(6, 6), 1);

        jobManager.onTimeTick(100);

        assertEquals(0, jobManager.getQueuedJobCount());
        assertNotEquals(first.getPosition().getX(), second.getPosition().getX());
    }

    @Test
    void higherPriorityJobIsAssignedFirst() {
        Entity dwarf = dwarfAt(0, 0);
        jobManager.createJob(JobType.TELEPORT, new Position(1, 1), 1);
        jobManager.createJob(JobType.TELEPORT, new Position(9, 9), 5);

        jobManager.onTimeTick(100);

        assertEquals(9, dwarf.getPosition().getX());
    }

    @Test
    void unimplementedJobTypeFailsAndReleasesThePerformer() {
        Entity dwarf = dwarfAt(0, 0);
        jobManager.createJob(JobType.DIG, new Position(1, 1), 1);
        jobManager.createJob(JobType.TELEPORT, new Position(7, 7), 1);

        jobManager.onTimeTick(100); // DIG assigned and fails
        assertEquals(0, dwarf.getPosition().getX());

        jobManager.onTimeTick(100); // dwarf released, teleport runs
        assertEquals(7, dwarf.getPosition().getX());
    }

    @Test
    void jobDoesNotFollowTheMutablePositionItWasCreatedWith() {
        Position cursor = new Position(1, 1);
        Job job = new Job(JobType.TELEPORT, cursor, 1);

        cursor.setX(50);

        assertEquals(1, job.getPosition().getX());
    }

    @Test
    void entityManagerReturnsEmptyListForUnknownType() {
        assertTrue(entityManager.getEntitiesByType(EntityType.DWARF).isEmpty());
    }
}
