package entities;

import core.time.TimeTickListener;

import java.util.UUID;
import java.util.Vector;

public class GameEntity extends Entity implements TimeTickListener {
        private final String name;
        private double x, y;
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
            // Convert deltaTime from milliseconds to seconds for physics calculations
            double deltaSeconds = deltaTime / 1000.0;

            // Update position based on velocity and elapsed time
//            x += velocityX * deltaSeconds;
//            y += velocityY * deltaSeconds;

            System.out.println(name + " position updated to: (" + x + ", " + y + ")");
        }

    public void setY(double y) {
        this.y = y;
    }

    public void setX(double x) {
        this.x = x;
    }
//    public Vector<Double> getPosition() {
//            Vector<Double> position = new Vector<Double>(2,0);
//            position.set(0, x);
//            position.set(1, y);
//return position;
//    }

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
