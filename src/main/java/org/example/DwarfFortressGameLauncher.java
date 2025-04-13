package org.example;

import com.badlogic.gdx.backends.lwjgl3.Lwjgl3Application;
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3ApplicationConfiguration;
import core.engine.display.LibGDXRenderer;
import core.engine.display.TerminalRenderer;
import entities.EntityType;

public class DwarfFortressGameLauncher {
    public static void main(String[] args) {
        Lwjgl3ApplicationConfiguration config = new Lwjgl3ApplicationConfiguration();
        config.setTitle("Dwarf Fortress Clone - Demo");
        config.setWindowedMode(1280, 720);
        config.setForegroundFPS(60);

        // Create and start the application with our renderer
        LibGDXRenderer renderer = new LibGDXRenderer(80, 25);

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


        new Lwjgl3Application(renderer, config);

    }
}
