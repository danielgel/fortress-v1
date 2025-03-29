package org.example;

import core.time.TimeTickManager;
import entities.EntityManager;
import entities.EntityType;
import entities.GameEntity;
import game.navigation.Position;

//TIP To <b>Run</b> code, press <shortcut actionId="Run"/> or
// click the <icon src="AllIcons.Actions.Execute"/> icon in the gutter.
public class TimeTickExample {
    public static void main(String[] args) {
        //TIP Press <shortcut actionId="ShowIntentionActions"/> with your caret at the highlighted text
        // to see how IntelliJ IDEA suggests fixing it.
        TimeTickManager tickManager = new TimeTickManager(100);

        EntityManager entityManager = new EntityManager();

        // Create and register some game entities
        GameEntity player = (GameEntity) entityManager.createEntity(EntityType.DWARF).setPosition(new Position(0, 0));
        GameEntity enemy = (GameEntity) entityManager.createEntity(EntityType.MONSTER).setPosition(new Position(10, 10));
//        GameEntity player = new GameEntity(EntityType.DWARF);
//        player.setPosition(new Position(0,0));
        player.setVelocity(1.0, 0.5);

//        GameEntity enemy = new GameEntity(EntityType.MONSTER);
//        enemy.setPosition(new Position(10,10));
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