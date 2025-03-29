package org.example;


import core.engine.display.TerminalRenderer;
import entities.EntityType;

import java.io.IOException;

/**
 * Simple test for the renderer
 */
class RendererTest {
    public static void main(String[] args) throws IOException {
        // Create a renderer with 80x25 characters
        TerminalRenderer renderer = new TerminalRenderer(80, 25);

        // Draw a simple dungeon layout
        for (int y = 0; y < 25; y++) {
            for (int x = 0; x < 80; x++) {
                if (x == 0 || y == 0 || x == 79 || y == 24) {
                    renderer.setTile(x, y, EntityType.WALL);
                } else {
                    renderer.setTile(x, y, EntityType.FLOOR);
                }
            }
        }

        // Add some features
        renderer.setTile(10, 10, EntityType.DWARF);
        renderer.setTile(15, 12, EntityType.MONSTER);
        renderer.setTile(20, 8, EntityType.STAIRS_DOWN);
        renderer.setTile(40, 15, EntityType.WATER);

        // Draw a status box
        renderer.drawBox(2, 2, 20, 5, "Status", TerminalRenderer.WHITE, TerminalRenderer.BG_BLACK);
        renderer.drawString(4, 4, "Health: 100%", TerminalRenderer.GREEN, TerminalRenderer.BG_BLACK);

        // Render to the terminal
        renderer.render();

        // Wait for 5 seconds then shut down
        try {
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        renderer.shutdown();
    }
}