package entities;

import core.time.TimeTickListener;
import game.navigation.Position;

import java.util.UUID;
import java.util.Vector;

public class GameEntity extends Entity implements TimeTickListener {
    private final String name;
    private double velocityX, velocityY;

    public GameEntity(EntityType type) {
        super(UUID.randomUUID(), type);
        this.name = type.name();
    }

//        public GameEntity(String name, double x, double y) {
//            this.name = name;
//            this.x = x;
//            this.y = y;
//        }

    public void setVelocity(double velocityX, double velocityY) {
        this.velocityX = velocityX;
        this.velocityY = velocityY;
    }

    @Override
    public void onTimeTick(long deltaTime) {
        super.onTimeTick(deltaTime);
        // Convert deltaTime from milliseconds to seconds for physics calculations
        double deltaSeconds = deltaTime / 1000.0;

        // Update position based on velocity and elapsed time
//            x += velocityX * deltaSeconds;
//            y += velocityY * deltaSeconds;
        Position pos = getPosition();
        pos.setX(pos.getX() + velocityX * deltaSeconds);
        pos.setY(pos.getY() + velocityY * deltaSeconds);


        System.out.println(name + " position updated to: (" + this.getPosition().getX() + ", " + this.getPosition().getY() + ")");
    }


    public double getVelocityX() {
        return velocityX;
    }

    public void setVelocityX(double velocityX) {
        this.velocityX = velocityX;
    }

    public double getVelocityY() {
        return velocityY;
    }

    public void setVelocityY(double velocityY) {
        this.velocityY = velocityY;
    }
}
