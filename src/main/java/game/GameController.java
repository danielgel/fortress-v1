package game;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import core.engine.display.LibGDXRenderer;
import core.system.InputManager;
import game.dwarfs.jobs.JobType;
import game.navigation.Position;
import game.ui.UiBuffer;
import game.world.World;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

public class GameController extends ApplicationAdapter {
    // Core game systems
    private GameEngine gameEngine;
    private InputManager inputManager;

    // Rendering
    private LibGDXRenderer renderer;

    // Game state
    private boolean gameInitialized = false;

    // Time tracking for updates
    private float accumulatedTime = 0;
    private final float UPDATE_STEP = 1 / 60f; // 60 updates per second

    private ControllStates controlMode = ControllStates.CAMERA;

    private UiBuffer uiBuffer;

    private List<UUID> tempUiElements;

    @Override
    public void create() {
        // Initialize game systems
        initializeGameSystems();

        // Create the renderer
        renderer = new LibGDXRenderer(80, 24);
        renderer.initializeRenderingComponents(); // Initialize LibGDX rendering components
        uiBuffer = new UiBuffer();


        uiBuffer.addToBuffer(() -> "Speed: " + gameEngine.getGameSpeed(), () -> "GREEN", () -> "BG_BLACK");
        uiBuffer.addToBuffer(() -> gameEngine.isPaused() ? "PAUSED" : "RUNNING", () -> gameEngine.isPaused() ? "RED" : "GREEN", () -> "BG_BLACK");
        uiBuffer.addToBuffer(() -> "CURRENT DEPTH: " + gameEngine.getWorldManager().getWorld().getCurrentZ(), () -> "GREEN", () -> "BG_BLACK");
        uiBuffer.addToBuffer(() -> "Control Mode: " + controlMode.name(), () -> "GREEN", () -> "BG_BLACK");
        uiBuffer.addToBuffer(() -> "Cursor " + gameEngine.getCursorPosition(), () -> "WHITE", () -> "BG_BLACK");


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
        inputManager = new InputManager(gameEngine);
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
        // TODO: Placeholder for the InputManager to take over.
        inputManager.handleInput();

        // Check for game control keys
        if (Gdx.input.isKeyJustPressed(Input.Keys.ESCAPE)) {
            Gdx.app.exit();
        }

        // Arrow key movement (for camera or player)
        if (Gdx.input.isKeyPressed(Input.Keys.UP)) {
            if (controlMode == ControllStates.CAMERA) {
                boolean viewPortMoved = renderer.moveViewportVertically(-1, gameEngine.getWorldManager().getWorld());
                if (viewPortMoved) gameEngine.moveCursorVertical(-1);
            } else {
                gameEngine.moveCursorVertical(-1);
                renderer.moveViewportAccordingToNewCursorPosition(gameEngine.getCursorPosition(), gameEngine.getWorldManager().getWorld());
            }

        }
        if (Gdx.input.isKeyPressed(Input.Keys.DOWN)) {
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
                boolean viewPortMoved = renderer.moveViewportHorizontally(1, gameEngine.getWorldManager().getWorld());
                if (viewPortMoved) gameEngine.moveCursorHorizontal(1);
            } else {
                gameEngine.moveCursorHorizontal(1);
                renderer.moveViewportAccordingToNewCursorPosition(gameEngine.getCursorPosition(), gameEngine.getWorldManager().getWorld());
            }
        }


        if (Gdx.input.isKeyJustPressed(Input.Keys.ENTER)) {
            gameEngine.createTaskAtCursor(JobType.TELEPORT);
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


        int numberOfItems = uiBuffer.getBuffer().size();
        int x = 4;
        AtomicInteger y = new AtomicInteger(4);

        // Render game UI elements
        renderer.drawBox(2, 2, 20, 4 + numberOfItems, "Game Info", "WHITE", "BG_BLACK");

        uiBuffer.getBuffer().forEach(uiSupplier -> {
            renderer.drawString(x, y.getAndIncrement(), uiSupplier.getText().get(), uiSupplier.getForeground().get(), uiSupplier.getBackground().get());
        });

        Position cursorPosition = gameEngine.getCursorPosition();
        renderer.drawCursor((int) cursorPosition.getX(), (int) cursorPosition.getY());
    }

}
