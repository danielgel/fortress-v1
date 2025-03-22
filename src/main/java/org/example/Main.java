package org.example;

import core.time.TimeTickManager;
import entities.GameEntity;

//TIP To <b>Run</b> code, press <shortcut actionId="Run"/> or
// click the <icon src="AllIcons.Actions.Execute"/> icon in the gutter.
public class Main {
    public static void main(String[] args) {
        //TIP Press <shortcut actionId="ShowIntentionActions"/> with your caret at the highlighted text
        // to see how IntelliJ IDEA suggests fixing it.
        TimeTickManager tickManager = new TimeTickManager(100);

        // Create and register some game entities
        GameEntity player = new GameEntity("Player", 0, 0);
        player.setVelocity(1.0, 0.5);

        GameEntity enemy = new GameEntity("Enemy", 10, 10);
        enemy.setVelocity(-0.5, 0.0);

        tickManager.registerListener(player);
        tickManager.registerListener(enemy);

        // Start the tick manager
        tickManager.start();

        // Let it run for a while (5 seconds)
        try {
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        // Clean up
        tickManager.shutdown();
    }
}