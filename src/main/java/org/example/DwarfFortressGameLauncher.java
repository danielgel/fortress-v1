package org.example;

import com.badlogic.gdx.backends.lwjgl3.Lwjgl3Application;
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3ApplicationConfiguration;
import game.GameController;

public class DwarfFortressGameLauncher {
    public static void main(String[] args) {
        Lwjgl3ApplicationConfiguration config = new Lwjgl3ApplicationConfiguration();
        config.setTitle("Dwarf Fortress Clone");
        config.setWindowedMode(1280, 720);
        config.setForegroundFPS(60);

        // Launch the game with our controller
        new Lwjgl3Application(new GameController(), config);


    }
}
