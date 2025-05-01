package org.example;

import core.engine.display.TerminalRenderer;
import core.system.InputManagerExampleClass;

import java.io.IOException;

class InputManagerExample {
    private boolean running = true;
    private final TerminalRenderer renderer;
    private final InputManagerExampleClass inputManager;
    private int playerX = 10;
    private int playerY = 10;

    public InputManagerExample() throws IOException {
        renderer = new TerminalRenderer(80, 25);
        inputManager = new InputManagerExampleClass();

        // Set up handlers for specific keys
        setupInputHandlers();
    }

    private void setupInputHandlers() {
        // Exit the game when ESC is pressed
        inputManager.registerKeyHandler(InputManagerExampleClass.Keys.ESC, event -> {
            running = false;
        });

        // Move player with arrow keys
        inputManager.registerKeyHandler(InputManagerExampleClass.Keys.UP, event -> {
            if (playerY > 1) playerY--;
        });

        inputManager.registerKeyHandler(InputManagerExampleClass.Keys.DOWN, event -> {
            if (playerY < 23) playerY++;
        });

        inputManager.registerKeyHandler(InputManagerExampleClass.Keys.LEFT, event -> {
            if (playerX > 1) playerX--;
        });

        inputManager.registerKeyHandler(InputManagerExampleClass.Keys.RIGHT, event -> {
            if (playerX < 78) playerX++;
        });
    }

    public void run() throws IOException {
        // Initialize systems
        renderer.clear();
        inputManager.initialize();
        inputManager.start();

        try {
            // Main game loop
            while (running) {
                // Process input
                while (inputManager.hasEvents()) {
                    InputManagerExampleClass.InputEvent event = inputManager.pollEvent();
                    // Additional input processing if needed
                }

                // Update game state
                // (This would include game logic, AI, etc.)

                // Render the current frame
                renderer.clear();

                // Draw the world (walls, floors, etc.)
                for (int y = 0; y < 25; y++) {
                    for (int x = 0; x < 80; x++) {
                        if (x == 0 || y == 0 || x == 79 || y == 24) {
                            renderer.setTile(x, y, '#', TerminalRenderer.WHITE, TerminalRenderer.BG_BLACK);
                        } else {
                            renderer.setTile(x, y, '.', TerminalRenderer.BRIGHT_BLACK, TerminalRenderer.BG_BLACK);
                        }
                    }
                }

                // Draw the player
                renderer.setTile(playerX, playerY, '@', TerminalRenderer.BRIGHT_WHITE, TerminalRenderer.BG_BLACK);

                // Draw UI elements
                renderer.drawBox(60, 1, 19, 6, "Controls", TerminalRenderer.WHITE, TerminalRenderer.BG_BLACK);
                renderer.drawString(62, 3, "Arrows: Move", TerminalRenderer.WHITE, TerminalRenderer.BG_BLACK);
                renderer.drawString(62, 4, "ESC: Exit", TerminalRenderer.WHITE, TerminalRenderer.BG_BLACK);

                // Render the frame
                renderer.render();

                // Cap the frame rate
                Thread.sleep(50);
            }
        } catch (InterruptedException e) {
            System.err.println("Game loop interrupted: " + e.getMessage());
        } finally {
            // Clean up
            inputManager.shutdown();
            renderer.shutdown();
        }
    }

    public static void main(String[] args) throws IOException {
        new InputManagerExample().run();
    }
}
