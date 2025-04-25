package game;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import core.engine.display.LibGDXRenderer;
import game.navigation.Position;
import game.world.World;

public class GameController extends ApplicationAdapter {
    // Core game systems
    private GameEngine gameEngine;

    // Rendering
    private LibGDXRenderer renderer;

    // Game state
    private boolean gameInitialized = false;

    // Time tracking for updates
    private float accumulatedTime = 0;
    private final float UPDATE_STEP = 1 / 60f; // 60 updates per second

    private int cursorLocationX;
    private int cursorLocationY;

    private ControllStates controlMode = ControllStates.CAMERA;

    @Override
    public void create() {
        // Initialize game systems
        initializeGameSystems();

        // Create the renderer
        renderer = new LibGDXRenderer(80, 24);
        renderer.initializeRenderingComponents(); // Initialize LibGDX rendering components


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
        gameEngine.dispose();
    }

    private void initializeGameSystems() {
        // Create all core systems
        gameEngine = new GameEngine();
        gameEngine.initialize();

    }

    private void update(float deltaTime) {
        if (!gameInitialized || gameEngine.isPaused()) {
            return;
        }

        // Process input is handled by LibGDX's input processor
        handleInput();

        // Update game systems
        gameEngine.update(deltaTime);
        // Note: Most updates are triggered by the TimeTickManager
        // This just ensures smooth rendering between ticks
    }

    private void handleInput() {
        // Check for game control keys
        if (Gdx.input.isKeyJustPressed(Input.Keys.ESCAPE)) {
            Gdx.app.exit();
        }

        // Arrow key movement (for camera or player)
        if (Gdx.input.isKeyJustPressed(Input.Keys.UP)) {
            if (controlMode == ControllStates.CAMERA) {
                boolean viewPortMoved = renderer.moveViewportVertically(-1, gameEngine.getWorldManager().getWorld());
                if (viewPortMoved) gameEngine.moveCursorVertical(-1);
            } else {
                gameEngine.moveCursorVertical(-1);
                renderer.moveViewportAccordingToNewCursorPosition(gameEngine.getCursorPosition(), gameEngine.getWorldManager().getWorld());
            }

        }
        if (Gdx.input.isKeyJustPressed(Input.Keys.DOWN)) {
            if (controlMode == ControllStates.CAMERA) {
                boolean viewPortMoved = renderer.moveViewportVertically(1, gameEngine.getWorldManager().getWorld());
                if (viewPortMoved) gameEngine.moveCursorVertical(1);
            } else {
                gameEngine.moveCursorVertical(1);
                renderer.moveViewportAccordingToNewCursorPosition(gameEngine.getCursorPosition(), gameEngine.getWorldManager().getWorld());
            }
        }
        if (Gdx.input.isKeyPressed(Input.Keys.LEFT)) {
            if (controlMode == ControllStates.CAMERA) {
                boolean viewPortMoved = renderer.moveViewportHorizontally(-1, gameEngine.getWorldManager().getWorld());
                if (viewPortMoved) gameEngine.moveCursorHorizontal(-1);
            } else {
                gameEngine.moveCursorHorizontal(-1);
                renderer.moveViewportAccordingToNewCursorPosition(gameEngine.getCursorPosition(), gameEngine.getWorldManager().getWorld());
            }
        }
        if (Gdx.input.isKeyPressed(Input.Keys.RIGHT)) {
            if (controlMode == ControllStates.CAMERA) {
                boolean viewPortMoved =  renderer.moveViewportHorizontally(1, gameEngine.getWorldManager().getWorld());
                if (viewPortMoved) gameEngine.moveCursorHorizontal(1);
            } else {
                gameEngine.moveCursorHorizontal(1);
                renderer.moveViewportAccordingToNewCursorPosition(gameEngine.getCursorPosition(), gameEngine.getWorldManager().getWorld());
            }
        }

        if (Gdx.input.isKeyJustPressed(Input.Keys.PAGE_DOWN)) {
            gameEngine.changeDepth(1);
            gameEngine.moveCursorDepth(1);
        }

        if (Gdx.input.isKeyJustPressed(Input.Keys.PAGE_UP)) {
            gameEngine.changeDepth(-1);
            gameEngine.moveCursorDepth(-1);
        }

        if (Gdx.input.isKeyJustPressed(Input.Keys.Q)) {
            controlMode = controlMode == ControllStates.CAMERA ? ControllStates.CURSOR : ControllStates.CAMERA;
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
        World world = gameEngine.getWorldManager().getWorld();
        renderer.prepareRender();
        if (world != null) {
            renderer.renderWorld(world);
            renderer.renderEntities(gameEngine.getEntityManager().getVisibleEntities(), world);
        }

        // Render UI elements
        renderUI();

        // Trigger the actual rendering
        // This is handled internally by LibGDX
        renderer.endRender();
    }

    private void renderUI() {
        // Render game UI elements
        renderer.drawBox(2, 2, 20, 7, "Game Info", "WHITE", "BG_BLACK");

        // Display game speed
        String speedText = "Speed: " + gameEngine.getGameSpeed();
        renderer.drawString(4, 4, speedText, "GREEN", "BG_BLACK");

        // Display pause status
        String statusText = gameEngine.isPaused() ? "PAUSED" : "RUNNING";
        renderer.drawString(4, 5, statusText, gameEngine.isPaused() ? "RED" : "GREEN", "BG_BLACK");
        renderer.drawString(4, 6, "CURRENT DEPTH: " + gameEngine.getWorldManager().getWorld().getCurrentZ(), "GREEN", "BG_BLACK");
        renderer.drawString(4, 7, "Control Mode: " + controlMode.name(), "GREEN", "BG_BLACK");

        Position cursorPosition = gameEngine.getCursorPosition();
        renderer.drawCursor((int) cursorPosition.getX(), (int) cursorPosition.getY());
    }

}
