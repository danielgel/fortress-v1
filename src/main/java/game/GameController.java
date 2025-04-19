package game;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import core.engine.display.LibGDXRenderer;
import core.events.EventManager;
import core.time.TimeTickManager;
import entities.EntityManager;
import game.dwarfs.jobs.JobManager;
import game.world.World;
import game.world.WorldManager;
import game.world.generator.WorldGenerationParameters;

public class GameController extends ApplicationAdapter {
    // Core game systems
    private GameEngine gameEngine;
    private TimeTickManager timeManager;
    private WorldManager worldManager;
    private EntityManager entityManager;
    private EventManager eventManager;
    private JobManager jobManager;

    // Rendering
    private LibGDXRenderer renderer;

    // Game state
    private boolean worldGenerated = false;
    private boolean gameInitialized = false;

    // Time tracking for updates
    private float accumulatedTime = 0;
    private final float UPDATE_STEP = 1 / 60f; // 60 updates per second

    private int worldWidth = 100;
    private int worldHeight = 100;
    private int worldDepth = 10;


    @Override
    public void create() {
        // Initialize game systems
        initializeGameSystems();

        // Set up initial game state
        generateNewWorld();

        // Create the renderer
        renderer = new LibGDXRenderer(80, 25);
        renderer.create(); // Initialize LibGDX rendering components


        // Start the game
        gameEngine.start();
        gameInitialized = true;
    }

    @Override
    public void render() {
        // Game logic updates
        accumulatedTime += Gdx.graphics.getDeltaTime();
        while (accumulatedTime >= UPDATE_STEP) {
            update(UPDATE_STEP);
            accumulatedTime -= UPDATE_STEP;
        }

        // Render the current game state
        renderGameState();
    }

    @Override
    public void resize(int width, int height) {
        renderer.resize(width, height);
    }

    @Override
    public void dispose() {
        // Clean up resources
        renderer.dispose();
        timeManager.shutdown();
    }

    private void initializeGameSystems() {
        // Create all core systems
        gameEngine = new GameEngine();
        gameEngine.initialize();

        // Get references to the subsystems
        timeManager = gameEngine.getTimeManager();
        worldManager = gameEngine.getWorldManager();
        entityManager = gameEngine.getEntityManager();
        eventManager = gameEngine.getEventManager();
        jobManager = gameEngine.getJobManager();
    }

    private void generateNewWorld() {
        if (!worldGenerated) {
            // Generate a new game world
            WorldGenerationParameters params = new WorldGenerationParameters();
            // Configure world generation parameters
            params.setWidth(worldWidth);
            params.setHeight(worldHeight);
            params.setDepth(worldHeight);

            worldManager.generateNewWorld(params);
            worldGenerated = true;
        }
    }

    private void update(float deltaTime) {
        if (!gameInitialized || gameEngine.isPaused()) {
            return;
        }

        // Process input is handled by LibGDX's input processor
        handleInput();

        // Update game systems
        // Note: Most updates are triggered by the TimeTickManager
        // This just ensures smooth rendering between ticks
    }

    private void handleInput() {
        // Check for game control keys
        if (Gdx.input.isKeyJustPressed(Input.Keys.ESCAPE)) {
            Gdx.app.exit();
        }

        // Arrow key movement (for camera or player)
        if (Gdx.input.isKeyPressed(Input.Keys.UP)) {
            // Handle up movement
        }
        if (Gdx.input.isKeyPressed(Input.Keys.DOWN)) {
            // Handle down movement
        }
        if (Gdx.input.isKeyPressed(Input.Keys.LEFT)) {
            // Handle left movement
        }
        if (Gdx.input.isKeyPressed(Input.Keys.RIGHT)) {
            // Handle right movement
        }

        // Game speed controls
        if (Gdx.input.isKeyJustPressed(Input.Keys.NUM_1)) {
            gameEngine.setGameSpeed(1); // Normal speed
        }
        if (Gdx.input.isKeyJustPressed(Input.Keys.NUM_2)) {
            gameEngine.setGameSpeed(2); // Fast
        }
        if (Gdx.input.isKeyJustPressed(Input.Keys.NUM_3)) {
            gameEngine.setGameSpeed(3); // Super fast
        }
        if (Gdx.input.isKeyJustPressed(Input.Keys.SPACE)) {
            if (gameEngine.isPaused()) {
                gameEngine.resume();
            } else {
                gameEngine.pause();
            }
        }
    }

    private void renderGameState() {
        // Clear the screen
        renderer.clear();

        // Render the world
        World world = worldManager.getWorld();
        if (world != null) {
            renderer.prepareRender();
            renderer.renderWorld(world);
            renderer.renderEntities(entityManager.getVisibleEntities(), world);
            renderer.endRender();
        }

        // Render UI elements
        renderUI();

        // Trigger the actual rendering
        // This is handled internally by LibGDX
    }

    private void renderUI() {
        // Render game UI elements
        renderer.drawBox(2, 2, 20, 5, "Game Info", "WHITE", "BG_BLACK");

        // Display game speed
        String speedText = "Speed: " + gameEngine.getGameSpeed();
        renderer.drawString(4, 4, speedText, "GREEN", "BG_BLACK");

        // Display pause status
        String statusText = gameEngine.isPaused() ? "PAUSED" : "RUNNING";
        renderer.drawString(4, 5, statusText, gameEngine.isPaused() ? "RED" : "GREEN", "BG_BLACK");
    }
}
