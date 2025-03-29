package org.example.demo.loop;

import core.time.TimeTickListener;
import core.time.TimeTickManager;
import entities.Entity;
import entities.EntityManager;
import entities.EntityType;

public class DemoGameManager implements TimeTickListener {

    private EntityManager entityManager;

    public DemoGameManager() {

        EntityManager entityManager = new EntityManager();
        Entity entity = entityManager.createEntity(EntityType.DWARF);

        TimeTickManager timeTickManager = new TimeTickManager(1000);
        timeTickManager.registerListener(entity);



    }

    @Override
    public void onTimeTick(long deltaTime) {

    }
}
