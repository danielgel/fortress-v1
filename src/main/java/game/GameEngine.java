package game;

/**************************************
 * CORE ENGINE COMPONENTS
 **************************************/

import core.engine.display.RenderManager;
import core.events.EventManager;
import core.system.InputManager;
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
    private RenderManager renderManager;
    private InputManager inputManager;
    private PathfindingSystem pathfindingSystem;
    private JobManager jobManager;

    // Game state variables
    private boolean paused;
    private int gameSpeed; // 1=normal, 2=fast, 3=super fast

    public void initialize() {
        // Initialize all subsystems
    }

    public boolean isPaused() {
        return paused;
    }

    public void start() {
        // Start game loops
        timeManager.start();
    }

    public void pause() {
        paused = true;
    }

    public void resume() {
        paused = false;
    }

    public void setGameSpeed(int speed) {
        gameSpeed = speed;
        timeManager.setTickInterval(calculateTickIntervalForSpeed(speed));
    }

    private long calculateTickIntervalForSpeed(int speed) {
        // Convert speed setting to actual millisecond interval
        switch(speed) {
            case 1: return 100; // 10 ticks per second
            case 2: return 50;  // 20 ticks per second
            case 3: return 25;  // 40 ticks per second
            default: return 100;
        }
    }
}

