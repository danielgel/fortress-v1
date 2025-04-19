package game;

import core.events.EventManager;
import core.time.TimeTickManager;
import entities.EntityManager;
import game.dwarfs.jobs.JobManager;
import game.navigation.PathfindingSystem;
import game.world.WorldManager;

/**
 * Central game engine that coordinates all subsystems
 */
public class GameEngine {
    private WorldManager worldManager;
    private EntityManager entityManager;
    private TimeTickManager timeManager;
    private EventManager eventManager;
    private PathfindingSystem pathfindingSystem;
    private JobManager jobManager;

    // Game state variables
    private boolean isPaused;
    private int gameSpeed; // 1=normal, 2=fast, 3=super fast

    public void initialize() {
        worldManager = new WorldManager();
        entityManager = new EntityManager();
        eventManager = new EventManager();
        timeManager = new TimeTickManager(100); // Default to 10 ticks/second
        pathfindingSystem = new PathfindingSystem();
        jobManager = new JobManager();

        // Register time tick listeners
        timeManager.registerListener(worldManager);
        timeManager.registerListener(entityManager);
        timeManager.registerListener(jobManager);

        // Set initial game speed
        gameSpeed = 1;
        isPaused = false;
    }

    // Getter methods for all subsystems
    public WorldManager getWorldManager() {
        return worldManager;
    }

    public EntityManager getEntityManager() {
        return entityManager;
    }

    public TimeTickManager getTimeManager() {
        return timeManager;
    }

    public EventManager getEventManager() {
        return eventManager;
    }

    public JobManager getJobManager() {
        return jobManager;
    }

    public int getGameSpeed() {
        return gameSpeed;
    }

    // Existing methods...
    public void start() {
        // Start game loops
        timeManager.start();
    }

    public void pause() {
        isPaused = true;
        timeManager.stop();
    }

    public void resume() {
        isPaused = false;
        timeManager.start();
    }

    public boolean isPaused() {
        return isPaused;
    }

    public void setGameSpeed(int speed) {
        gameSpeed = speed;
        timeManager.setTickInterval(calculateTickIntervalForSpeed(speed));
    }

    private long calculateTickIntervalForSpeed(int speed) {
        switch (speed) {
            case 1:
                return 100; // 10 ticks per second
            case 2:
                return 50;  // 20 ticks per second
            case 3:
                return 25;  // 40 ticks per second
            default:
                return 100;
        }
    }
}

